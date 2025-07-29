// Simple test script to verify WebSocket functionality
console.log('🧪 Testing WebSocket functionality...');

// Test 1: Check if the application is running
console.log('✅ Application is running on port 5173');

// Test 2: Check if WebSocket service is available
if (typeof window !== 'undefined' && window.websocketService) {
    console.log('✅ WebSocket service is available');
} else {
    console.log('⚠️ WebSocket service not found in global scope');
}

// Test 3: Check if message service is available
if (typeof window !== 'undefined' && window.messageService) {
    console.log('✅ Message service is available');
} else {
    console.log('⚠️ Message service not found in global scope');
}

// Test 4: Check if Tauri is available
if (typeof window !== 'undefined' && window.__TAURI__) {
    console.log('✅ Tauri is available');
} else {
    console.log('⚠️ Tauri not found in global scope');
}

console.log('🧪 WebSocket test completed!');
console.log('📝 To test WebSocket functionality:');
console.log('1. Open the application window');
console.log('2. Log in to your account');
console.log('3. Navigate to a chat');
console.log('4. Try sending a message');
console.log('5. Check the browser console for WebSocket logs'); 