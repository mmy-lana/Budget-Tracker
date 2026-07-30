// In-memory cache for fast serverless state retention
const pendingCache = new Map();

async function sendBotMessage(chatId, text, token) {
  if (!token) return;
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'Markdown' })
  });
}

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

    const rawText = (message.text || message.caption || '').replace(/['"]/g, '').trim();
    const cleanLower = rawText.toLowerCase();

    // 1. Bot Helper Command: /myid
    if (cleanLower === '/myid' || cleanLower === '/id') {
      await sendBotMessage(chatId, `🆔 *Your Telegram Chat ID:* \`${chatId}\`\n\nAdd this Chat ID to \`TELEGRAM_AUTHORIZED_CHAT_IDS\` in your environment variables.`, TELEGRAM_BOT_TOKEN);
      return res.status(200).json({ status: 'myid_replied', chatId });
    }

    // 2. Chat ID Whitelist Security Guard
    const allowedChatIds = (process.env.TELEGRAM_AUTHORIZED_CHAT_IDS || process.env.NG_APP_TELEGRAM_AUTHORIZED_CHAT_IDS || '').split(',').map(id => id.trim()).filter(Boolean);

    if (allowedChatIds.length > 0 && !allowedChatIds.includes(chatId)) {
      await sendBotMessage(chatId, '⛔ *Access Denied:* Your Telegram Chat ID is not authorized to log expenses on this Budget Tracker instance.', TELEGRAM_BOT_TOKEN);
      return res.status(200).json({ status: 'unauthorized_chat_id', chatId });
    }

    // 3. Help Menu Command
    if (cleanLower === 'help' || cleanLower === '/help' || cleanLower === '/start') {
      const helpMenu = `🤖 *BudgetTracker Bot Command Menu*\n\n📝 *Logging Expenses:*\n• \`Pecel ayam 2 total 50rb\` (Standard expense entry)\n• \`yes\` / \`correct for ID123\` (Confirm pending entry)\n• \`cancel\` (Discard pending entry)\n\n🤝 *Nalangin (Debts & Receivables):*\n• \`tagihan ilyas 50k pecel ayam\` (Log receivable)\n• \`hutang ilyas 50k pizza\` (Log payable)\n• \`tagihan ilyas ID888 lunas\` (Settle receivable & add expense)\n• \`hutang ilyas ID777 lunas\` (Settle payable)\n\n📊 *Queries & Reports:*\n• \`today expense\` / \`pengeluaran hari ini\`\n• \`list tagihan\` / \`list hutang\`\n• \`pending list\`\n• \`/myid\` (Get your Chat ID)`;
      await sendBotMessage(chatId, helpMenu, TELEGRAM_BOT_TOKEN);
      return res.status(200).json({ status: 'help_sent' });
    }

    function buildFirestoreUrl(collectionPath, queryParams = '') {
      let url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/${collectionPath}`;
      const params = [];
      if (FIREBASE_API_KEY) params.push(`key=${FIREBASE_API_KEY}`);
      if (queryParams) params.push(queryParams);
      if (params.length > 0) url += '?' + params.join('&');
      return url;
    }

    const pendingDocUrl = buildFirestoreUrl(`pending_telegram/${chatId}`);
    const pendingCollectionUrl = buildFirestoreUrl('pending_telegram', `documentId=${chatId}`);
    const expensesUrl = buildFirestoreUrl('expenses');
    const nalanginUrl = buildFirestoreUrl('nalangin_ledger');

    // Rule 1: IGNORE raw image inputs
    if (message.photo && (!message.caption || message.caption.trim() === '')) {
      await sendBotMessage(chatId, '📷 *Image received.* Please send a text description with price to log an expense (e.g., `Pecel ayam 2 total 50rb`).', TELEGRAM_BOT_TOKEN);
      return res.status(200).json({ status: 'image_ignored_without_text' });
    }

    // Command: pending list
    if (cleanLower === 'pending list') {
      let pendingData = pendingCache.get(chatId);
      if (!pendingData) {
        const pRes = await fetch(pendingDocUrl);
        if (pRes.ok) {
          const pDoc = await pRes.json();
          if (pDoc.fields?.pendingId) {
            pendingData = {
              pendingId: pDoc.fields.pendingId.stringValue,
              title: pDoc.fields.title?.stringValue,
              totalAmount: Number(pDoc.fields.totalAmount?.doubleValue || pDoc.fields.totalAmount?.integerValue || 0),
              quantity: Number(pDoc.fields.quantity?.integerValue || 1)
            };
          }
        }
      }

      if (pendingData) {
        await sendBotMessage(chatId, `📌 *Pending Entry Awaiting Confirmation:*\n\nID: *[${pendingData.pendingId}]*\nItem: ${pendingData.title}\nTotal: Rp ${pendingData.totalAmount.toLocaleString('id-ID')}\n\nReply \`yes\` or \`cancel\`.`, TELEGRAM_BOT_TOKEN);
      } else {
        await sendBotMessage(chatId, '✨ No pending expenses awaiting confirmation.', TELEGRAM_BOT_TOKEN);
      }
      return res.status(200).json({ status: 'pending_list_replied' });
    }

    // Command: today expense / pengeluaran hari ini
    if (cleanLower === 'today expense' || cleanLower === 'pengeluaran hari ini') {
      const today = new Date().toISOString().split('T')[0];
      const resExp = await fetch(buildFirestoreUrl('expenses', 'pageSize=50'));
      let todayTotal = 0;
      let itemListText = '';

      if (resExp.ok) {
        const data = await resExp.json();
        if (data.documents && data.documents.length > 0) {
          for (const doc of data.documents) {
            const f = doc.fields || {};
            if (f.date?.stringValue === today) {
              const itemTitle = f.title?.stringValue || 'Item';
              const itemAmt = Number(f.amount?.doubleValue || f.amount?.integerValue || 0);
              todayTotal += itemAmt;
              itemListText += `• *${itemTitle}*: Rp ${itemAmt.toLocaleString('id-ID')}\n`;
            }
          }
        }
      }

      const report = `📊 *Today's Expenses (${today})*\n\n${itemListText || 'No expenses logged today.\n'}\n💵 *Total Spent:* Rp ${todayTotal.toLocaleString('id-ID')}`;
      await sendBotMessage(chatId, report, TELEGRAM_BOT_TOKEN);
      return res.status(200).json({ status: 'today_expense_sent' });
    }

    // Command: list tagihan / list hutang / list nalangin
    if (/^list\s+(tagihan|hutang|nalangin)/i.test(cleanLower)) {
      const targetType = cleanLower.includes('tagihan') ? 'receivable' : cleanLower.includes('hutang') ? 'payable' : 'all';
      let listText = '';

      // Check nalangin_ledger collection
      const resNal = await fetch(buildFirestoreUrl('nalangin_ledger', 'pageSize=50'));
      if (resNal.ok) {
        const data = await resNal.json();
        if (data.documents && data.documents.length > 0) {
          for (const doc of data.documents) {
            const f = doc.fields || {};
            const st = f.status?.stringValue || 'pending';
            const type = f.type?.stringValue || 'receivable';

            if (st === 'pending' && (targetType === 'all' || type === targetType)) {
              const docId = doc.name.split('/').pop();
              const shortId = f.shortId?.stringValue || docId.substring(0, 6);
              const person = f.person?.stringValue || 'Person';
              const amt = Number(f.amount?.doubleValue || f.amount?.integerValue || 0);
              const notes = f.notes?.stringValue || '';
              const tag = type === 'receivable' ? 'Tagihan' : 'Hutang';
              listText += `• *[${shortId}]* ${tag} to *${person}*: Rp ${amt.toLocaleString('id-ID')} (${notes})\n`;
            }
          }
        }
      }

      // Check expenses collection for fallback entries
      const resExp = await fetch(buildFirestoreUrl('expenses', 'pageSize=50'));
      if (resExp.ok) {
        const dataExp = await resExp.json();
        if (dataExp.documents && dataExp.documents.length > 0) {
          for (const doc of dataExp.documents) {
            const f = doc.fields || {};
            const subCat = f.subCategory?.stringValue || '';
            const title = f.title?.stringValue || '';
            const isRec = subCat === 'receivable' || title.startsWith('[Tagihan]');
            const isPay = subCat === 'payable' || title.startsWith('[Hutang]');

            if (isRec || isPay) {
              const type = isRec ? 'receivable' : 'payable';
              if (targetType === 'all' || type === targetType) {
                const docId = doc.name.split('/').pop();
                const shortId = docId.substring(0, 6).toUpperCase();
                const personMatch = title.match(/\[(?:Tagihan|Hutang)\]\s*([^:]+):/i);
                const person = personMatch ? personMatch[1].trim() : 'Friend';
                const notes = title.replace(/\[(?:Tagihan|Hutang)\]\s*[^:]+:\s*/i, '');
                const amt = Number(f.amount?.doubleValue || f.amount?.integerValue || 0);
                const tag = isRec ? 'Tagihan' : 'Hutang';
                listText += `• *[${shortId}]* ${tag} to *${person}*: Rp ${amt.toLocaleString('id-ID')} (${notes})\n`;
              }
            }
          }
        }
      }

      const replyList = `🤝 *Pending Nalangin Ledger*\n\n${listText || 'No pending debts or receivables found.'}`;
      await sendBotMessage(chatId, replyList, TELEGRAM_BOT_TOKEN);
      return res.status(200).json({ status: 'nalangin_list_sent' });
    }

    // Command: Nalangin Settlement ("lunas")
    if (cleanLower.includes('lunas') && (cleanLower.includes('tagihan') || cleanLower.includes('hutang'))) {
      const isTagihan = cleanLower.includes('tagihan');
      const resNal = await fetch(`${nalanginUrl}&pageSize=50`);

      let targetDoc = null;
      if (resNal.ok) {
        const data = await resNal.json();
        if (data.documents && data.documents.length > 0) {
          for (const doc of data.documents) {
            const f = doc.fields || {};
            const st = f.status?.stringValue || 'pending';
            const type = f.type?.stringValue || 'receivable';
            const person = (f.person?.stringValue || '').toLowerCase();
            const shortId = (f.shortId?.stringValue || '').toLowerCase();

            if (st === 'pending' && type === (isTagihan ? 'receivable' : 'payable')) {
              if (cleanLower.includes(person) || cleanLower.includes(shortId) || data.documents.length === 1) {
                targetDoc = doc;
                break;
              }
            }
          }
        }
      }

      if (targetDoc) {
        const f = targetDoc.fields || {};
        const person = f.person?.stringValue || 'Person';
        const amt = Number(f.amount?.doubleValue || f.amount?.integerValue || 0);
        const notes = f.notes?.stringValue || 'Nalangin Item';
        const shortId = f.shortId?.stringValue || 'ID000';

        // Update Nalangin Status to Settled via PATCH
        const updateUrl = `https://firestore.googleapis.com/v1/${targetDoc.name}${apiKeyParam}&updateMask.fieldPaths=status&updateMask.fieldPaths=settledAt`;
        await fetch(updateUrl, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fields: {
              status: { stringValue: 'settled' },
              settledAt: { integerValue: String(Date.now()) }
            }
          })
        });

        if (isTagihan) {
          // Log expense entry under Bank Jago (Joint)
          await fetch(expensesUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fields: {
                title: { stringValue: `${notes} (${person})` },
                amount: { doubleValue: amt },
                quantity: { integerValue: '1' },
                unitPrice: { doubleValue: amt },
                category: { stringValue: 'food' },
                subCategory: { stringValue: 'resto_dining' },
                date: { stringValue: new Date().toISOString().split('T')[0] },
                paymentMethod: { stringValue: 'qris' },
                paymentAccountId: { stringValue: 'acc_jago' },
                createdBy: { stringValue: `telegram_${chatId}` },
                createdAt: { integerValue: String(Date.now()) },
                updatedAt: { integerValue: String(Date.now()) }
              }
            })
          });

          await sendBotMessage(chatId, `✅ *Receivable Settled!* [${shortId}] *${person}* paid Rp ${amt.toLocaleString('id-ID')} ('${notes}'). Recorded as expense under Bank Jago.`, TELEGRAM_BOT_TOKEN);
        } else {
          await sendBotMessage(chatId, `✅ *Payable Settled!* [${shortId}] Paid Rp ${amt.toLocaleString('id-ID')} to *${person}* from Bank Jago.`, TELEGRAM_BOT_TOKEN);
        }

        return res.status(200).json({ status: 'nalangin_settled' });
      } else {
        await sendBotMessage(chatId, '⚠️ Could not find matching pending nalangin item to settle.', TELEGRAM_BOT_TOKEN);
        return res.status(200).json({ status: 'nalangin_settle_failed' });
      }
    }

    // Command: Nalangin Creation (tagihan [Person] [Amount] [Notes] / hutang [Person] [Amount] [Notes])
    if (/^(tagihan|hutang)\s+/i.test(cleanLower)) {
      const isTagihan = cleanLower.startsWith('tagihan');
      const textWithoutPrefix = rawText.replace(/^(tagihan|hutang)\s+/i, '').trim();

      // Extract amount from text
      const amtMatch = textWithoutPrefix.match(/(\d+[\d\.]*)\s*(rb|k|ribu|rupiah|idr)?/i);
      let amount = 0;
      let amtRaw = '';
      if (amtMatch) {
        amtRaw = amtMatch[0];
        let numStr = amtMatch[1].replace(/\./g, '');
        let num = parseFloat(numStr);
        let unit = (amtMatch[2] || '').toLowerCase();
        if (unit === 'rb' || unit === 'k' || unit === 'ribu') num *= 1000;
        amount = num;
      }

      if (amount <= 0) {
        await sendBotMessage(chatId, '❓ Could not detect amount. Example: `tagihan ilyas 50k pecel ayam`', TELEGRAM_BOT_TOKEN);
        return res.status(200).json({ status: 'invalid_nalangin_amount' });
      }

      const remainingParts = textWithoutPrefix.replace(amtRaw, ' ').trim().split(/\s+/);
      const person = remainingParts[0] ? remainingParts[0].charAt(0).toUpperCase() + remainingParts[0].slice(1) : 'Friend';
      const notes = remainingParts.slice(1).join(' ') || 'Shared Purchase';
      const shortId = `ID${Math.floor(100 + Math.random() * 900)}`;

      // 1. Try writing to nalangin_ledger collection
      let postRes = await fetch(nalanginUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fields: {
            shortId: { stringValue: shortId },
            person: { stringValue: person },
            type: { stringValue: isTagihan ? 'receivable' : 'payable' },
            amount: { doubleValue: amount },
            date: { stringValue: new Date().toISOString().split('T')[0] },
            notes: { stringValue: notes },
            status: { stringValue: 'pending' },
            createdAt: { integerValue: String(Date.now()) }
          }
        })
      });

      // 2. Fallback to expenses collection if nalangin_ledger returns 403 (unpermitted collection rule)
      if (!postRes.ok) {
        const titleStr = isTagihan ? `[Tagihan] ${person}: ${notes}` : `[Hutang] ${person}: ${notes}`;
        postRes = await fetch(expensesUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fields: {
              title: { stringValue: titleStr },
              amount: { doubleValue: amount },
              quantity: { integerValue: '1' },
              unitPrice: { doubleValue: amount },
              category: { stringValue: 'other' },
              subCategory: { stringValue: isTagihan ? 'receivable' : 'payable' },
              storeName: { stringValue: `Nalangin: ${person}` },
              date: { stringValue: new Date().toISOString().split('T')[0] },
              paymentMethod: { stringValue: 'qris' },
              createdBy: { stringValue: `telegram_${chatId}` },
              createdAt: { integerValue: String(Date.now()) },
              updatedAt: { integerValue: String(Date.now()) }
            }
          })
        });
      }

      if (!postRes.ok) {
        const errText = await postRes.text();
        console.error('Firestore Nalangin POST Error:', errText);
        await sendBotMessage(chatId, `⚠️ Failed to save to database. Error ${postRes.status}`, TELEGRAM_BOT_TOKEN);
        return res.status(200).json({ error: errText });
      }

      if (isTagihan) {
        await sendBotMessage(chatId, `📌 *Receivable Logged!* [${shortId}] Tagihan to *${person}*: Rp ${amount.toLocaleString('id-ID')} for '${notes}'.\n_(Saved directly to Nalangin Ledger - no confirmation needed)_`, TELEGRAM_BOT_TOKEN);
      } else {
        await sendBotMessage(chatId, `📌 *Payable Logged!* [${shortId}] Hutang to *${person}*: Rp ${amount.toLocaleString('id-ID')} for '${notes}'.\n_(Saved directly to Nalangin Ledger - no confirmation needed)_`, TELEGRAM_BOT_TOKEN);
      }

      return res.status(200).json({ status: 'nalangin_created', shortId });
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
              quantity: { integerValue: String(quantity) },
              unitPrice: { doubleValue: unitPrice },
              category: { stringValue: category },
              subCategory: { stringValue: subCategory },
              date: { stringValue: new Date().toISOString().split('T')[0] },
              paymentMethod: { stringValue: 'qris' },
              createdBy: { stringValue: `telegram_${chatId}` },
              createdAt: { integerValue: String(Date.now()) },
              updatedAt: { integerValue: String(Date.now()) }
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
          quantity: { integerValue: String(quantity) },
          unitPrice: { doubleValue: unitPrice },
          totalAmount: { doubleValue: totalAmount },
          category: { stringValue: category },
          subCategory: { stringValue: subCategory },
          createdAt: { integerValue: String(Date.now()) }
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