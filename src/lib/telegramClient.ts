// src/lib/telegramClient.ts
import { TelegramClient } from 'telegram';
import { StringSession } from 'telegram/sessions/index.js';

let clientPromise: Promise<TelegramClient> | null = null;

export function getTelegramClient(): Promise<TelegramClient> {
  if (!clientPromise) {
    clientPromise = (async () => {
      const apiId = Number(process.env.TG_API_ID);
      const apiHash = process.env.TG_API_HASH ?? '';
      const botToken = process.env.PORTAL_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN || '';
      const savedSession = process.env.TG_BOT_SESSION ?? '';
      if (!apiId || !apiHash || !botToken) {
        throw new Error('TG_API_ID/TG_API_HASH/PORTAL_BOT_TOKEN не заданы');
      }
      const client = new TelegramClient(new StringSession(savedSession), apiId, apiHash, {
        connectionRetries: 5,
      });
      await client.start({ botAuthToken: botToken });
      return client;
    })();
  }
  return clientPromise;
}
