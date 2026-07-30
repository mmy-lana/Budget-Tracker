// In-memory cache for fast serverless state retention
const pendingCache = new Map();

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
    const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY || process.env.NG_APP_FIREBASE_API_KEY || '';
    const apiKeyParam = FIREBASE_API_KEY ? `?key=${FIREBASE_API_KEY}` : '';

    const pendingDocUrl = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/pending_telegram/${chatId}${apiKeyParam}`;
    const pendingCollectionUrl = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/pending_telegram?documentId=${chatId}${FIREBASE_API_KEY ? '&key=' + FIREBASE_API_KEY : ''}`;
    const expensesUrl = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/expenses${apiKeyParam}`;

    // Rule 1: IGNORE raw image inputs
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
            text: '👋 *Budget Tracker Bot Online!*\nSend expenses like: `Pecel ayam 2 50k` or `Kopi 25rb`',
            parse_mode: 'Markdown'
          })
        });
      }
      return res.status(200).json({ status: 'command_handled' });
    }

    const isCancellation = /^(cancel|batal|no|discard|hapus)/i.test(rawText);
    const isConfirmation = /^(yes|ya|yep|confirm|correct|setuju)/i.test(rawText) || /correct for ID\d+/i.test(rawText);

    // Cancel Pending Entry
    if (isCancellation) {
      pendingCache.delete(chatId);
      await fetch(pendingDocUrl, { method: 'DELETE' });

      if (TELEGRAM_BOT_TOKEN) {
        await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: chatId, text: '❌ *Pending entry cancelled.* Send a new expense description whenever you\'re ready.', parse_mode: 'Markdown' })
        });
      }
      return res.status(200).json({ status: 'cancelled' });
    }

    // Confirmation Step
    if (isConfirmation) {
      let pendingData = pendingCache.get(chatId);

      // Fallback to Firestore if memory cache is empty
      if (!pendingData) {
        const pRes = await fetch(pendingDocUrl);
        if (pRes.ok) {
          const pDoc = await pRes.json();
          const fields = pDoc.fields || {};
          if (fields.pendingId) {
            pendingData = {
              pendingId: fields.pendingId.stringValue,
              title: fields.title?.stringValue || 'Expense',
              totalAmount: Number(fields.totalAmount?.doubleValue || fields.totalAmount?.integerValue || 0),
              quantity: Number(fields.quantity?.integerValue || 1),
              unitPrice: Number(fields.unitPrice?.doubleValue || fields.unitPrice?.integerValue || 0),
              category: fields.category?.stringValue || 'food',
              subCategory: fields.subCategory?.stringValue || 'resto_dining'
            };
          }
        }
      }

      if (pendingData) {
        const { pendingId, title, totalAmount, quantity, unitPrice, category, subCategory } = pendingData;

        // Write Expense Record to Firestore
        await fetch(expensesUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fields: {
              title: { stringValue: title },
              amount: { doubleValue: totalAmount },
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

        // Clean up pending state
        pendingCache.delete(chatId);
        await fetch(pendingDocUrl, { method: 'DELETE' });

        if (TELEGRAM_BOT_TOKEN) {
          const confirmMsg = `✅ *Expense Confirmed & Recorded!* [${pendingId}]\n\n📌 *Item:* ${title}\n📦 *Qty:* ${quantity}\n💰 *Price:* Rp ${unitPrice.toLocaleString('id-ID')}\n💵 *Total:* Rp ${totalAmount.toLocaleString('id-ID')}`;
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

    // Robust Amount & Quantity Parsing
    let totalAmount = 0;
    let quantity = 1;
    let amountMatchString = '';

    // Priority 1: Match numbers with explicit currency units (50k, 50rb, 50000 rupiah, total 50k, rp 50.000)
    const explicitAmountRegex = /(?:rp\.?\s*|total\s*)?(\d+[\d\.]*)\s*(rb|k|ribu|rupiah|idr)\b|(?:rp\.?\s*|total\s+)(\d+[\d\.]*)\b/gi;
    let amtMatch = explicitAmountRegex.exec(rawText);

    if (amtMatch) {
      amountMatchString = amtMatch[0];
      let numStr = (amtMatch[1] || amtMatch[3]).replace(/\./g, '');
      let num = parseFloat(numStr);
      let unit = (amtMatch[2] || '').toLowerCase();
      if (unit === 'rb' || unit === 'k' || unit === 'ribu') num *= 1000;
      totalAmount = num;
    } else {
      // Fallback: Standalone numbers >= 100 or largest number
      const numRegex = /(\d+[\d\.]*)/g;
      const numMatches = [];
      let m;
      while ((m = numRegex.exec(rawText)) !== null) {
        const val = parseFloat(m[1].replace(/\./g, ''));
        numMatches.push({ raw: m[0], val, index: m.index });
      }
      if (numMatches.length > 0) {
        const candidate = numMatches.reduce((max, cur) => cur.val > max.val ? cur : max, numMatches[0]);
        if (candidate.val >= 100) {
          totalAmount = candidate.val;
          amountMatchString = candidate.raw;
        }
      }
    }

    if (totalAmount <= 0) {
      if (TELEGRAM_BOT_TOKEN) {
        await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: chatId, text: '❓ Could not detect expense amount. Example: `Pecel ayam 2 total 50rb` or `Pecel ayam 2, 50k`', parse_mode: 'Markdown' })
        });
      }
      return res.status(200).json({ status: 'invalid_amount' });
    }

    // Remove amount string from text before parsing quantity
    let remainingText = rawText;
    if (amountMatchString) {
      remainingText = remainingText.replace(amountMatchString, ' ');
    }

    const qtyRegex = /(?:for|qty|jumlah|x)?\s*(\d+)\s*(pcs|pack|botol|porsi|buah|ikat|cups|x)?/i;
    const qtyMatch = remainingText.match(qtyRegex);
    let qtyMatchString = '';

    if (qtyMatch) {
      const qVal = parseInt(qtyMatch[1], 10);
      if (qVal > 0 && qVal < 100 && qVal !== totalAmount) {
        quantity = qVal;
        qtyMatchString = qtyMatch[0];
      }
    }

    if (qtyMatchString) {
      remainingText = remainingText.replace(qtyMatchString, ' ');
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

    const title = remainingText
      .replace(/^(buy|beli)\s+/i, '')
      .replace(/total/gi, '')
      .replace(/[,;:\-_]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim() || 'Purchased Item';

    const shortId = `ID${Math.floor(100 + Math.random() * 900)}`;

    const pendingPayload = {
      pendingId: shortId,
      chatId,
      title,
      quantity,
      unitPrice,
      totalAmount,
      category,
      subCategory,
      createdAt: Date.now()
    };

    // Save to in-memory map for instant lookup
    pendingCache.set(chatId, pendingPayload);

    // Save to Firestore (Delete old -> Create new with documentId=chatId)
    await fetch(pendingDocUrl, { method: 'DELETE' });
    await fetch(pendingCollectionUrl, {
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