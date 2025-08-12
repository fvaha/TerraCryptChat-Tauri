# Sending Message Flow - Step by Step

## Complete Flow for Outgoing Messages

```
📝 USER TYPES MESSAGE (Plain Text)
         ↓
🆔 GENERATE LOCAL CLIENT MESSAGE ID
         ↓
💾 SAVE PLAIN TEXT TO DATABASE (with local ID)
         ↓
📱 SHOW PLAIN TEXT IN CHAT SCREEN (immediate)
         ↓
🔒 ENCRYPT FOR WEBSOCKET TRANSMISSION
         ↓
📡 SEND ENCRYPTED VIA WEBSOCKET
         ↓
📨 SERVER PROCESSES & SENDS STATUS UPDATE
         ↓
🔗 MESSAGE LINKING MANAGER LINKS LOCAL → SERVER ID
         ↓
✅ UPDATE MESSAGE STATUS & REFRESH UI
```

## Detailed Implementation

### 1. 📝 **User Types Message (Plain Text)**
```typescript
// User types: "Hello, how are you?"
const content = "Hello, how are you?"; // Plain text
```

### 2. 🆔 **Generate Local Client Message ID**
```typescript
// In sendMessage() method
const clientMessageId = generateUUID(); // e.g., "client_generated_id_123"
console.log("[MessageService] Generated client message ID:", clientMessageId);
```

### 3. 💾 **Save Plain Text to Database (with local ID)**
```typescript
// Save message locally first with client_message_id
await this.saveOutgoingMessage(
  clientMessageId,        // ← LOCAL ID for linking
  chatId,
  content,                // ← PLAIN TEXT saved to database
  currentUserId,
  replyToMessageId
);

// In saveOutgoingMessage():
const messageForDb = {
  message_id: null,           // ← Will be updated when server responds
  client_message_id: clientMessageId, // ← LOCAL ID for linking
  chat_id: chatId,
  sender_id: currentUserId,
  content: content,           // ← PLAIN TEXT stored in database
  timestamp: Date.now(),
  is_sent: false,            // ← Will be updated to true when server confirms
  is_delivered: false,
  is_read: false
};

await databaseServiceAsync.insertMessage(messageForDb);
```

### 4. 📱 **Show Plain Text in Chat Screen (immediate)**
```typescript
// Message is immediately emitted to UI (plain text)
this.emitMessage(messageEntity);

// In chat screen, message appears as readable text:
// "Hello, how are you?" ← Plain text, no processing needed
// Status shows: ⏳ (pending)
```

### 5. 🔒 **Encrypt for WebSocket Transmission**
```typescript
// In actuallySendMessage() method
// Encrypt the message content only when sending via websocket
console.log("[MessageService] Encrypting message content for transmission:", content.substring(0, 50) + "...");
const encryptedContent = encryptionService.encryptMessage(content);
console.log("[MessageService] Message encrypted successfully, length:", encryptedContent.length);
```

### 6. 📡 **Send Encrypted via WebSocket**
```typescript
// Prepare payload with encrypted content and client_message_id
const payload = {
  type: "chat",
  message: {
    chat_id: chatId,
    content: encryptedContent,        // ← ENCRYPTED content sent via websocket
    sender_id: senderId
  },
  client_message_id: clientMessageId  // ← LOCAL ID for server to echo back
};

// Send via Tauri invoke
await invoke('send_socket_message', { message: JSON.stringify(payload) });
```

### 7. 📨 **Server Processes & Sends Status Update**
```json
// Server responds with status update
{
  "message": {
    "message_id": "aa0e8400-e29b-41d4-a716-446655440000",  // ← SERVER ID
    "client_message_id": "client_generated_id_123",          // ← ECHOED LOCAL ID
    "status": "sent",
    "recipient_id": "660e8400-e29b-41d4-a716-446655440000",
    "chat_id": "880e8400-e29b-41d4-a716-446655440000",
    "sender_id": "550e8400-e29b-41d4-a716-446655440000",
    "timestamp": "2024-01-01T00:00:00Z"
  },
  "type": "message-status"
}
```

### 8. 🔗 **Message Linking Manager Links Local → Server ID**
```typescript
// In handleMessageStatusUpdate() when status === "sent"
if (client_message_id) {
  console.log("[MessageService] Linking message for 'sent' status:", { client_message_id, message_id });
  await messageLinkingManager.robustLinking(
    chat_id,
    sender_id,
    message_id,           // ← SERVER ID
    client_message_id,    // ← LOCAL ID for finding the message
    timestamp ? new Date(timestamp).getTime() : undefined
  );
}

// In MessageLinkingManager.robustLinking():
async robustLinking(chatId: string, senderId: string, serverId: string, clientMessageId?: string, serverTimestampMillis?: number) {
  if (clientMessageId && clientMessageId.trim()) {
    console.log(`[MessageLinkingManager] Using clientMessageId for linking: ${clientMessageId}`);
    await this.replaceMessageIdByClient(clientMessageId, serverId, serverTimestampMillis);
  }
}

// In replaceMessageIdByClient():
const oldMessage = await databaseServiceAsync.getMessageByClientId(clientMessageId);
if (oldMessage) {
  // Update the serverId (message_id) in the local DB
  await databaseServiceAsync.updateMessageIdByClient(clientMessageId, serverId);
  
  // Update timestamp if server provides it
  if (serverTimestamp && oldMessage.timestamp !== serverTimestamp) {
    const updated = {
      ...oldMessage,
      message_id: serverId,
      timestamp: serverTimestamp,
      is_sent: true,
      is_failed: false
    };
    await databaseServiceAsync.insertMessage(updated);
  }
}
```

