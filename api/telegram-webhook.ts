// @ts-nocheck
/* cspell:disable */
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  try {
    const TELEGRAM_BOT_TOKEN = process.env['NG_APP_TELEGRAM_BOT_TOKEN'] || process.env['TELEGRAM_BOT_TOKEN'] || '';
    const ALLOWED_CHAT_IDS = (process.env['NG_APP_TELEGRAM_AUTHORIZED_CHAT_IDS'] || process.env['TELEGRAM_AUTHORIZED_CHAT_IDS'] || '').split(',');
    const FIREBASE_PROJECT_ID = process.env['NG_APP_FIREBASE_PROJECT_ID'] || process.env['FIREBASE_PROJECT_ID'] || 'positive-harbor-723';

    const update = req.body;
    const message = update?.message;

    if (!message) {
      return res.status(200).send('OK');
    }

    const chatId = String(message.chat.id);
    if (ALLOWED_CHAT_IDS.length > 0 && ALLOWED_CHAT_IDS[0] !== '' && !ALLOWED_CHAT_IDS.includes(chatId)) {
      await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text: '⛔ Unauthorized user. Access restricted.' })
      });
      return res.status(200).send('Unauthorized');
    }

    const rawText = message.text || message.caption || '';
    const amountMatch = rawText.match(/(\d+[\d\.]*)\s*(rupiah|rb|k|idr)?/i);
    let amount = 0;
    if (amountMatch) {
      let rawNum = parseFloat(amountMatch[1].replace(/\./g, ''));
      const unit = (amountMatch[2] || '').toLowerCase();
      if (unit === 'rb' || unit === 'k') rawNum *= 1000;
      amount = rawNum;
    }

    const qtyMatch = rawText.match(/(\d+)\s*(cups|pcs|pack|botol|porsi|buah|ikat)/i);
    const quantity = qtyMatch ? parseInt(qtyMatch[1], 10) : 1;

    let category = 'food';
    if (/wifi|listrik|ipl|pulsa|kuota|laundry/i.test(rawText)) category = 'fixed';
    else if (/bensin|pertamax|parkir/i.test(rawText)) category = 'vehicle';

    const title = rawText
      .replace(/(\d+[\d\.]*)\s*(rupiah|rb|k|idr)?/gi, '')
      .replace(/(\d+)\s*(cups|pcs|pack|botol|porsi|buah|ikat)/gi, '')
      .trim() || 'Telegram Purchase';

    // Store expense in Firestore REST API
    const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/expenses`;
    await fetch(firestoreUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fields: {
          title: { stringValue: title },
          amount: { doubleValue: amount },
          quantity: { integerValue: quantity },
          category: { stringValue: category },
          date: { stringValue: new Date().toISOString().split('T')[0] },
          paymentMethod: { stringValue: 'qris' },
          createdBy: { stringValue: `telegram_${chatId}` },
          createdAt: { integerValue: Date.now() },
          updatedAt: { integerValue: Date.now() }
        }
      })
    });

    // Reply to Telegram Chat
    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: `✅ *Expense Recorded!*\n\n📌 *Item:* ${title}\n💰 *Amount:* Rp ${amount.toLocaleString('id-ID')}\n📦 *Qty:* ${quantity}\n🏷️ *Category:* ${category.toUpperCase()}`,
        parse_mode: 'Markdown'
      })
    });

    return res.status(200).json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}