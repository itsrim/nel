
import { serializeMessagesToCSV, deserializeCSVToMessages } from "../src/lib/chatPersistence";

const mockMessages = {
  "conv1": [
    { id: "m1", conversationId: "conv1", authorName: "Alice", text: "Hello", sentAt: Date.now() },
    { id: "m2", conversationId: "conv1", authorName: "Bob", text: "Hi, how are you?", sentAt: Date.now() - 1000 },
  ],
  "conv2": [
    { id: "m3", conversationId: "conv2", authorName: "Charlie", text: "Nice weather, right?", sentAt: Date.now() - 2000 },
  ]
};

// 1. Test Serialization
const csv = serializeMessagesToCSV(mockMessages);
console.log("--- Serialized CSV ---");
console.log(csv);

// 2. Test Deserialization
const messages = deserializeCSVToMessages(csv);
console.log("\n--- Deserialized Messages ---");
console.log(JSON.stringify(messages, null, 2));

// 3. Test escaping
const complexMessages = {
  "conv1": [
    { id: "m4", conversationId: "conv1", authorName: "Dave", text: 'Text with "quotes" and , comma\nand newline', sentAt: Date.now() }
  ]
};
const complexCSV = serializeMessagesToCSV(complexMessages);
console.log("\n--- Complex CSV ---");
console.log(complexCSV);
const complexMessagesResult = deserializeCSVToMessages(complexCSV);
console.log("\n--- Complex Deserialized ---");
console.log(JSON.stringify(complexMessagesResult, null, 2));

// 4. Test 7-day retention
const oldMessages = {
  "conv1": [
    { id: "m_old", conversationId: "conv1", authorName: "OldTimer", text: "I am ancient", sentAt: Date.now() - (8 * 24 * 60 * 60 * 1000) }
  ]
};
const oldCSV = serializeMessagesToCSV(oldMessages);
console.log("\n--- Old CSV (should be empty header) ---");
console.log(oldCSV);
