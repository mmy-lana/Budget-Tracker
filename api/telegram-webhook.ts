// @ts-nocheck
/* cspell:disable */

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(200).send('Telegram Webhook Endpoint Active');
  }

  try {
    const update = req.body;
    const message = update?.message || update?.edited_message;

    if (!message) {
      return res.status(200).send('No message payload');
    }

    const chatId = String(message.chat.id);
    const TELEGRAM_BOT_TOKEN = process.env['TELEGRAM_BOT_TOKEN'] || process.env['NG_APP_TELEGRAM_BOT_TOKEN'] || '';
    const FIREBASE_PROJECT_ID = process.env['FIREBASE_PROJECT_ID'] || process.env['NG_APP_FIREBASE_PROJECT_ID'] || 'positive-harbor-723';

    const rawText = message.text || message.caption || '';

    // Extract Amount
    const amountMatch = rawText.match(/(\d+[\d\.]*)\s*(rupiah|rb|k|idr)?/i);
    let amount = 0;
    if (amountMatch) {
      let rawNum = parseFloat(amountMatch[1].replace(/\./g, ''));
      const unit = (amountMatch[2] || '').toLowerCase();
      if (unit === 'rb' || unit === 'k') rawNum *= 1000;
      amount = rawNum;
    }

    // Extract Quantity
    const qtyMatch = rawText.match(/(\d+)\s*(cups|pcs|pack|botol|porsi|buah|ikat)/i);
    const quantity = qtyMatch ? parseInt(qtyMatch[1], 10) : 1;

    // Category Classification
    let category = 'food';
    if (/wifi|listrik|ipl|pulsa|kuota|laundry/i.test(rawText)) category = 'fixed';
    else if (/bensin|pertamax|parkir/i.test(rawText)) category = 'vehicle';

    const title = rawText
      .replace(/(\d+[\d\.]*)\s*(rupiah|rb|k|idr)?/gi, '')
      .replace(/(\d+)\s*(cups|pcs|pack|botol|porsi|buah|ikat)/gi, '')
      .replace(/^buy\s+/i, '')
      .replace(/^beli\s+/i, '')
      .trim() || 'Telegram Expense';

    // Store in Firestore Database REST API
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

    // Send instant confirmation reply to Telegram
    const replyText = `✅ *Expense Recorded to Website!*\n\n📌 *Item:* ${title}\n💰 *Amount:* Rp ${amount.toLocaleString('id-ID')}\n📦 *Quantity:* ${quantity}\n🏷️ *Category:* ${category.toUpperCase()}`;

    if (TELEGRAM_BOT_TOKEN) {
      await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: replyText,
          parse_mode: 'Markdown'
        })
      });
    }

    return res.status(200).json({ success: true, title, amount });
  } catch (err: any) {
    return res.status(200).json({ error: err.message });
  }
}