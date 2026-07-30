// @ts-nocheck
/* cspell:disable */
declare const Deno: any;

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN") || "";
const ALLOWED_CHAT_IDS = (Deno.env.get("TELEGRAM_AUTHORIZED_CHAT_IDS") || "").split(",");
const FIREBASE_PROJECT_ID = Deno.env.get("FIREBASE_PROJECT_ID") || "positive-harbor-723";

interface TelegramMessage {
  message_id: number;
  chat: { id: number };
  text?: string;
  caption?: string;
  photo?: Array<{ file_id: string; file_size: number }>;
  date: number;
}

serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  try {
    const update = await req.json();
    const message: TelegramMessage = update.message;

    if (!message) {
      return new Response("No message payload", { status: 200 });
    }

    const chatId = String(message.chat.id);
    if (ALLOWED_CHAT_IDS.length > 0 && !ALLOWED_CHAT_IDS.includes(chatId)) {
      await sendTelegramMessage(chatId, "⛔ Unauthorized user. Access restricted.");
      return new Response("Unauthorized", { status: 200 });
    }

    const rawText = message.text || message.caption || "";
    let photoFileId = "";

    if (message.photo && message.photo.length > 0) {
      const largestPhoto = message.photo.reduce((prev, curr) => 
        (curr.file_size > prev.file_size) ? curr : prev
      );
      photoFileId = largestPhoto.file_id;
    }

    const parsedExpense = parseExpenseText(rawText);

    if (parsedExpense.amount <= 0 && !photoFileId) {
      await sendTelegramMessage(
        chatId, 
        "❓ Could not detect expense amount. Example: *buy coffee 25000 for 2 cups*"
      );
      return new Response("Ignored invalid expense", { status: 200 });
    }

    const record = {
      title: parsedExpense.title || "Telegram Purchase",
      amount: parsedExpense.amount,
      quantity: parsedExpense.quantity,
      category: parsedExpense.category,
      date: new Date().toISOString().split('T')[0],
      paymentMethod: "qris",
      createdBy: `telegram_${chatId}`,
      receiptImageUrl: photoFileId ? `https://api.telegram.org/file/bot${TELEGRAM_BOT_TOKEN}/${photoFileId}` : "",
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/expenses`;
    
    await fetch(firestoreUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fields: {
          title: { stringValue: record.title },
          amount: { doubleValue: record.amount },
          quantity: { integerValue: record.quantity },
          category: { stringValue: record.category },
          date: { stringValue: record.date },
          paymentMethod: { stringValue: record.paymentMethod },
          createdBy: { stringValue: record.createdBy },
          receiptImageUrl: { stringValue: record.receiptImageUrl },
          createdAt: { integerValue: record.createdAt },
          updatedAt: { integerValue: record.updatedAt }
        }
      })
    });

    const replyMsg = `✅ *Expense Recorded!*\n\n📌 *Item:* ${record.title}\n💰 *Amount:* Rp ${record.amount.toLocaleString("id-ID")}\n📦 *Qty:* ${record.quantity}\n🏷️ *Category:* ${record.category.toUpperCase()}`;
    await sendTelegramMessage(chatId, replyMsg);

    return new Response(JSON.stringify({ success: true }), { 
      headers: { "Content-Type": "application/json" },
      status: 200 
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
});

function parseExpenseText(text: string) {
  const clean = text.toLowerCase();
  
  const amountMatch = clean.match(/(\d+[\d\.]*)\s*(rupiah|rb|k|idr)?/i);
  let amount = 0;
  if (amountMatch) {
    let rawNum = parseFloat(amountMatch[1].replace(/\./g, ''));
    const unit = (amountMatch[2] || '').toLowerCase();
    if (unit === 'rb' || unit === 'k') rawNum *= 1000;
    amount = rawNum;
  }

  const qtyMatch = clean.match(/(\d+)\s*(cups|pcs|pack|botol|porsi|buah|ikat)/i);
  const quantity = qtyMatch ? parseInt(qtyMatch[1], 10) : 1;

  let category = "daily";
  if (/kopi|coffee|makan|nasi|ayam|ikan|buah|pisang|alpukat|beras|cabai|bawang/i.test(clean)) {
    category = "food";
  } else if (/wifi|listrik|ipl|pulsa|kuota|laundry|gas|catridge|service/i.test(clean)) {
    category = "fixed";
  } else if (/bensin|pertamax|parkir|toll/i.test(clean)) {
    category = "vehicle";
  }

  const title = text
    .replace(/(\d+[\d\.]*)\s*(rupiah|rb|k|idr)?/gi, '')
    .replace(/(\d+)\s*(cups|pcs|pack|botol|porsi|buah|ikat)/gi, '')
    .trim() || "Expense";

  return { title, amount, quantity, category };
}

async function sendTelegramMessage(chatId: string, text: string) {
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "Markdown" })
  });
}