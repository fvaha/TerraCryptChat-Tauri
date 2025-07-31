use futures::{SinkExt as FuturesSinkExt, StreamExt as FuturesStreamExt};
use std::sync::Arc;
use std::time::{Duration, Instant};
use tauri::{AppHandle, State};
use tauri::Emitter;
use tokio::sync::{mpsc, Mutex as TokioMutex};
use tokio::time::sleep;
use tokio_tungstenite::{connect_async_with_config, tungstenite::Message, tungstenite::client::IntoClientRequest};
use url::Url;
use serde_json::json;
use base64::Engine;
use serde::Deserialize;


#[derive(Default)]
pub struct SocketTx(pub TokioMutex<Option<mpsc::UnboundedSender<String>>>);

#[derive(Debug, Clone, PartialEq)]
pub enum ConnectionState {
    Connected,
    Disconnected,
    Connecting,
}

pub struct WebSocketState {
    pub connection_state: ConnectionState,
    pub last_heartbeat: Instant,
    pub reconnect_attempts: u32,
    pub max_reconnect_attempts: u32,
    pub reconnect_delay: Duration,
    pub heartbeat_interval: Duration,
    pub auth_token: Option<String>, // Store the auth token for reconnection
}

impl Default for WebSocketState {
    fn default() -> Self {
        Self {
            connection_state: ConnectionState::Disconnected,
            last_heartbeat: Instant::now(),
            reconnect_attempts: 0,
            max_reconnect_attempts: 5,
            reconnect_delay: Duration::from_secs(2),
            heartbeat_interval: Duration::from_secs(30),
            auth_token: None,
        }
    }
}

// Message status handling structs
#[derive(Deserialize)]
struct MessageStatusWrapper {
    message: MessageStatus,
    #[serde(rename = "type")]
    _message_type: String, // Prefix with underscore to indicate intentionally unused
}

#[derive(Deserialize)]
struct MessageStatus {
    message_id: Option<String>,
    _client_message_id: Option<String>, // Prefix with underscore to indicate intentionally unused
    chat_id: String,
    sender_id: String,
    status: String,
    timestamp: String, // Always present in server messages
}

// Handle message status updates (ACK messages)
async fn handle_message_status(message_text: &str, app: AppHandle) -> Result<(), String> {
    println!("[WebSocket] Processing message status update: {}", message_text);
    
    let status_message: MessageStatusWrapper = serde_json::from_str(message_text)
        .map_err(|e| format!("Failed to parse status message: {}", e))?;
    
    let status = status_message.message;
    let server_message_id = status.message_id;
    let status_type = status.status;
    
    println!("[WebSocket] Status update: serverId={:?}, status={}", 
             server_message_id, status_type);
    
    // Update message status using server ID
    if let Some(ref server_id) = server_message_id {
        match status_type.as_str() {
            "sent" => {
                if let Err(e) = crate::database_async::update_message_sent_status_by_server_id(server_id, true).await {
                    println!("[WebSocket] Failed to mark message as sent: {}", e);
                } else {
                    println!("[WebSocket] Successfully marked message {} as sent", server_id);
                }
            }
            "delivered" => {
                if let Err(e) = crate::database_async::mark_message_delivered_by_server_id_new(server_id).await {
                    println!("[WebSocket] Failed to mark message as delivered: {}", e);
                } else {
                    println!("[WebSocket] Successfully marked message {} as delivered", server_id);
                }
            }
            "read" => {
                if let Err(e) = crate::database_async::mark_message_read_by_server_id_new(server_id).await {
                    println!("[WebSocket] Failed to mark message as read: {}", e);
                } else {
                    println!("[WebSocket] Successfully marked message {} as read", server_id);
                }
            }
            _ => {
                println!("[WebSocket] Unknown status type: {}", status_type);
            }
        }
    }
    
    // Emit status update to frontend for MessageLinkingManager to handle
    app.emit("message-status-update", json!({
        "server_message_id": server_message_id,
        "status": status_type,
        "chat_id": status.chat_id,
        "sender_id": status.sender_id,
        "timestamp": status.timestamp
    })).ok();
    
    Ok(())
}

