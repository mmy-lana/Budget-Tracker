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
    const rawText = (message.text || message.caption || "").replace(/['"]/g, '').trim();
    const cleanLower = rawText.toLowerCase();

    // Bot Helper Command: /myid
    if (cleanLower === "/myid" || cleanLower === "/id") {
      await sendTelegramMessage(chatId, `🆔 *Your Telegram Chat ID:* \`${chatId}\`\n\nAdd this Chat ID to \`TELEGRAM_AUTHORIZED_CHAT_IDS\` in your environment variables.`);
      return new Response("myid_replied", { status: 200 });
    }

    // Chat ID Whitelist Guard
    if (ALLOWED_CHAT_IDS.length > 0 && ALLOWED_CHAT_IDS[0] !== "" && !ALLOWED_CHAT_IDS.includes(chatId)) {
      await sendTelegramMessage(chatId, "⛔ *Access Denied:* Your Telegram Chat ID is not authorized to log expenses on this Budget Tracker instance.");
      return new Response("Unauthorized", { status: 200 });
    }

    // Help Menu Command
    if (cleanLower === "help" || cleanLower === "/help" || cleanLower === "/start") {
      const helpMenu = `🤖 *BudgetTracker Bot Command Menu*\n\n📝 *Logging Expenses:*\n• \`Pecel ayam 2 total 50rb\` (Standard expense entry)\n• \`yes\` / \`correct for ID123\` (Confirm pending entry)\n• \`cancel\` (Discard pending entry)\n\n🤝 *Nalangin (Debts & Receivables):*\n• \`tagihan ilyas 50k pecel ayam\` (Log receivable)\n• \`hutang ilyas 50k pizza\` (Log payable)\n• \`tagihan ilyas ID888 lunas\` (Settle receivable & add expense)\n• \`hutang ilyas ID777 lunas\` (Settle payable)\n\n📊 *Queries & Reports:*\n• \`today expense\` / \`pengeluaran hari ini\`\n• \`list tagihan\` / \`list hutang\`\n• \`pending list\`\n• \`/myid\` (Get your Chat ID)`;
      await sendTelegramMessage(chatId, helpMenu);
      return new Response("help_sent", { status: 200 });
    }

    const FIREBASE_API_KEY = Deno.env.get("FIREBASE_API_KEY") || Deno.env.get("NG_APP_FIREBASE_API_KEY") || "";

    function buildFirestoreUrl(collectionPath: string, queryParams: string = "") {
      let url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/${collectionPath}`;
      const params: string[] = [];
      if (FIREBASE_API_KEY) params.push(`key=${FIREBASE_API_KEY}`);
      if (queryParams) params.push(queryParams);
      if (params.length > 0) url += "?" + params.join("&");
      return url;
    }

    const nalanginUrl = buildFirestoreUrl("nalangin_ledger");

    // Command: today expense / pengeluaran hari ini
    if (cleanLower === "today expense" || cleanLower === "pengeluaran hari ini") {
      const today = new Date().toISOString().split('T')[0];
      const resExp = await fetch(buildFirestoreUrl("expenses", "pageSize=50"));
      let todayTotal = 0;
      let itemListText = "";

      if (resExp.ok) {
        const data = await resExp.json();
        if (data.documents && data.documents.length > 0) {
          for (const doc of data.documents) {
            const f = doc.fields || {};
            if (f.date?.stringValue === today) {
              const itemTitle = f.title?.stringValue || "Item";
              const itemAmt = Number(f.amount?.doubleValue || f.amount?.integerValue || 0);
              todayTotal += itemAmt;
              itemListText += `• *${itemTitle}*: Rp ${itemAmt.toLocaleString("id-ID")}\n`;
            }
          }
        }
      }

      const report = `📊 *Today's Expenses (${today})*\n\n${itemListText || "No expenses logged today.\n"}\n💵 *Total Spent:* Rp ${todayTotal.toLocaleString("id-ID")}`;
      await sendTelegramMessage(chatId, report);
      return new Response("today_expense_sent", { status: 200 });
    }

    // Command: list tagihan / list hutang
    if (/^list\s+(tagihan|hutang|nalangin)/i.test(cleanLower)) {
      const targetType = cleanLower.includes("tagihan") ? "receivable" : cleanLower.includes("hutang") ? "payable" : "all";
      let listText = "";

      // Check nalangin_ledger collection
      const resNal = await fetch(buildFirestoreUrl("nalangin_ledger", "pageSize=50"));
      if (resNal.ok) {
        const data = await resNal.json();
        if (data.documents && data.documents.length > 0) {
          for (const doc of data.documents) {
            const f = doc.fields || {};
            const st = f.status?.stringValue || "pending";
            const type = f.type?.stringValue || "receivable";

            if (st === "pending" && (targetType === "all" || type === targetType)) {
              const docId = doc.name.split("/").pop();
              const shortId = f.shortId?.stringValue || docId.substring(0, 6).toUpperCase();
              const person = f.person?.stringValue || "Person";
              const amt = Number(f.amount?.doubleValue || f.amount?.integerValue || 0);
              const notes = f.notes?.stringValue || "";
              const tag = type === "receivable" ? "Tagihan" : "Hutang";
              listText += `• *[${shortId}]* ${tag} to *${person}*: Rp ${amt.toLocaleString("id-ID")} (${notes})\n`;
            }
          }
        }
      }

      // Check expenses collection for fallback entries
      const resExp = await fetch(buildFirestoreUrl("expenses", "pageSize=50"));
      if (resExp.ok) {
        const dataExp = await resExp.json();
        if (dataExp.documents && dataExp.documents.length > 0) {
          for (const doc of dataExp.documents) {
            const f = doc.fields || {};
            const subCat = f.subCategory?.stringValue || "";
            const title = f.title?.stringValue || "";
            const isRec = subCat === "receivable" || title.startsWith("[Tagihan]");
            const isPay = subCat === "payable" || title.startsWith("[Hutang]");

            if (isRec || isPay) {
              const type = isRec ? "receivable" : "payable";
              if (targetType === "all" || type === targetType) {
                const docId = doc.name.split("/").pop();
                const shortId = docId.substring(0, 6).toUpperCase();
                const personMatch = title.match(/\[(?:Tagihan|Hutang)\]\s*([^:]+):/i);
                const person = personMatch ? personMatch[1].trim() : "Friend";
                const notes = title.replace(/\[(?:Tagihan|Hutang)\]\s*[^:]+:\s*/i, "");
                const amt = Number(f.amount?.doubleValue || f.amount?.integerValue || 0);
                const tag = isRec ? "Tagihan" : "Hutang";
                listText += `• *[${shortId}]* ${tag} to *${person}*: Rp ${amt.toLocaleString("id-ID")} (${notes})\n`;
              }
            }
          }
        }
      }

      await sendTelegramMessage(chatId, `🤝 *Pending Nalangin Ledger*\n\n${listText || "No pending debts or receivables found."}`);
      return new Response("nalangin_list_sent", { status: 200 });
    }

    // Command: Nalangin Settlement ("lunas")
    if (cleanLower.includes("lunas") && (cleanLower.includes("tagihan") || cleanLower.includes("hutang"))) {
      const isTagihan = cleanLower.includes("tagihan");
      let targetDoc = null;
      let isFallbackExpense = false;

      // 1. Search in nalangin_ledger collection
      const resNal = await fetch(buildFirestoreUrl("nalangin_ledger", "pageSize=50"));
      if (resNal.ok) {
        const data = await resNal.json();
        if (data.documents && data.documents.length > 0) {
          for (const doc of data.documents) {
            const f = doc.fields || {};
            const st = f.status?.stringValue || "pending";
            const type = f.type?.stringValue || "receivable";
            const person = (f.person?.stringValue || "").toLowerCase();
            const shortId = (f.shortId?.stringValue || "").toLowerCase();
            const docId = doc.name.split("/").pop().toLowerCase();

            if (st === "pending" && type === (isTagihan ? "receivable" : "payable")) {
              if (cleanLower.includes(person) || (shortId && cleanLower.includes(shortId)) || cleanLower.includes(docId.substring(0, 6)) || data.documents.length === 1) {
                targetDoc = doc;
                break;
              }
            }
          }
        }
      }

      // 2. Search in expenses collection for fallback entries
      if (!targetDoc) {
        const resExp = await fetch(buildFirestoreUrl("expenses", "pageSize=50"));
        if (resExp.ok) {
          const dataExp = await resExp.json();
          if (dataExp.documents && dataExp.documents.length > 0) {
            for (const doc of dataExp.documents) {
              const f = doc.fields || {};
              const subCat = f.subCategory?.stringValue || "";
              const title = f.title?.stringValue || "";
              const isRec = subCat === "receivable" || title.startsWith("[Tagihan]");
              const isPay = subCat === "payable" || title.startsWith("[Hutang]");

              if ((isTagihan && isRec) || (!isTagihan && isPay)) {
                const docId = doc.name.split("/").pop().toLowerCase();
                const shortId = docId.substring(0, 6);
                const personMatch = title.match(/\[(?:Tagihan|Hutang)\]\s*([^:]+):/i);
                const person = personMatch ? personMatch[1].trim().toLowerCase() : "";

                if (cleanLower.includes(shortId) || (person && cleanLower.includes(person))) {
                  targetDoc = doc;
                  isFallbackExpense = true;
                  break;
                }
              }
            }
          }
        }
      }

      if (targetDoc) {
        const f = targetDoc.fields || {};
        const docId = targetDoc.name.split("/").pop();
        const shortId = f.shortId?.stringValue || docId.substring(0, 6).toUpperCase();
        
        let person = f.person?.stringValue || "Friend";
        let amt = Number(f.amount?.doubleValue || f.amount?.integerValue || 0);
        let notes = f.notes?.stringValue || f.title?.stringValue || "Nalangin Item";

        if (isFallbackExpense) {
          const personMatch = notes.match(/\[(?:Tagihan|Hutang)\]\s*([^:]+):/i);
          if (personMatch) person = personMatch[1].trim();
          notes = notes.replace(/\[(?:Tagihan|Hutang)\]\s*[^:]+:\s*/i, "");

          const updateUrl = `https://firestore.googleapis.com/v1/${targetDoc.name}?key=${FIREBASE_API_KEY}&updateMask.fieldPaths=subCategory&updateMask.fieldPaths=title`;
          await fetch(updateUrl, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              fields: {
                ...f,
                title: { stringValue: `[Settled ${isTagihan ? "Tagihan" : "Hutang"}] ${person}: ${notes}` },
                subCategory: { stringValue: "settled_nalangin" }
              }
            })
          });
        } else {
          const updateUrl = `https://firestore.googleapis.com/v1/${targetDoc.name}?key=${FIREBASE_API_KEY}&updateMask.fieldPaths=status&updateMask.fieldPaths=settledAt`;
          await fetch(updateUrl, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              fields: {
                status: { stringValue: "settled" },
                settledAt: { integerValue: String(Date.now()) }
              }
            })
          });
        }

        if (isTagihan) {
          await sendTelegramMessage(chatId, `✅ *Receivable Settled!* [${shortId}] *${person}* paid Rp ${amt.toLocaleString("id-ID")} ('${notes}'). Recorded under Bank Jago.`);
        } else {
          await sendTelegramMessage(chatId, `✅ *Payable Settled!* [${shortId}] Paid Rp ${amt.toLocaleString("id-ID")} to *${person}* from Bank Jago.`);
        }

        return new Response("nalangin_settled", { status: 200 });
      } else {
        await sendTelegramMessage(chatId, "⚠️ Could not find matching pending nalangin item to settle.");
        return new Response("nalangin_settle_failed", { status: 200 });
      }
    }

    // Command: Nalangin Creation (tagihan / hutang)
    if (/^(tagihan|hutang)\s+/i.test(cleanLower) && !cleanLower.includes("lunas")) {
      const isTagihan = cleanLower.startsWith("tagihan");
      const textWithoutPrefix = rawText.replace(/^(tagihan|hutang)\s+/i, "").trim();

      const amtMatch = textWithoutPrefix.match(/(\d+[\d\.]*)\s*(rb|k|ribu|rupiah|idr)?/i);
      let amount = 0;
      let amtRaw = "";
      if (amtMatch) {
        amtRaw = amtMatch[0];
        let numStr = amtMatch[1].replace(/\./g, "");
        let num = parseFloat(numStr);
        let unit = (amtMatch[2] || "").toLowerCase();
        if (unit === "rb" || unit === "k" || unit === "ribu") num *= 1000;
        amount = num;
      }

      if (amount <= 0) {
        await sendTelegramMessage(chatId, "❓ Could not detect amount. Example: `tagihan ilyas 50k pecel ayam`");
        return new Response("invalid_nalangin_amount", { status: 200 });
      }

      const remainingParts = textWithoutPrefix.replace(amtRaw, " ").trim().split(/\s+/);
      const person = remainingParts[0] ? remainingParts[0].charAt(0).toUpperCase() + remainingParts[0].slice(1) : "Friend";
      const notes = remainingParts.slice(1).join(" ") || "Shared Purchase";
      const shortId = `ID${Math.floor(100 + Math.random() * 900)}`;

      let postRes = await fetch(nalanginUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fields: {
            shortId: { stringValue: shortId },
            person: { stringValue: person },
            type: { stringValue: isTagihan ? "receivable" : "payable" },
            amount: { doubleValue: amount },
            date: { stringValue: new Date().toISOString().split('T')[0] },
            notes: { stringValue: notes },
            status: { stringValue: "pending" },
            createdAt: { integerValue: String(Date.now()) }
          }
        })
      });

      if (!postRes.ok) {
        const expensesUrl = buildFirestoreUrl("expenses");
        const titleStr = isTagihan ? `[Tagihan] ${person}: ${notes}` : `[Hutang] ${person}: ${notes}`;
        postRes = await fetch(expensesUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fields: {
              title: { stringValue: titleStr },
              amount: { doubleValue: amount },
              quantity: { integerValue: "1" },
              unitPrice: { doubleValue: amount },
              category: { stringValue: "other" },
              subCategory: { stringValue: isTagihan ? "receivable" : "payable" },
              storeName: { stringValue: `Nalangin: ${person}` },
              date: { stringValue: new Date().toISOString().split('T')[0] },
              paymentMethod: { stringValue: "qris" },
              createdBy: { stringValue: `telegram_${chatId}` },
              createdAt: { integerValue: String(Date.now()) },
              updatedAt: { integerValue: String(Date.now()) }
            }
          })
        });
      }

      if (!postRes.ok) {
        const errText = await postRes.text();
        console.error("Firestore Nalangin POST Error:", errText);
        await sendTelegramMessage(chatId, `⚠️ Failed to save to database. Error ${postRes.status}`);
        return new Response(errText, { status: 500 });
      }

      const msg = isTagihan 
        ? `📌 *Receivable Logged!* [${shortId}] Tagihan to *${person}*: Rp ${amount.toLocaleString("id-ID")} for '${notes}'.\n_(Saved directly to Nalangin Ledger - no confirmation needed)_`
        : `📌 *Payable Logged!* [${shortId}] Hutang to *${person}*: Rp ${amount.toLocaleString("id-ID")} for '${notes}'.\n_(Saved directly to Nalangin Ledger - no confirmation needed)_`;
      
      await sendTelegramMessage(chatId, msg);
      return new Response("nalangin_created", { status: 200 });
    }

    // Rule 1: IGNORE raw image inputs (do not write 0 IDR entries)
    if (message.photo && (!message.caption || message.caption.trim() === "")) {
      await sendTelegramMessage(chatId, "📷 Image received. Please send text description with price to log expense.");
      return new Response("Image ignored without text", { status: 200 });
    }
    if (message.photo && (!message.caption || message.caption.trim() === "")) {
      await sendTelegramMessage(chatId, "📷 Image received. Please send text description with price to log expense.");
      return new Response("Image ignored without text", { status: 200 });
    }
    const isCancellation = /^(cancel|batal|no|discard|hapus)/i.test(rawText);
    const isConfirmation = /^(yes|ya|yep|confirm|correct|setuju)/i.test(rawText) || /correct for ID\d+/i.test(rawText);

    const pendingCache = (globalThis as any)._pendingCache || ((globalThis as any)._pendingCache = new Map());

    const FIREBASE_API_KEY = Deno.env.get("FIREBASE_API_KEY") || Deno.env.get("NG_APP_FIREBASE_API_KEY") || "";
    const apiKeyParam = FIREBASE_API_KEY ? `?key=${FIREBASE_API_KEY}` : "";
    const pendingDocUrl = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/pending_telegram/${chatId}${apiKeyParam}`;
    const pendingCollectionUrl = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/pending_telegram?documentId=${chatId}${FIREBASE_API_KEY ? '&key=' + FIREBASE_API_KEY : ''}`;
    const expensesUrl = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/expenses${apiKeyParam}`;

    if (isCancellation) {
      pendingCache.delete(chatId);
      await fetch(pendingDocUrl, { method: 'DELETE' });
      await sendTelegramMessage(chatId, "❌ *Pending entry cancelled.* Send a new expense description whenever you're ready.");
      return new Response("Cancelled", { status: 200 });
    }

    if (isConfirmation) {
      let pendingData = pendingCache.get(chatId);

      if (!pendingData) {
        const pRes = await fetch(pendingDocUrl);
        if (pRes.ok) {
          const pDoc = await pRes.json();
          const fields = pDoc.fields || {};
          if (fields.pendingId) {
            pendingData = {
              pendingId: fields.pendingId.stringValue,
              title: fields.title?.stringValue || 'Expense',
              amount: Number(fields.totalAmount?.doubleValue || fields.totalAmount?.integerValue || 0),
              quantity: Number(fields.quantity?.integerValue || 1),
              unitPrice: Number(fields.unitPrice?.doubleValue || fields.unitPrice?.integerValue || 0),
              category: fields.category?.stringValue || 'food',
              subCategory: fields.subCategory?.stringValue || 'resto_dining'
            };
          }
        }
      }

      if (pendingData) {
        const pendingId = pendingData.pendingId || 'ID000';
        const title = pendingData.title || 'Expense';
        const amount = pendingData.amount || pendingData.totalAmount || 0;
        const quantity = pendingData.quantity || 1;
        const unitPrice = pendingData.unitPrice || amount;

        await fetch(expensesUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fields: {
              title: { stringValue: title },
              amount: { doubleValue: amount },
              quantity: { integerValue: quantity },
              unitPrice: { doubleValue: unitPrice },
              category: { stringValue: pendingData.category || "food" },
              subCategory: { stringValue: pendingData.subCategory || "resto_dining" },
              date: { stringValue: new Date().toISOString().split('T')[0] },
              paymentMethod: { stringValue: "qris" },
              createdBy: { stringValue: `telegram_${chatId}` },
              createdAt: { integerValue: Date.now() },
              updatedAt: { integerValue: Date.now() }
            }
          })
        });

        pendingCache.delete(chatId);
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
    const pendingPayload = {
      pendingId: shortId,
      chatId,
      title: parsedExpense.title,
      quantity: parsedExpense.quantity,
      unitPrice: parsedExpense.unitPrice,
      amount: parsedExpense.amount,
      category: parsedExpense.category,
      subCategory: parsedExpense.subCategory,
      createdAt: Date.now()
    };

    pendingCache.set(chatId, pendingPayload);

    await fetch(pendingDocUrl, { method: 'DELETE' });
    await fetch(pendingCollectionUrl, {
      method: "POST",
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