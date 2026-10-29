import mongoose from 'mongoose';
import { config } from '../src/config.js';
import { Message } from '../src/models.js';

// Safe additive migration: create sender-scoped idempotency first, then remove the older
// conversation-wide index that could reject two different users reusing the same client ID.
async function main() {
  await mongoose.connect(config.MONGODB_URI, { autoIndex: false, serverSelectionTimeoutMS: 8000 });
  const collection = Message.collection;
  const indexes = await collection.indexes();
  const targetKey = { conversation: 1, sender: 1, clientMessageId: 1 };
  const targetExists = indexes.some(index => JSON.stringify(index.key) === JSON.stringify(targetKey) && index.unique === true);
  if (!targetExists) {
    await collection.createIndex(targetKey, { unique: true, name: 'conversation_1_sender_1_clientMessageId_1' });
    console.log('Created sender-scoped message idempotency index.');
  } else {
    console.log('Sender-scoped message idempotency index already exists.');
  }
  const legacy = indexes.find(index => JSON.stringify(index.key) === JSON.stringify({ conversation: 1, clientMessageId: 1 }) && index.unique === true);
  if (legacy) {
    await collection.dropIndex(legacy.name);
    console.log(`Removed legacy index ${legacy.name}.`);
  } else {
    console.log('No legacy conversation-wide idempotency index found.');
  }
}

main().catch(error => {
  console.error('Message idempotency index migration failed:', error.message);
  process.exitCode = 1;
}).finally(async () => {
  await mongoose.disconnect().catch(() => {});
});
