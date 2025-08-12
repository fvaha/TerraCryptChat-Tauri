# Received Message Flow - Step by Step

## Complete Flow for Incoming Messages

```
📨 ENCRYPTED MESSAGE RECEIVED
         ↓
🔓 DECRYPT MESSAGE CONTENT
         ↓
💾 SAVE DECRYPTED TO DATABASE
         ↓
📱 SHOW DECRYPTED IN CHAT SCREEN
```

## Detailed Implementation

### 1. 📨 **Message Received (Encrypted)**
```typescript
// In handleChatMessage()
const { message_id, client_message_id, chat_id, content, sender_id, sent_at, sender_name, reply_to_message_id } = payload;

console.log("[MessageService] - Raw encrypted content:", content);
console.log("[MessageService] - Content type:", typeof content);
console.log("[MessageService] - Content length:", content.length);
```

### 2. 🔓 **Decrypt Message Content**
```typescript
// Decrypt the encrypted content received from websocket
console.log("[MessageService] Attempting to decrypt message...");
let decryptedContent = encryptionService.decryptMessage(content);
console.log("[MessageService] - Decrypted content:", decryptedContent);
console.log("[MessageService] - Decryption successful:", decryptedContent !== content);

// Handle decryption failure gracefully
if (decryptedContent === content) {
  decryptedContent = content + " -*";
  console.log("[MessageService] Decryption failed, using encrypted content with marker");
}
```

### 3. 💾 **Save Decrypted to Database**
```typescript
// Store the DECRYPTED content in database
await this.saveIncomingMessage(
  message_id,
  client_message_id,
  chat_id,
  decryptedContent, // ← DECRYPTED content stored here
  sender_id,
  sent_at,
  sender_name || sender_id,
  reply_to_message_id
);

// In saveIncomingMessage():
const messageForDb = {
  // ... other fields ...
  content: content, // ← DECRYPTED content stored in database
  // ... other fields ...
};

await databaseServiceAsync.insertMessage(messageForDb);
```

### 4. 📱 **Show Decrypted in Chat Screen**
```typescript
// When retrieving messages from database (no decryption needed)
async getMessages(chatId: string, limit: number = 50, before?: string): Promise<MessageEntity[]> {
  // Get messages from database (they are stored decrypted)
  const messages = await databaseServiceAsync.getMessagesForChat(chatId);
  
  // Convert to MessageEntity - no decryption needed since content is already decrypted
  const decryptedMessages: MessageEntity[] = messages.map(msg => {
    return {
      // ... other fields ...
      content: msg.content, // ← Content is already decrypted in database
      // ... other fields ...
    };
  });
  
  return decryptedMessages;
}

// Emit message to UI (already decrypted)
this.emitMessage(messageEntity);
```

## Key Benefits of This Flow

### ✅ **Performance**
- **No repeated decryption** - Message is decrypted only once when received
- **Instant display** - Messages appear immediately from database
- **Efficient retrieval** - No processing needed when loading chat history

### ✅ **Security**
- **End-to-end encryption** maintained during transmission
- **Decrypted only once** at the receiving end
- **Secure storage** in local database (consider additional database encryption if needed)

### ✅ **User Experience**
- **Fast message loading** - No delays from decryption
- **Smooth scrolling** through chat history
- **Real-time updates** without performance impact

## Verification Points

### 🔍 **Check Database Content**
```typescript
// Messages in database should contain readable (decrypted) text
const message = await databaseServiceAsync.getMessageById(messageId);
console.log("Database content:", message.content); // Should be readable text
```

### 🔍 **Check UI Display**
```typescript
// Messages in chat screen should display readable text
const messages = await messageService.getMessages(chatId);
messages.forEach(msg => {
  console.log("UI message:", msg.content); // Should be readable text
});
```

### 🔍 **Check Transmission**
```typescript
// Only websocket transmission should contain encrypted content
// Database and UI should contain decrypted content
```

## Summary

The implementation correctly follows your requirement:
1. **Receive encrypted message** ✅
2. **Decrypt it** ✅  
3. **Save decrypted to database** ✅
4. **Show decrypted in chat screen** ✅

This creates a fast, secure, and user-friendly message handling system where encryption/decryption only happens when necessary for transmission, not for every display operation.