#[tauri::command]
pub async fn connect_socket(
    token: String,
    state: State<'_, Arc<SocketTx>>,
    ws_state: State<'_, Arc<TokioMutex<WebSocketState>>>,
    app: AppHandle,
) -> Result<(), String> {
    let mut ws_state_guard = ws_state.lock().await;
    
    if ws_state_guard.connection_state != ConnectionState::Disconnected {
        println!("[WebSocket] Already connected or connecting, skipping connection attempt");
        return Ok(());
    }
    
    ws_state_guard.connection_state = ConnectionState::Connecting;
    ws_state_guard.auth_token = Some(token.clone()); // Store the token
    drop(ws_state_guard);

            println!("[WebSocket] Attempting WebSocket connection to wss://dev.v1.terracrypt.cc/api/v1/ws");
    println!("[WebSocket] Using Bearer token: {}...", &token[..std::cmp::min(16, token.len())]);
    
    let url = Url::parse("wss://dev.v1.terracrypt.cc/api/v1/ws").unwrap();
    println!("[WebSocket] URL parsed successfully: {}", url);
    
    // Use connect_async_with_config for custom headers (following tokio-tungstenite examples)
    println!("[WebSocket] Using connect_async_with_config approach...");
    
    // Parse the WSS URL
    let wss_url = Url::parse("wss://dev.v1.terracrypt.cc/api/v1/ws")
        .map_err(|e| format!("Failed to parse URL: {}", e))?;
    println!("[WebSocket] Using WSS URL for handshake: {}", wss_url);
    
    // Create a request with custom headers
    let mut request = wss_url.into_client_request()
        .map_err(|e| format!("Failed to create client request: {}", e))?;
    
    // Add Authorization header
    request.headers_mut().insert(
        "Authorization",
        format!("Bearer {}", token.trim()).parse()
            .map_err(|e| format!("Failed to parse Authorization header: {}", e))?
    );
    
    // Add Origin header for CORS
    request.headers_mut().insert(
        "Origin",
        "https://dev.v1.terracrypt.cc".parse()
            .map_err(|e| format!("Failed to parse Origin header: {}", e))?
    );
    
    // Add User-Agent header
    request.headers_mut().insert(
        "User-Agent",
        "TerraCryptChat-Tauri/1.0".parse()
            .map_err(|e| format!("Failed to parse User-Agent header: {}", e))?
    );
    
    // Add Sec-WebSocket-Protocol header if needed
    request.headers_mut().insert(
        "Sec-WebSocket-Protocol",
        "chat".parse()
            .map_err(|e| format!("Failed to parse Sec-WebSocket-Protocol header: {}", e))?
    );
    
    println!("[WebSocket] Request built with custom headers");
    println!("[WebSocket] Request headers: {:?}", request.headers());
    
    // Use connect_async_with_config with default config
    let (ws_stream, _response) = match connect_async_with_config(request, None, false).await {
        Ok((ws_stream, response)) => {
            println!("[WebSocket] Connection established successfully!");
            println!("[WebSocket] Response status: {}", response.status());
            println!("[WebSocket] Response headers: {:?}", response.headers());
            (ws_stream, response)
        }
        Err(e) => {
            println!("[WebSocket] Connection failed: {}", e);
            let mut ws_state_guard = ws_state.lock().await;
            ws_state_guard.connection_state = ConnectionState::Disconnected;
            return Err(format!("Failed to connect: {}", e));
        }
    };

    println!("[WebSocket] Splitting WebSocket stream into read/write parts...");
    let (write, mut read) = ws_stream.split();
    let (tx, mut rx) = mpsc::unbounded_channel::<String>();
    
    // Update state
    println!("[WebSocket] Updating connection state...");
    let mut ws_state_guard = ws_state.lock().await;
    ws_state_guard.connection_state = ConnectionState::Connected;
    ws_state_guard.last_heartbeat = Instant::now();
    ws_state_guard.reconnect_attempts = 0;
    drop(ws_state_guard);
    
    *state.0.lock().await = Some(tx);
    println!("[WebSocket] WebSocket connection fully established and ready!");

    let write = Arc::new(TokioMutex::new(write));

    // Emit connection status
    println!("[WebSocket] Emitting 'connected' status to frontend...");
    app.emit("websocket-status", json!({
        "type": "connection-status",
        "message": {
            "status": "connected",
            "timestamp": chrono::Utc::now().timestamp()
        }
    })).ok();
    println!("[WebSocket] Connection status emitted successfully");

    // Task to handle incoming messages
    println!("[WebSocket] Starting message reader task...");
    let app_clone = app.clone();
    let ws_state_clone = Arc::clone(&ws_state.inner());
    tokio::spawn(async move {
        println!("[WebSocket] Message reader task started, waiting for messages...");
        let mut message_count = 0;
        while let Some(msg_result) = read.next().await {
            message_count += 1;
            println!("[WebSocket] Message #{} received", message_count);
            
            match msg_result {
                Ok(msg) => {
                    println!("[WebSocket] Message type: {:?}", msg);
                    match msg {
                        Message::Text(text) => {
                            // Handle text messages
                            if text.trim().is_empty() {
                                println!("[WebSocket] Received empty text message, skipping...");
                                continue;
                            }
                            
                            println!("[WebSocket] Received text message: {}", text);
                            
                            // Clone text for background task
                            let text_for_background = text.clone();
                            
                            // Check if it's a chat message and log it prominently
                            if text.contains("\"type\":\"chat\"") {
                                println!("[WebSocket] 🎯 CHAT MESSAGE RECEIVED: {}", text);
                                
                                // Handle chat message in background task
                                let app_clone_for_task = app_clone.clone();
                                tokio::spawn(async move {
                                    if let Err(e) = handle_chat_message(&text_for_background, app_clone_for_task).await {
                                        println!("[WebSocket] Error handling chat message: {}", e);
                                    }
                                });
                            }
                            // Check if it's a message status update (ACK) - handle multiple possible formats
                            else if text.contains("\"type\":\"message-status\"") || 
                                    text.contains("\"type\":\"status\"") ||
                                    (text.contains("\"status\"") && text.contains("\"message_id\"")) {
                                println!("[WebSocket] 📨 MESSAGE STATUS UPDATE RECEIVED: {}", text);
                                
                                // Handle status update in background task
                                let app_clone_for_task = app_clone.clone();
                                tokio::spawn(async move {
                                    if let Err(e) = handle_message_status(&text_for_background, app_clone_for_task).await {
                                        println!("[WebSocket] Error handling message status: {}", e);
                                    }
                                });
                            }
                            
                            // Update heartbeat timestamp
                            let mut ws_state_guard = ws_state_clone.lock().await;
                            ws_state_guard.last_heartbeat = Instant::now();
                            drop(ws_state_guard);
                            
                            // Emit message to frontend
                            app_clone.emit("message", text).ok();
                        }
                        Message::Close(close_frame) => {
                            // Handle close frames properly
                            println!("[WebSocket] Received close frame: {:?}", close_frame);
                            println!("[WebSocket] Close frame code: {:?}", close_frame.as_ref().map(|f| f.code));
                            if let Some(frame) = close_frame.as_ref() {
                                println!("[WebSocket] Close frame reason: {:?}", frame.reason);
                            }
                            println!("[WebSocket] Server is closing the connection");
                            break;
                        }
                        Message::Ping(data) => {
                            // Handle ping frames
                            println!("[WebSocket] Received ping frame with data: {:?}", data);
                            // Update heartbeat timestamp
                            let mut ws_state_guard = ws_state_clone.lock().await;
                            ws_state_guard.last_heartbeat = Instant::now();
                            drop(ws_state_guard);
                        }
                        Message::Pong(data) => {
                            // Handle pong frames
                            println!("[WebSocket] Received pong frame with data: {:?}", data);
                            // Update heartbeat timestamp
                            let mut ws_state_guard = ws_state_clone.lock().await;
                            ws_state_guard.last_heartbeat = Instant::now();
                            drop(ws_state_guard);
                        }
                        Message::Binary(data) => {
                            // Handle binary messages
                            println!("[WebSocket] Received binary message with {} bytes", data.len());
                            // Update heartbeat timestamp
                            let mut ws_state_guard = ws_state_clone.lock().await;
                            ws_state_guard.last_heartbeat = Instant::now();
                            drop(ws_state_guard);
                        }
                        Message::Frame(frame) => {
                            // Handle raw frames
                            println!("[WebSocket] Received raw frame: {:?}", frame);
                            // Update heartbeat timestamp
                            let mut ws_state_guard = ws_state_clone.lock().await;
                            ws_state_guard.last_heartbeat = Instant::now();
                            drop(ws_state_guard);
                        }
                    }
                }
                Err(e) => {
                    println!("[WebSocket] Read error: {}", e);
                    println!("[WebSocket] Read error type: {:?}", e);
                    break;
                }
            }
        }
        
        // Connection closed
        println!("[WebSocket] Message reader task ending - connection closed");
        println!("[WebSocket] Total messages received: {}", message_count);
        println!("[WebSocket] This could be due to server closing connection or network issue");
        
        // Only mark as disconnected if we haven't received any messages recently
        let mut ws_state_guard = ws_state_clone.lock().await;
        let time_since_last_message = ws_state_guard.last_heartbeat.elapsed();
        if time_since_last_message > Duration::from_secs(30) { // 30 second timeout
            println!("[WebSocket] No recent messages, marking as disconnected");
            ws_state_guard.connection_state = ConnectionState::Disconnected;
            ws_state_guard.auth_token = None; // Clear the token on disconnect
            drop(ws_state_guard);
            
            app_clone.emit("websocket-status", json!({
                "type": "connection-status",
                "message": {
                    "status": "disconnected",
                    "timestamp": chrono::Utc::now().timestamp()
                }
            })).ok();
            println!("[WebSocket] Disconnected status emitted to frontend");
        } else {
            println!("[WebSocket] Recent messages detected, keeping connection state as active");
            drop(ws_state_guard);
        }
        
        // Note: Automatic reconnection removed due to type complexity
        // The frontend can handle reconnection through the UI
    });

    // Task to handle outgoing messages
    println!("[WebSocket] Starting message writer task...");
    let write_clone = Arc::clone(&write);
    tokio::spawn(async move {
        println!("[WebSocket] Message writer task started, ready to send messages...");
        while let Some(msg) = rx.recv().await {
            println!("[WebSocket] Processing message: {}", msg);
            
            let mut write_guard = write_clone.lock().await;
            
            // Handle special PING message
            if msg == "PING" {
                println!("[WebSocket] Sending native WebSocket ping frame");
                if let Err(e) = write_guard.send(Message::Ping(vec![])).await {
                    println!("[WebSocket] Error sending ping frame: {}", e);
                    break;
                }
                println!("[WebSocket] Ping frame sent successfully");
            } else {
                // Send as text message (like iOS WebSocketEngine)
                println!("[WebSocket] Sending text message: {}", msg);
                if let Err(e) = write_guard.send(Message::Text(msg)).await {
                    println!("[WebSocket] Error sending text message: {}", e);
                    break;
                }
                println!("[WebSocket] Text message sent successfully");
            }
        }
        println!("[WebSocket] Message writer task ending");
    });

    // Heartbeat task with native WebSocket ping (like Swift)
    println!("[WebSocket] Starting heartbeat task...");
    let write_clone = Arc::clone(&write);
    let ws_state_clone = Arc::clone(&ws_state.inner());
    let app_clone = app.clone();
    tokio::spawn(async move {
        let heartbeat_interval = {
            let state = ws_state_clone.lock().await;
            state.heartbeat_interval
        };
        
        println!("[WebSocket] Heartbeat task started, will send ping every {} seconds", heartbeat_interval.as_secs());
        loop {
            sleep(heartbeat_interval).await;
            
            // Check if connection is still active before sending ping
            let is_connected = {
                let state = ws_state_clone.lock().await;
                state.connection_state == ConnectionState::Connected
            };
            
            if !is_connected {
                println!("[WebSocket] Connection no longer active, stopping heartbeat");
                break;
            }
            
            println!("[WebSocket] Sending heartbeat ping...");
            
            // Send native WebSocket ping frame (like iOS implementation)
            let mut write_guard = write_clone.lock().await;
            if let Err(e) = write_guard.send(Message::Ping(vec![])).await {
                println!("[WebSocket] Error sending heartbeat ping: {}", e);
                break;
            }
            println!("[WebSocket] Heartbeat ping sent successfully");
            
            // Check if we've received anything recently (3x heartbeat interval timeout for more tolerance)
            let ws_state_guard = ws_state_clone.lock().await;
            let elapsed = ws_state_guard.last_heartbeat.elapsed();
            let timeout = heartbeat_interval * 3; // More tolerant timeout
            if elapsed > timeout {
                println!("[WebSocket] Heartbeat timeout - last message received {} seconds ago", elapsed.as_secs());
                drop(ws_state_guard);
                break;
            }
            println!("[WebSocket] Heartbeat check passed, last message received {} seconds ago", elapsed.as_secs());
        }
        
        // Only set disconnected if we're actually disconnected
        // Check if the WebSocket is still functional before marking as disconnected
        println!("[WebSocket] Heartbeat task ending - checking actual connection status");
        let mut ws_state_guard = ws_state_clone.lock().await;
        
        // Only mark as disconnected if we haven't received any messages recently
        let time_since_last_message = ws_state_guard.last_heartbeat.elapsed();
        if time_since_last_message > Duration::from_secs(60) { // 1 minute timeout
            println!("[WebSocket] No messages received for 60 seconds, marking as disconnected");
            ws_state_guard.connection_state = ConnectionState::Disconnected;
            drop(ws_state_guard);
            
            app_clone.emit("websocket-status", json!({
                "type": "connection-status",
                "message": {
                    "status": "heartbeat_timeout",
                    "timestamp": chrono::Utc::now().timestamp()
                }
            })).ok();
            println!("[WebSocket] Heartbeat timeout status emitted to frontend");
        } else {
            println!("[WebSocket] Messages still flowing, keeping connection as active");
            drop(ws_state_guard);
        }
    });

    Ok(())
}

