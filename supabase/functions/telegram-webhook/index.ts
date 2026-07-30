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
    if (ALLOWED_CHAT_IDS.length > 0 && ALLOWED_CHAT_IDS[0] !== "" && !ALLOWED_CHAT_IDS.includes(chatId)) {
      await sendTelegramMessage(chatId, "⛔ Unauthorized user. Access restricted.");
      return new Response("Unauthorized", { status: 200 });
    }

    // Rule 1: IGNORE raw image inputs (do not write 0 IDR entries)
    if (message.photo && (!message.caption || message.caption.trim() === "")) {
      await sendTelegramMessage(chatId, "📷 Image received. Please send text description with price to log expense.");
      return new Response("Image ignored without text", { status: 200 });
    }

    const rawText = message.text || message.caption || "";
    const isCancellation = /^(cancel|batal|no|discard|hapus)/i.test(rawText);
    const isConfirmation = /^(yes|ya|yep|confirm|correct|setuju)/i.test(rawText) || /correct for ID\d+/i.test(rawText);

    const FIREBASE_API_KEY = Deno.env.get("FIREBASE_API_KEY") || Deno.env.get("NG_APP_FIREBASE_API_KEY") || "";
    const apiKeyParam = FIREBASE_API_KEY ? `?key=${FIREBASE_API_KEY}` : "";
    const pendingDocUrl = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/pending_telegram/${chatId}${apiKeyParam}`;
    const expensesUrl = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/expenses${apiKeyParam}`;

    if (isCancellation) {
      await fetch(pendingDocUrl, { method: 'DELETE' });
      await sendTelegramMessage(chatId, "❌ *Pending entry cancelled.* Send a new expense description whenever you're ready.");
      return new Response("Cancelled", { status: 200 });
    }

    if (isConfirmation) {
      const pRes = await fetch(pendingDocUrl);

      if (pRes.ok) {
        const pData = await pRes.json();
        const fields = pData.fields || {};
        const pendingId = fields.pendingId?.stringValue || 'ID000';
        const title = fields.title?.stringValue || 'Expense';
        const amount = Number(fields.totalAmount?.doubleValue || fields.totalAmount?.integerValue || 0);
        const quantity = Number(fields.quantity?.integerValue || 1);
        const unitPrice = Number(fields.unitPrice?.doubleValue || fields.unitPrice?.integerValue || amount);

        await fetch(expensesUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fields: {
              title: { stringValue: title },
              amount: { doubleValue: amount },
              quantity: { integerValue: quantity },
              unitPrice: { doubleValue: unitPrice },
              category: { stringValue: fields.category?.stringValue || "food" },
              subCategory: { stringValue: fields.subCategory?.stringValue || "resto_dining" },
              date: { stringValue: new Date().toISOString().split('T')[0] },
              paymentMethod: { stringValue: "qris" },
              createdBy: { stringValue: `telegram_${chatId}` },
              createdAt: { integerValue: Date.now() },
              updatedAt: { integerValue: Date.now() }
            }
          })
        });

        await fetch(pendingDocUrl, { method: 'DELETE' });

        await sendTelegramMessage(chatId, `✅ *Expense Recorded!* [${pendingId}]\n📌 *Item:* ${title}\n📦 *Qty:* ${quantity}\n💰 *Price:* Rp ${unitPrice.toLocaleString("id-ID")}\n💵 *Total:* Rp ${amount.toLocaleString("id-ID")}`);
        return new Response(JSON.stringify({ success: true, confirmed: true }), { status: 200 });
      } else {
        await sendTelegramMessage(chatId, "⚠️ No pending expense found to confirm.");
        return new Response("No pending entry", { status: 200 });
      }
    }

    const parsedExpense = parseExpenseText(rawText);
    if (parsedExpense.amount <= 0) {
      await sendTelegramMessage(chatId, "❓ Could not detect expense amount. Example: *Pecel ayam 2 total 50rb* or *Pecel ayam 2, 50k*");
      return new Response("Ignored invalid expense", { status: 200 });
    }

    const shortId = `ID${Math.floor(100 + Math.random() * 900)}`;
    await fetch(pendingDocUrl, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fields: {
          pendingId: { stringValue: shortId },
          chatId: { stringValue: chatId },
          title: { stringValue: parsedExpense.title },
          quantity: { integerValue: parsedExpense.quantity },
          unitPrice: { doubleValue: parsedExpense.unitPrice },
          totalAmount: { doubleValue: parsedExpense.amount },
          category: { stringValue: parsedExpense.category },
          subCategory: { stringValue: parsedExpense.subCategory },
          createdAt: { integerValue: Date.now() }
        }
      })
    });

    const promptMsg = `📌 [${shortId}] *Pending Entry:* '${parsedExpense.title}' | Qty: ${parsedExpense.quantity} | Price: Rp ${parsedExpense.unitPrice.toLocaleString('id-ID')} | Total: Rp ${parsedExpense.amount.toLocaleString('id-ID')}.\n\nReply *'correct for ${shortId}'* or *'yes'* to save.`;
    await sendTelegramMessage(chatId, promptMsg);

    return new Response(JSON.stringify({ success: true, pendingId: shortId }), { status: 200 });
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