### 9. ✅ **Update Message Status & Refresh UI**
```typescript
// Update message status to 'sent'
await this.updateMessageStatus(message_id, client_message_id, "sent");

// In updateMessageStatus():
if (clientMessageId && status === "sent") {
  console.log("[MessageService] Updating sent status by client message ID:", clientMessageId);
  await databaseServiceAsync.updateMessageSentStatus(clientMessageId, true);
}

// Emit event to notify ChatScreen to refresh messages and show updated checkmarks
window.dispatchEvent(new CustomEvent('message-status-updated', {
  detail: { messageId, clientMessageId, status }
}));

// ChatScreen listens for status updates and refreshes from database
useEffect(() => {
  const handleStatusUpdate = () => {
    console.log("[ChatScreen] Status update detected, refreshing messages...");
    refreshMessagesFromDatabase();
  };

  window.addEventListener('message-status-updated', handleStatusUpdate);
  return () => {
    window.removeEventListener('message-status-updated', handleStatusUpdate);
  };
}, [refreshMessagesFromDatabase]);
```

## Key Benefits of This Flow

### ✅ **Performance**
- **Instant UI display** - Message appears immediately (plain text)
- **No encryption delays** - User sees message instantly
- **Efficient storage** - Plain text stored for fast retrieval

### ✅ **Security**
- **End-to-end encryption** maintained during transmission
- **Plain text only in local database** - Secure local storage
- **Encryption only when needed** - For websocket transmission

### ✅ **User Experience**
- **Real-time feedback** - Message appears instantly
- **Smooth interaction** - No waiting for encryption
- **Fast chat experience** - Immediate message display
- **Status updates** - Real-time delivery confirmations

### ✅ **Message Linking**
- **Reliable linking** - Uses client_message_id for precise message identification
- **Status synchronization** - Server and local status stay in sync
- **Timestamp accuracy** - Server timestamps used for proper sorting

## Code Flow Summary

```typescript
// 1. User types message
const content = "Hello, how are you?";

// 2. Generate local ID and save plain text to database
const clientMessageId = generateUUID();
await this.saveOutgoingMessage(clientMessageId, chatId, content, userId);

// 3. Show plain text in chat screen (immediate)
this.emitMessage(messageEntity); // Shows: "Hello, how are you?" with ⏳ status

// 4. Encrypt for websocket transmission
const encrypted = encryptionService.encryptMessage(content);

// 5. Send encrypted via websocket with client_message_id
await invoke('send_socket_message', { 
  message: JSON.stringify({
    type: "chat",
    message: {
      chat_id: chatId,
      content: encrypted, // Encrypted: "base64_encrypted_string"
      sender_id: senderId
    },
    client_message_id: clientMessageId // ← LOCAL ID for linking
  })
});

// 6. Server responds with status update containing client_message_id
// 7. MessageLinkingManager finds local message by client_message_id
// 8. Updates message_id and status in database
// 9. UI refreshes to show updated checkmarks
```

## Verification Points

### 🔍 **Check Database Content**
```typescript
// Database should contain plain text
const message = await databaseServiceAsync.getMessageById(messageId);
console.log("Database content:", message.content); // Should be: "Hello, how are you?"
```

### 🔍 **Check UI Display**
```typescript
// Chat screen should show plain text
// Message appears as: "Hello, how are you?"
// Not as: "base64_encrypted_string"
```

### 🔍 **Check Message Linking**
```typescript
// Local message should be linked to server message
const localMessage = await databaseServiceAsync.getMessageByClientId(clientMessageId);
console.log("Linked message:", localMessage.message_id); // Should be server ID
```

### 🔍 **Check Status Updates**
```typescript
// Message status should update from pending → sent → delivered → read
const message = await databaseServiceAsync.getMessageById(messageId);
console.log("Message status:", {
  is_sent: message.is_sent,
  is_delivered: message.is_delivered,
  is_read: message.is_read
});
```

## Summary

The implementation correctly follows your requirement:
1. **Generate local client_message_id** ✅
2. **Save plain text to database** ✅
3. **Show plain text in chat screen** ✅
4. **Encrypt for websocket transmission** ✅
5. **Send encrypted via websocket** ✅
6. **Handle server status updates** ✅
7. **Link messages using client_message_id** ✅
8. **Update status and refresh UI** ✅

This creates the optimal user experience where:
- **Messages appear instantly** in chat (no encryption delays)
- **Database stores plain text** for fast retrieval
- **Security maintained** during transmission (encrypted websocket)
- **Message linking works reliably** using client_message_id
- **Status updates show real-time** delivery confirmations
- **UI refreshes automatically** to show updated checkmarks