#[tauri::command]
pub async fn disconnect_socket(
    state: State<'_, Arc<SocketTx>>,
    ws_state: State<'_, Arc<TokioMutex<WebSocketState>>>,
    app: AppHandle,
) -> Result<(), String> {
    println!("[WebSocket] Disconnecting WebSocket...");
    let mut ws_state_guard = ws_state.lock().await;
    ws_state_guard.connection_state = ConnectionState::Disconnected;
    ws_state_guard.auth_token = None; // Clear the token on disconnect
    drop(ws_state_guard);
    
    *state.0.lock().await = None;
    println!("[WebSocket] WebSocket disconnected successfully");
    
    app.emit("websocket-status", json!({
        "type": "connection-status",
        "message": {
            "status": "disconnected",
            "timestamp": chrono::Utc::now().timestamp()
        }
    })).ok();
    println!("[WebSocket] Disconnected status emitted to frontend");
    
    Ok(())
}

#[tauri::command]
pub async fn send_socket_message(
    state: State<'_, Arc<SocketTx>>, 
    message: String
) -> Result<(), String> {
    println!("[WebSocket] Attempting to send message: {}", message);
    let tx_option = state.0.lock().await;
    if let Some(tx) = &*tx_option {
        tx.send(message).map_err(|e| format!("Failed to send message: {}", e))?;
        println!("[WebSocket] Message queued for sending successfully");
        Ok(())
    } else {
        println!("[WebSocket] Failed to send message - WebSocket not connected");
        Err("WebSocket not connected".to_string())
    }
}

