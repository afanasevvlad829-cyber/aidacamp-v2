// scripts/spike-gramjs-login.mjs
//
// Спайк: подтвердить, что TG_API_ID/TG_API_HASH/BOT_TOKEN дают рабочий
// MTProto-логин через GramJS. Одноразовый скрипт для проверки, не модуль.
//
// Запуск:
//   TG_API_ID=<id> TG_API_HASH=<hash> PORTAL_BOT_TOKEN=<token> node scripts/spike-gramjs-login.mjs

import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions/index.js";

const apiId = Number(process.env.TG_API_ID);
const apiHash = process.env.TG_API_HASH;
const botToken = process.env.PORTAL_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN;

if (!apiId || !apiHash || !botToken) {
  console.error("Нужны TG_API_ID, TG_API_HASH, PORTAL_BOT_TOKEN/TELEGRAM_BOT_TOKEN в env");
  process.exit(1);
}

const client = new TelegramClient(new StringSession(""), apiId, apiHash, {
  connectionRetries: 5,
});

await client.start({ botAuthToken: botToken });
console.log("Session string (сохранить для повторных запусков):");
console.log(client.session.save());

const me = await client.getMe();
console.log("Бот залогинен как:", me.username, me.id);

await client.disconnect();
