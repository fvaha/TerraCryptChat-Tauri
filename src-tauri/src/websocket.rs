use futures::{SinkExt as FuturesSinkExt, StreamExt as FuturesStreamExt};
use std::sync::Arc;
use std::time::{Duration, Instant};
use tauri::{AppHandle, State};
use tauri::Emitter;
use tokio::sync::{mpsc, Mutex as TokioMutex};
use tokio::time::sleep;
use tokio_tungstenite::{connect_async, tungstenite::Message};
use url::Url;
use serde_json::json;

#[derive(Default)]
pub struct SocketTx(pub TokioMutex<Option<mpsc::UnboundedSender<String>>>);

pub struct WebSocketState {
    pub is_connected: bool,
    pub is_connecting: bool,
    pub last_heartbeat: Instant,
    pub reconnect_attempts: u32,
}

impl Default for WebSocketState {
    fn default() -> Self {
        Self {
            is_connected: false,
            is_connecting: false,
            last_heartbeat: Instant::now(),
            reconnect_attempts: 0,
        }
    }
}

#[tauri::command]
pub async fn connect_socket(
    token: String,
    state: State<'_, Arc<SocketTx>>,
    ws_state: State<'_, Arc<TokioMutex<WebSocketState>>>,
    app: AppHandle,
) -> Result<(), String> {
    let mut ws_state_guard = ws_state.lock().await;
    
    if ws_state_guard.is_connected || ws_state_guard.is_connecting {
        println!("WebSocket already connected or connecting");
        return Ok(());
    }
    
    ws_state_guard.is_connecting = true;
    drop(ws_state_guard);

            println!("Attempting WebSocket connection to wss://dev.v1.terracrypt.cc/api/v1/ws");
    println!("Using Bearer token: {}...", &token[..std::cmp::min(16, token.len())]);
    
    let url = Url::parse("wss://dev.v1.terracrypt.cc/api/v1/ws").unwrap();
    
    // Create request with proper headers
    let req = tokio_tungstenite::tungstenite::handshake::client::Request::builder()
        .uri(url.as_str())
        .header("Authorization", format!("Bearer {}", token))
        .header("Connection", "Upgrade")
        .header("Upgrade", "websocket")
        .header("Sec-WebSocket-Version", "13")
        .header("Origin", "https://dev.v1.terracrypt.cc")
        .body(())
        .map_err(|e| format!("Failed to build request: {}", e))?;

    let (ws_stream, _) = match connect_async(req).await {
        Ok(ws_stream) => ws_stream,
        Err(e) => {
            let mut ws_state_guard = ws_state.lock().await;
            ws_state_guard.is_connecting = false;
            return Err(format!("Failed to connect: {}", e));
        }
    };

    let (write, mut read) = ws_stream.split();
    let (tx, mut rx) = mpsc::unbounded_channel::<String>();
    
    // Update state
    let mut ws_state_guard = ws_state.lock().await;
    ws_state_guard.is_connected = true;
    ws_state_guard.is_connecting = false;
    ws_state_guard.last_heartbeat = Instant::now();
    ws_state_guard.reconnect_attempts = 0;
    drop(ws_state_guard);
    
    *state.0.lock().await = Some(tx);

    let write = Arc::new(TokioMutex::new(write));

    // Emit connection status
    app.emit("websocket-status", json!({
        "status": "connected",
        "timestamp": chrono::Utc::now().timestamp()
    })).ok();

    // Task to handle incoming messages
    let app_clone = app.clone();
    let ws_state_clone = Arc::clone(&ws_state.inner());
    tokio::spawn(async move {
        while let Some(msg_result) = read.next().await {
            match msg_result {
                Ok(msg) => {
                    if let Ok(text) = msg.to_text() {
                        // Update heartbeat timestamp
                        let mut ws_state_guard = ws_state_clone.lock().await;
                        ws_state_guard.last_heartbeat = Instant::now();
                        drop(ws_state_guard);
                        
                        // Emit message to frontend
                        app_clone.emit("message", Some(text.to_string())).ok();
                    }
                }
                Err(e) => {
                    println!("WebSocket read error: {}", e);
                    break;
                }
            }
        }
        
        // Connection closed
        let mut ws_state_guard = ws_state_clone.lock().await;
        ws_state_guard.is_connected = false;
        drop(ws_state_guard);
        
        app_clone.emit("websocket-status", json!({
            "status": "disconnected",
            "timestamp": chrono::Utc::now().timestamp()
        })).ok();
    });

    // Task to handle outgoing messages
    let write_clone = Arc::clone(&write);
    tokio::spawn(async move {
        while let Some(msg) = rx.recv().await {
            let mut write_guard = write_clone.lock().await;
            if let Err(e) = write_guard.send(Message::Text(msg)).await {
                println!("Error sending message: {}", e);
                break;
            }
        }
    });

    // Heartbeat task
    let write_clone = Arc::clone(&write);
    let ws_state_clone = Arc::clone(&ws_state.inner());
    let app_clone = app.clone();
    tokio::spawn(async move {
        loop {
            sleep(Duration::from_secs(60)).await; // Send heartbeat every 60 seconds
            
            let mut write_guard = write_clone.lock().await;
            if let Err(e) = write_guard.send(Message::Text("ping".to_string())).await {
                println!("Error sending heartbeat: {}", e);
                break;
            }
            
            // Check if we've received anything recently
            let ws_state_guard = ws_state_clone.lock().await;
            let elapsed = ws_state_guard.last_heartbeat.elapsed();
            if elapsed > Duration::from_secs(120) { // 2 minute timeout
                println!("Heartbeat timeout - forcing reconnect");
                drop(ws_state_guard);
                break;
            }
        }
        
        // Schedule reconnection on heartbeat failure
        let mut ws_state_guard = ws_state_clone.lock().await;
        ws_state_guard.is_connected = false;
        drop(ws_state_guard);
        
        app_clone.emit("websocket-status", json!({
            "status": "heartbeat_timeout",
            "timestamp": chrono::Utc::now().timestamp()
        })).ok();
    });

    Ok(())
}

#[tauri::command]
pub async fn disconnect_socket(
    state: State<'_, Arc<SocketTx>>,
    ws_state: State<'_, Arc<TokioMutex<WebSocketState>>>,
    app: AppHandle,
) -> Result<(), String> {
    let mut ws_state_guard = ws_state.lock().await;
    ws_state_guard.is_connected = false;
    ws_state_guard.is_connecting = false;
    drop(ws_state_guard);
    
    *state.0.lock().await = None;
    
    app.emit("websocket-status", json!({
        "status": "disconnected",
        "timestamp": chrono::Utc::now().timestamp()
    })).ok();
    
    Ok(())
}

#[tauri::command]
pub async fn send_socket_message(
    state: State<'_, Arc<SocketTx>>, 
    message: String
) -> Result<(), String> {
    let tx_option = state.0.lock().await;
    if let Some(tx) = &*tx_option {
        tx.send(message).map_err(|e| format!("Failed to send message: {}", e))?;
        Ok(())
    } else {
        Err("WebSocket not connected".to_string())
    }
}

#[tauri::command]
pub async fn get_websocket_status(
    ws_state: State<'_, Arc<TokioMutex<WebSocketState>>>
) -> Result<serde_json::Value, String> {
    let state = ws_state.lock().await;
    Ok(json!({
        "is_connected": state.is_connected,
        "is_connecting": state.is_connecting,
        "reconnect_attempts": state.reconnect_attempts,
        "last_heartbeat": state.last_heartbeat.elapsed().as_secs()
    }))
}