#[tauri::command]
pub async fn send_socket_binary_message(
    state: State<'_, Arc<SocketTx>>, 
    message: Vec<u8>
) -> Result<(), String> {
    println!("[WebSocket] Attempting to send binary message: {} bytes", message.len());
    println!("[WebSocket] Binary data preview: {:?}", &message[..std::cmp::min(message.len(), 100)]);
    
    // Try to decode as string for debugging
    if let Ok(text) = String::from_utf8(message.clone()) {
        println!("[WebSocket] Binary data as string: {}", text);
    }
    
    let tx_option = state.0.lock().await;
    if let Some(tx) = &*tx_option {
        // Convert binary to text message for compatibility
        if let Ok(text) = String::from_utf8(message) {
            tx.send(text).map_err(|e| format!("Failed to send binary message: {}", e))?;
            println!("[WebSocket] Binary message converted to text and queued for sending successfully");
            Ok(())
        } else {
            println!("[WebSocket] Failed to convert binary message to text");
            Err("Failed to convert binary message to text".to_string())
        }
    } else {
        println!("[WebSocket] Failed to send binary message - WebSocket not connected");
        Err("WebSocket not connected".to_string())
    }
}

#[tauri::command]
pub async fn send_socket_ping(
    state: State<'_, Arc<SocketTx>>
) -> Result<(), String> {
    println!("[WebSocket] Attempting to send ping message");
    let tx_option = state.0.lock().await;
    if let Some(tx) = &*tx_option {
        // Send native WebSocket ping frame (like iOS implementation)
        // Note: This will be converted to Message::Ping in the message writer task
        tx.send("PING".to_string()).map_err(|e| format!("Failed to send ping: {}", e))?;
        println!("[WebSocket] Ping message queued for sending successfully");
        Ok(())
    } else {
        println!("[WebSocket] Failed to send ping - WebSocket not connected");
        Err("WebSocket not connected".to_string())
    }
}





