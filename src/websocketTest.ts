import { websocketService } from './websocketService';
// import { invoke } from '@tauri-apps/api/core';

export async function testCurrentWebSocketStatus() {
  try {
    console.log('🧪 Testing WebSocket connection status...');
    
    // Get status from Rust side
    const status = await websocketService.getStatus();
    console.log('🧪 WebSocket status from Rust:', status);
    
    // Get local status
    const localStatus = websocketService.isConnectedToServer();
    console.log('🧪 Local WebSocket status:', localStatus);
    
    // Get connection info
    const connectionInfo = websocketService.getConnectionInfo();
    console.log('🧪 Connection info:', connectionInfo);
    
    return {
      rustStatus: status,
      localStatus: localStatus,
      connectionInfo: connectionInfo
    };
  } catch (error) {
    console.error('🧪 WebSocket status test failed:', error);
    throw error;
  }
}

export async function testWebSocketMessageSending() {
  try {
    console.log('🧪 Testing WebSocket message sending...');
    
    // Check if connected
    const isConnected = websocketService.isConnectedToServer();
    if (!isConnected) {
      console.log('🧪 WebSocket not connected, cannot test message sending');
      return { success: false, error: 'WebSocket not connected' };
    }
    
    // Send a test message
    const testMessage = {
      type: "test",
      message: "Hello from Tauri WebSocket test!",
      timestamp: Date.now()
    };
    
    console.log('🧪 Sending test message:', testMessage);
    await websocketService.sendMessage(testMessage);
    console.log('🧪 Test message sent successfully');
    
    return { success: true, message: testMessage };
  } catch (error) {
    console.error('🧪 WebSocket message sending test failed:', error);
    return { success: false, error: error };
  }
}

export async function testWebSocketChatMessage() {
  try {
    console.log('🧪 Testing WebSocket chat message sending...');
    
    // Check if connected
    const isConnected = websocketService.isConnectedToServer();
    if (!isConnected) {
      console.log('🧪 WebSocket not connected, cannot test chat message sending');
      return { success: false, error: 'WebSocket not connected' };
    }
    
    // Send a test chat message
    const testChatMessage = {
      type: "chat",
      message: {
        chat_id: "test-chat-id",
        content: "Hello from Tauri chat test!",
        sender_id: "test-sender-id"
      },
      client_message_id: "test-client-id-" + Date.now()
    };
    
    console.log('🧪 Sending test chat message:', testChatMessage);
    await websocketService.sendMessage(testChatMessage);
    console.log('🧪 Test chat message sent successfully');
    
    return { success: true, message: testChatMessage };
  } catch (error) {
    console.error('🧪 WebSocket chat message test failed:', error);
    return { success: false, error: error };
  }
}

export async function testWebSocketConnection(token: string) {
  try {
    console.log('🧪 Testing WebSocket connection...');
    
    // Try to connect
    await websocketService.connect(token);
    console.log('🧪 WebSocket connection initiated');
    
    // Wait a bit for connection to establish
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Check status
    const status = await websocketService.getStatus();
    console.log('🧪 WebSocket status after connection:', status);
    
    return { success: true, status: status };
  } catch (error) {
    console.error('🧪 WebSocket connection test failed:', error);
    return { success: false, error: error };
  }
}

export async function testWebSocketDisconnection() {
  try {
    console.log('🧪 Testing WebSocket disconnection...');
    
    await websocketService.disconnect();
    console.log('🧪 WebSocket disconnection initiated');
    
    // Wait a bit for disconnection to complete
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Check status
    const status = await websocketService.getStatus();
    console.log('🧪 WebSocket status after disconnection:', status);
    
    return { success: true, status: status };
  } catch (error) {
    console.error('🧪 WebSocket disconnection test failed:', error);
    return { success: false, error: error };
  }
} 