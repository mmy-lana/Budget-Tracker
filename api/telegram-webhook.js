module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.method === 'GET') {
    return res.status(200).json({ status: 'active', message: 'Telegram Webhook Live' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const update = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const message = update.message || update.edited_message;

    if (!message) {
      return res.status(200).json({ status: 'ok', detail: 'No message payload' });
    }

    const chatId = String(message.chat.id);
    const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || process.env.NG_APP_TELEGRAM_BOT_TOKEN || '';
    const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || process.env.NG_APP_FIREBASE_PROJECT_ID || 'positive-harbor-723';

    // Rule 1: IGNORE raw image inputs (do not write 0 IDR entries to Firestore)
    if (message.photo && (!message.caption || message.caption.trim() === '')) {
      if (TELEGRAM_BOT_TOKEN) {
        await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: '📷 *Image received.* Please send a text description with price to log an expense (e.g., `Pecel ayam 2 total 50rb`).'
          })
        });
      }
      return res.status(200).json({ status: 'image_ignored_without_text' });
    }

    const rawText = (message.text || message.caption || '').replace(/['"]/g, '').trim();

    if (rawText.startsWith('/') || rawText.toLowerCase() === 'ping') {
      if (TELEGRAM_BOT_TOKEN) {
        await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: '👋 *Budget Tracker Bot Online!*\nSend expenses like: `Pecel ayam 2 total 50rb` or `Kopi 25rb`',
            parse_mode: 'Markdown'
          })
        });
      }
      return res.status(200).json({ status: 'command_handled' });
    }

    const isConfirmation = /^(yes|ya|yep|confirm|correct|setuju)/i.test(rawText) || /correct for ID\d+/i.test(rawText);

    // Rule 2: 2-Step Interactive Text Parsing - Confirmation Step
    if (isConfirmation) {
      const pendingUrl = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/pending_telegram?pageSize=10`;
      const pRes = await fetch(pendingUrl);
      const pData = await pRes.json();

      let matchedDoc = null;
      if (pData.documents && pData.documents.length > 0) {
        for (const doc of pData.documents) {
          const fields = doc.fields || {};
          if (fields.chatId?.stringValue === chatId) {
            matchedDoc = doc;
            break;
          }
        }
      }

      if (matchedDoc) {
        const fields = matchedDoc.fields;
        const pendingId = fields.pendingId?.stringValue || 'ID000';
        const title = fields.title?.stringValue || 'Expense';
        const amount = Number(fields.totalAmount?.doubleValue || fields.totalAmount?.integerValue || 0);
        const quantity = Number(fields.quantity?.integerValue || 1);
        const unitPrice = Number(fields.unitPrice?.doubleValue || fields.unitPrice?.integerValue || amount);
        const category = fields.category?.stringValue || 'food';
        const subCategory = fields.subCategory?.stringValue || 'resto_dining';

        // Write Parent Transaction & Line Item to Firestore
        const expensesUrl = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/expenses`;
        await fetch(expensesUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fields: {
              title: { stringValue: title },
              amount: { doubleValue: amount },
              quantity: { integerValue: quantity },
              unitPrice: { doubleValue: unitPrice },
              category: { stringValue: category },
              subCategory: { stringValue: subCategory },
              date: { stringValue: new Date().toISOString().split('T')[0] },
              paymentMethod: { stringValue: 'qris' },
              createdBy: { stringValue: `telegram_${chatId}` },
              createdAt: { integerValue: Date.now() },
              updatedAt: { integerValue: Date.now() }
            }
          })
        });

        // Delete pending document
        await fetch(`https://firestore.googleapis.com/v1/${matchedDoc.name}`, { method: 'DELETE' });

        if (TELEGRAM_BOT_TOKEN) {
          const confirmMsg = `✅ *Expense Confirmed & Recorded!* [${pendingId}]\n\n📌 *Item:* ${title}\n📦 *Qty:* ${quantity}\n💰 *Price:* Rp ${unitPrice.toLocaleString('id-ID')}\n💵 *Total:* Rp ${amount.toLocaleString('id-ID')}`;
          await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: chatId, text: confirmMsg, parse_mode: 'Markdown' })
          });
        }

        return res.status(200).json({ success: true, confirmed: true, pendingId });
      } else {
        if (TELEGRAM_BOT_TOKEN) {
          await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: chatId, text: '⚠️ No pending expense found to confirm. Please send an expense description first.' })
          });
        }
        return res.status(200).json({ status: 'no_pending_found' });
      }
    }

    // New Expense Parsing & Prompt Confirmation Creation
    const amountMatch = rawText.match(/(\d+[\d\.]*)\s*(rupiah|rb|k|idr)?/i);
    let totalAmount = 0;
    if (amountMatch) {
      let rawNum = parseFloat(amountMatch[1].replace(/\./g, ''));
      const unit = (amountMatch[2] || '').toLowerCase();
      if (unit === 'rb' || unit === 'k') rawNum *= 1000;
      totalAmount = rawNum;
    }

    if (totalAmount <= 0) {
      if (TELEGRAM_BOT_TOKEN) {
        await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: chatId, text: '❓ Could not detect expense amount. Example: `Pecel ayam 2 total 50rb`' })
        });
      }
      return res.status(200).json({ status: 'invalid_amount' });
    }

    let quantity = 1;
    const qtyMatch = rawText.match(/(\d+)\s*(pcs|pack|botol|porsi|buah|ikat|cups)?/i) || rawText.match(/(total|qty|jumlah)\s+(\d+)/i);
    if (qtyMatch) {
      const qVal = parseInt(qtyMatch[1] || qtyMatch[2], 10);
      if (qVal > 0 && qVal < 100) quantity = qVal;
    }

    const unitPrice = totalAmount / quantity;

    let category = 'food';
    let subCategory = 'resto_dining';
    if (/kopi|coffee|cafe/i.test(rawText)) subCategory = 'cafe_coffee';
    else if (/gofood|grabfood|shopeefood/i.test(rawText)) subCategory = 'online_delivery';
    else if (/beras|minyak|sayur|buah|daging|telur/i.test(rawText)) subCategory = 'ingredients';
    else if (/snack|cemilan|biskuit/i.test(rawText)) subCategory = 'snacks';
    else if (/bioskop|movie|nonton|film/i.test(rawText)) { category = 'entertainment'; subCategory = 'movies_theater'; }
    else if (/bensin|pertamax|parkir/i.test(rawText)) { category = 'vehicle'; subCategory = 'vehicle'; }
    else if (/wifi|listrik|ipl|pulsa/i.test(rawText)) { category = 'fixed'; subCategory = 'fixed'; }

    const title = rawText
      .replace(/(\d+[\d\.]*)\s*(rupiah|rb|k|idr)?/gi, '')
      .replace(/total|qty|jumlah/gi, '')
      .replace(/(\d+)\s*(pcs|pack|botol|porsi|buah|ikat|cups)?/gi, '')
      .trim() || 'Purchased Item';

    const shortId = `ID${Math.floor(100 + Math.random() * 900)}`;

    // Store in Pending Collection
    const pendingStoreUrl = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/pending_telegram`;
    await fetch(pendingStoreUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fields: {
          pendingId: { stringValue: shortId },
          chatId: { stringValue: chatId },
          title: { stringValue: title },
          quantity: { integerValue: quantity },
          unitPrice: { doubleValue: unitPrice },
          totalAmount: { doubleValue: totalAmount },
          category: { stringValue: category },
          subCategory: { stringValue: subCategory },
          createdAt: { integerValue: Date.now() }
        }
      })
    });

    if (TELEGRAM_BOT_TOKEN) {
      const promptMsg = `📌 [${shortId}] *Pending Entry:* '${title}' | Qty: ${quantity} | Price: Rp ${unitPrice.toLocaleString('id-ID')} | Total: Rp ${totalAmount.toLocaleString('id-ID')}.\n\nReply *'correct for ${shortId}'* or *'yes'* to save.`;
      await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: promptMsg,
          parse_mode: 'Markdown'
        })
      });
    }

    return res.status(200).json({ pendingId: shortId, title, totalAmount, quantity });
  } catch (err) {
    return res.status(200).json({ error: String(err) });
  }
};