#[tauri::command]
pub async fn get_websocket_status(
    ws_state: State<'_, Arc<TokioMutex<WebSocketState>>>
) -> Result<serde_json::Value, String> {
    let state = ws_state.lock().await;
    let connection_state_str = match state.connection_state {
        ConnectionState::Connected => "connected",
        ConnectionState::Disconnected => "disconnected",
        ConnectionState::Connecting => "connecting",
    };
    
    let status = json!({
        "connection_state": connection_state_str,
        "is_connected": state.connection_state == ConnectionState::Connected,
        "is_connecting": state.connection_state == ConnectionState::Connecting,
        "reconnect_attempts": state.reconnect_attempts,
        "last_heartbeat": state.last_heartbeat.elapsed().as_secs(),
        "max_reconnect_attempts": state.max_reconnect_attempts,
        "heartbeat_interval": state.heartbeat_interval.as_secs()
    });
    println!("[WebSocket] Status requested: {:?}", status);
    Ok(status)
}

#[tauri::command]
pub async fn reconnect_socket(
    token: String,
    state: State<'_, Arc<SocketTx>>,
    ws_state: State<'_, Arc<TokioMutex<WebSocketState>>>,
    app: AppHandle,
) -> Result<(), String> {
    println!("[WebSocket] Attempting to reconnect...");
    
    let ws_state_guard = ws_state.lock().await;
    if ws_state_guard.connection_state == ConnectionState::Connecting {
        println!("[WebSocket] Reconnection already in progress");
        return Ok(());
    }
    
    let max_attempts = ws_state_guard.max_reconnect_attempts;
    let delay = ws_state_guard.reconnect_delay;
    drop(ws_state_guard);
    
    // Attempt reconnection with retry logic (like Swift)
    for attempt in 1..=max_attempts {
        println!("[WebSocket] Reconnection attempt {}/{}", attempt, max_attempts);
        
        match connect_socket(token.clone(), state.clone(), ws_state.clone(), app.clone()).await {
            Ok(_) => {
                println!("[WebSocket] Reconnection successful on attempt {}", attempt);
                return Ok(());
            }
            Err(e) => {
                println!("[WebSocket] Reconnection attempt {} failed: {}", attempt, e);
                if attempt < max_attempts {
                    println!("[WebSocket] Waiting {} seconds before next attempt...", delay.as_secs());
                    sleep(delay).await;
                }
            }
        }
    }
    
    println!("[WebSocket] Reconnection failed after {} attempts", max_attempts);
    Err("Failed to reconnect after maximum attempts".to_string())
}

// Handle chat message in background task
async fn handle_chat_message(message_text: &str, app: AppHandle) -> Result<(), String> {
    println!("[WebSocket] Processing chat message in background task");
    
    // Parse the message
    let message_data: serde_json::Value = serde_json::from_str(message_text)
        .map_err(|e| format!("Failed to parse message JSON: {}", e))?;
    
    // Extract message details
    let message = message_data.get("message")
        .ok_or("No message field in WebSocket data")?;
    
    let message_id = message.get("message_id")
        .and_then(|v| v.as_str())
        .ok_or("No message_id in message")?;
    
    let chat_id = message.get("chat_id")
        .and_then(|v| v.as_str())
        .ok_or("No chat_id in message")?;
    
    let sender_id = message.get("sender_id")
        .and_then(|v| v.as_str())
        .ok_or("No sender_id in message")?;
    
    let encrypted_content = message.get("content")
        .and_then(|v| v.as_str())
        .ok_or("No content in message")?;
    
    // Decrypt the content (simple XOR decryption to match frontend)
    let decrypted_content = decrypt_message(encrypted_content);
    
    let sent_at = message.get("sent_at")
        .and_then(|v| v.as_str())
        .ok_or("No sent_at in message")?;
    
    // Parse timestamp
    let timestamp = chrono::DateTime::parse_from_rfc3339(sent_at)
        .map_err(|e| format!("Failed to parse timestamp: {}", e))?
        .timestamp();
    
    println!("[WebSocket] Saving message to database: {}", message_id);
    
    // Save message to database (decrypted)
    let db_message = crate::database_async::Message {
        id: None,
        message_id: Some(message_id.to_string()),
        client_message_id: message_id.to_string(), // Use server ID as client ID for incoming messages
        chat_id: chat_id.to_string(),
        sender_id: sender_id.to_string(),
        content: decrypted_content.clone(),
        timestamp,
        is_read: false,
        is_sent: true,
        is_delivered: true,
        is_failed: false,
        sender_username: None,
        reply_to_message_id: None,
    };
    
    if let Err(e) = crate::database_async::insert_or_update_message(&db_message).await {
        println!("[WebSocket] Failed to save message to database: {}", e);
        return Err(format!("Database error: {}", e));
    }
    
    println!("[WebSocket] Message saved to database successfully");
    
    // Emit message saved event to frontend
    println!("[WebSocket] Emitting message-saved event to frontend");
    app.emit("message-saved", json!({
        "message_id": message_id,
        "chat_id": chat_id,
        "sender_id": sender_id,
        "content": decrypted_content,
        "timestamp": timestamp
    })).ok();
    
    println!("[WebSocket] Message-saved event emitted successfully");
    
    // Also emit a simple test event to verify event system
    println!("[WebSocket] Emitting test event to verify event system");
    app.emit("test-event", json!({
        "test": "event_system_working",
        "timestamp": timestamp
    })).ok();
    println!("[WebSocket] Test event emitted");
    
    Ok(())
}

// XOR decryption function to match frontend implementation
fn decrypt_message(encrypted_string: &str) -> String {
    const INTERNAL_KEY: &str = "hardcoded_key"; // Must match frontend key
    
    if encrypted_string.is_empty() {
        return String::new();
    }
    
    // Decode base64
    let encrypted_bytes = match base64::engine::general_purpose::STANDARD.decode(encrypted_string) {
        Ok(bytes) => bytes,
        Err(_) => {
            println!("[WebSocket] Failed to decode base64, returning original");
            return encrypted_string.to_string();
        }
    };
    
    // XOR decrypt
    let key_bytes = INTERNAL_KEY.as_bytes();
    let decrypted_bytes: Vec<u8> = encrypted_bytes
        .iter()
        .enumerate()
        .map(|(i, &byte)| byte ^ key_bytes[i % key_bytes.len()])
        .collect();
    
    // Convert to string
    match String::from_utf8(decrypted_bytes) {
        Ok(decrypted) => decrypted,
        Err(_) => {
            println!("[WebSocket] Failed to convert decrypted bytes to string, returning original");
            encrypted_string.to_string()
        }
    }
}
