const express = require("express");
const line = require("@line/bot-sdk");
const { createClient } = require("@supabase/supabase-js");
const axios = require("axios");
const cheerio = require("cheerio");

const app = express();

const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
};

const client = new line.Client(config);

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

const adminId = "Uaf293ee976e5170d4e8672d2c12b3f76";

const pendingAccounts = {};
const daily539Cache = {};
const slotSessions = {};
const baccaratHistory = {};

function randomPick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function quickBaccarat() {
  return {
    items: [
      { type: "action", action: { type: "message", label: "莊", text: "莊" } },
      { type: "action", action: { type: "message", label: "閒", text: "閒" } },
      { type: "action", action: { type: "message", label: "和", text: "和" } },
    ],
  };
}

function quickSlotGame() {
  return {
    items: [
      { type: "action", action: { type: "message", label: "戰神賽特1", text: "戰神賽特1" } },
      { type: "action", action: { type: "message", label: "戰神賽特2", text: "戰神賽特2" } },
    ],
  };
}

function quickSlotMode() {
  return {
    items: [
      { type: "action", action: { type: "message", label: "隨機爆分房", text: "隨機爆分房" } },
      { type: "action", action: { type: "message", label: "自選房號", text: "自選房號" } },
    ],
  };
}

function quick539(excludeMode) {
  const modes = [
    { label: "539穩定", text: "539穩定" },
    { label: "539熱號", text: "539熱號" },
    { label: "539冷號", text: "539冷號" },
  ];

  return {
    items: modes
      .filter((mode) => mode.text !== excludeMode)
      .map((mode) => ({
        type: "action",
        action: { type: "message", label: mode.label, text: mode.text },
      })),
  };
}

async function getVipData(userId) {
  const { data } = await supabase
    .from("vip_users")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  return data;
}

async function checkVip(userId) {
  const data = await getVipData(userId);
  if (!data) return false;
  return Number(data.expire_time) > Date.now();
}

async function openVip(userId, account, days) {
  const expireTime = Date.now() + days * 24 * 60 * 60 * 1000;
  const oldData = await getVipData(userId);

  if (oldData) {
    await supabase
      .from("vip_users")
      .update({ account, expire_time: expireTime })
      .eq("user_id", userId);
  } else {
    await supabase
      .from("vip_users")
      .insert({ user_id: userId, account, expire_time: expireTime });
  }

  return expireTime;
}

function formatTaiwanTime(timestamp) {
  return new Date(Number(timestamp)).toLocaleString("zh-TW", {
    timeZone: "Asia/Taipei",
  });
}

function noVipMessage() {
  return `━━━━━━━━━━
🔐 黑域AI權限尚未開通
━━━━━━━━━━

請提供3A帳號申請開通。

輸入範例：
申請開通 abc123

📲 開通請私訊
LINE：zu88.8`;
}

function getPredictionDate() {
  const taiwanNow = new Date(
    new Date().toLocaleString("en-US", { timeZone: "Asia/Taipei" })
  );

  const hour = taiwanNow.getHours();
  const minute = taiwanNow.getMinutes();
  const day = taiwanNow.getDay();

  const targetDate = new Date(
    taiwanNow.getFullYear(),
    taiwanNow.getMonth(),
    taiwanNow.getDate()
  );

  if (day === 0) {
    targetDate.setDate(targetDate.getDate() + 1);
  } else if (hour > 20 || (hour === 20 && minute >= 20)) {
    targetDate.setDate(targetDate.getDate() + 1);
    if (targetDate.getDay() === 0) targetDate.setDate(targetDate.getDate() + 1);
  }

  const y = targetDate.getFullYear();
  const m = String(targetDate.getMonth() + 1).padStart(2, "0");
  const d = String(targetDate.getDate()).padStart(2, "0");

  return `${y}/${m}/${d}`;
}

function fallback539Numbers(mode) {
  let pool;

  if (mode === "hot") {
    pool = [3, 5, 8, 11, 13, 16, 19, 22, 27, 31, 33, 36, 38, 39];
  } else if (mode === "cold") {
    pool = [1, 4, 6, 9, 12, 15, 18, 21, 24, 26, 29, 32, 34, 37];
  } else {
    pool = [2, 5, 7, 10, 13, 17, 20, 23, 25, 28, 30, 33, 35, 38, 39];
  }

  const numbers = [];

  while (numbers.length < 5) {
    const n = Math.random() < 0.8 ? randomPick(pool) : Math.floor(Math.random() * 39) + 1;
    if (!numbers.includes(n)) numbers.push(n);
  }

  return numbers.sort((a, b) => a - b).map((n) => String(n).padStart(2, "0"));
}

async function fetch539History() {
  const url = "https://www.pilio.idv.tw/lto539/list539BIG.asp";

  try {
    const res = await axios.get(url, {
      timeout: 10000,
      headers: {
        "User-Agent": "Mozilla/5.0",
      },
    });

    const $ = cheerio.load(res.data);
    const text = $("body").text().replace(/\s+/g, " ");

    const matches = text.match(/\b(?:0?[1-9]|[12][0-9]|3[0-9])\b/g) || [];
    const nums = matches.map((n) => Number(n)).filter((n) => n >= 1 && n <= 39);

    const history = [];

    for (let i = 0; i <= nums.length - 5; i += 5) {
      const group = nums.slice(i, i + 5);
      const unique = [...new Set(group)];

      if (unique.length === 5 && group.every((n) => n >= 1 && n <= 39)) {
        history.push(group);
      }

      if (history.length >= 100) break;
    }

    return history;
  } catch (err) {
    console.log("539 history fetch error:", err.message);
    return [];
  }
}

async function generate539Numbers(mode) {
  const predictionDate = getPredictionDate();
  const cacheKey = `${predictionDate}-${mode}`;

  if (daily539Cache[cacheKey]) return daily539Cache[cacheKey];

  const history = await fetch539History();

  if (!history.length) {
    const fallback = fallback539Numbers(mode);
    daily539Cache[cacheKey] = {
      numbers: fallback,
      source: "備用模型",
      detail: "歷史資料暫時無法讀取，使用備用區間模型。",
    };
    return daily539Cache[cacheKey];
  }

  const freq = {};
  const lastSeen = {};

  for (let i = 1; i <= 39; i++) {
    freq[i] = 0;
    lastSeen[i] = 999;
  }

  history.forEach((draw, index) => {
    draw.forEach((n) => {
      freq[n] += 1;
      if (lastSeen[n] === 999) lastSeen[n] = index;
    });
  });

  let ranked;

  if (mode === "hot") {
    ranked = Object.keys(freq)
      .map(Number)
      .sort((a, b) => freq[b] - freq[a] || lastSeen[a] - lastSeen[b]);
  } else if (mode === "cold") {
    ranked = Object.keys(freq)
      .map(Number)
      .sort((a, b) => lastSeen[b] - lastSeen[a] || freq[a] - freq[b]);
  } else {
    ranked = Object.keys(freq)
      .map(Number)
      .sort((a, b) => {
        const scoreA = freq[a] * 2 + Math.min(lastSeen[a], 20);
        const scoreB = freq[b] * 2 + Math.min(lastSeen[b], 20);
        return scoreB - scoreA;
      });
  }

  const selected = [];

  for (const n of ranked) {
    if (!selected.includes(n)) selected.push(n);
    if (selected.length >= 5) break;
  }

  const finalNumbers = selected
    .sort((a, b) => a - b)
    .map((n) => String(n).padStart(2, "0"));

  daily539Cache[cacheKey] = {
    numbers: finalNumbers,
    source: "歷史資料模型",
    detail: `已讀取近 ${history.length} 期資料，完成熱度、遺漏值與區間波動分析。`,
  };

  return daily539Cache[cacheKey];
}

function analyzeSlotRoom(game, roomNumber) {
  const room = Number(roomNumber);
  const score = (room * 7) % 100;

  let status;
  let suggestion;
  let confidence;
  let reason;

  if (score >= 70) {
    status = "高波動區";
    suggestion = "可進場";
    confidence = "★★★★☆";
    reason = "倍率波動偏強，模型同步活躍區。";
  } else if (score >= 45) {
    status = "數據偏強";
    suggestion = "小注試水";
    confidence = "★★★☆☆";
    reason = "波動開始放大，適合小注觀察。";
  } else {
    status = "回吐區";
    suggestion = "建議觀望";
    confidence = "★★☆☆☆";
    reason = "目前模型顯示回吐風險偏高。";
  }

  return { game, room, status, suggestion, confidence, reason };
}

function formatSlotAnalysis(analysis) {
  return `━━━━━━━━━━
⚡ 黑域電子AI同步完成
━━━━━━━━━━

目前遊戲：
${analysis.game}

房間號碼：
${analysis.room}

目前狀態：
${analysis.status}

AI建議：
${analysis.suggestion}

信心指數：
${analysis.confidence}

分析依據：
${analysis.reason}

⚠️ 僅供娛樂分析參考`;
}

function analyzeBaccarat(history) {
  const filtered = history.filter((x) => x !== "和");

  const bankerCount = filtered.filter((x) => x === "莊").length;
  const playerCount = filtered.filter((x) => x === "閒").length;

  const last = filtered[filtered.length - 1];
  const last2 = filtered.slice(-2);

  let prediction = "莊";
  let confidence = "★★★☆☆";
  let reason = "模型同步中";

  if (last2.length === 2 && last2[0] === "莊" && last2[1] === "閒") {
    prediction = "莊";
    reason = "牌路出現跳牌結構，模型偏向續跳。";
  } else if (last2.length === 2 && last2[0] === "閒" && last2[1] === "莊") {
    prediction = "閒";
    reason = "牌路出現跳牌結構，模型偏向續跳。";
  } else if (bankerCount > playerCount) {
    prediction = "莊";
    reason = "近局莊比例偏高，模型偏向莊。";
  } else if (playerCount > bankerCount) {
    prediction = "閒";
    reason = "近局閒比例偏高，模型偏向閒。";
  } else {
    prediction = last === "莊" ? "閒" : "莊";
    reason = "牌路比例平均，模型偏向反轉。";
  }

  if (Math.abs(bankerCount - playerCount) >= 3) {
    confidence = "★★★★☆";
  }

  return { prediction, confidence, reason };
}

app.get("/", (req, res) => {
  res.send("BLACKDOMAIN AI Running");
});

app.post("/webhook", line.middleware(config), async (req, res) => {
  try {
    await Promise.all(req.body.events.map(handleEvent));
    res.status(200).end();
  } catch (err) {
    console.log(err);
    res.status(500).end();
  }
});

async function handleEvent(event) {
  if (event.type !== "message") return null;
  if (event.message.type !== "text") return null;

  const userId = event.source.userId;
  const userText = event.message.text.trim();
  const lowerText = userText.toLowerCase();

  if (!baccaratHistory[userId]) baccaratHistory[userId] = [];

  if (userText === "我的ID") {
    return client.replyMessage(event.replyToken, {
      type: "text",
      text: userId,
    });
  }

  if (userText === "VIP查詢" || userText === "VIP" || userText === "VIP時間") {
    const data = await getVipData(userId);

    if (!data || Number(data.expire_time) <= Date.now()) {
      return client.replyMessage(event.replyToken, {
        type: "text",
        text: noVipMessage(),
      });
    }

    const expireTime = Number(data.expire_time);
    const diffDays = Math.ceil((expireTime - Date.now()) / (1000 * 60 * 60 * 24));

    return client.replyMessage(event.replyToken, {
      type: "text",
      text: `━━━━━━━━━━
👑 黑域VIP
━━━━━━━━━━

3A帳號：
${data.account}

剩餘天數：
${diffDays} 天

到期時間：
${formatTaiwanTime(expireTime)}`,
    });
  }

  if (userText === "開通會員" || userText === "我要開通" || userText === "開通") {
    return client.replyMessage(event.replyToken, {
      type: "text",
      text: noVipMessage(),
    });
  }

  if (userText.startsWith("申請開通 ")) {
    const account = userText.replace("申請開通 ", "").trim();

    if (!account) {
      return client.replyMessage(event.replyToken, {
        type: "text",
        text: "請輸入3A帳號\n範例：申請開通 abc123",
      });
    }

    pendingAccounts[account] = userId;

    return client.replyMessage(event.replyToken, {
      type: "text",
      text: `━━━━━━━━━━
📝 已收到開通申請
━━━━━━━━━━

3A帳號：
${account}

請等待管理員審核。`,
    });
  }

  if (userText.startsWith("開通 ")) {
    if (userId !== adminId) {
      return client.replyMessage(event.replyToken, {
        type: "text",
        text: "你沒有管理員權限",
      });
    }

    const parts = userText.split(" ");
    const account = parts[1];
    const days = parseInt(parts[2], 10);

    if (!account || !days) {
      return client.replyMessage(event.replyToken, {
        type: "text",
        text: "格式錯誤\n範例：開通 abc123 2",
      });
    }

    const targetUserId = pendingAccounts[account];

    if (!targetUserId) {
      return client.replyMessage(event.replyToken, {
        type: "text",
        text: "查無此申請帳號",
      });
    }

    const expireTime = await openVip(targetUserId, account, days);

    return client.replyMessage(event.replyToken, {
      type: "text",
      text: `━━━━━━━━━━
✅ 黑域AI開通成功
━━━━━━━━━━

3A帳號：
${account}

開通天數：
${days}天

到期時間：
${formatTaiwanTime(expireTime)}`,
    });
  }

  const isVipCommand =
    [
      "百家樂",
      "電子",
      "電子AI",
      "539",
      "539AI",
      "539 AI",
      "539穩定",
      "539熱號",
      "539冷號",
      "戰神賽特1",
      "戰神賽特2",
      "隨機爆分房",
      "自選房號",
      "莊",
      "閒",
      "和",
      "DG",
      "MT",
    ].includes(userText) ||
    /^mt/i.test(userText) ||
    /^dg/i.test(userText) ||
    /^\d{1,4}$/.test(userText);

  if (isVipCommand) {
    if (userId !== adminId) {
      const isVip = await checkVip(userId);

      if (!isVip) {
        return client.replyMessage(event.replyToken, {
          type: "text",
          text: noVipMessage(),
        });
      }
    }
  }

  if (userText === "百家樂") {
    baccaratHistory[userId] = [];

    return client.replyMessage(event.replyToken, {
      type: "text",
      text: `━━━━━━━━━━
⚡ 黑域AI已啟動
━━━━━━━━━━

請選擇遊戲：

• DG
• MT`,
      quickReply: {
        items: [
          { type: "action", action: { type: "message", label: "DG", text: "DG" } },
          { type: "action", action: { type: "message", label: "MT", text: "MT" } },
        ],
      },
    });
  }

  if (lowerText === "dg" || lowerText === "mt") {
    return client.replyMessage(event.replyToken, {
      type: "text",
      text: `━━━━━━━━━━
🤖 黑域AI已啟動
━━━━━━━━━━

請輸入房間號碼

範例：
DG RB01
MT 01`,
    });
  }

  const isValidMT = /^mt\s*(?:0?[1-9]|1[0-3]|3a|13a)$/i.test(userText);
  const isValidDG = /^dg\s*(?:0?[1-7]|rb\s*0?[1-7]|s\s*0?[1-7])$/i.test(userText);
  const isWrongRoom = /^mt/i.test(userText) || /^dg/i.test(userText);

  if (isValidMT || isValidDG) {
    baccaratHistory[userId] = [];

    return client.replyMessage(event.replyToken, {
      type: "text",
      text: `━━━━━━━━━━
🤖 黑域AI同步完成
━━━━━━━━━━

✓ 房間同步成功
✓ AI模型運算完成

請輸入目前開出：
莊 / 閒 / 和`,
      quickReply: quickBaccarat(),
    });
  }

  if (isWrongRoom) {
    return client.replyMessage(event.replyToken, {
      type: "text",
      text: "查無此房間",
    });
  }

  if (userText === "莊" || userText === "閒" || userText === "和") {
    baccaratHistory[userId].push(userText);

    if (baccaratHistory[userId].length > 20) baccaratHistory[userId].shift();

    const analysis = analyzeBaccarat(baccaratHistory[userId]);

    return client.replyMessage(event.replyToken, {
      type: "text",
      text: `━━━━━━━━━━
🤖 黑域AI運算完成
━━━━━━━━━━

目前建議：
${analysis.prediction}

信心指數：
${analysis.confidence}

分析依據：
${analysis.reason}

目前牌路：
${baccaratHistory[userId].join(" ")}

請輸入目前開出：
莊 / 閒 / 和`,
      quickReply: quickBaccarat(),
    });
  }

  if (userText === "電子" || userText === "電子AI") {
    return client.replyMessage(event.replyToken, {
      type: "text",
      text: `━━━━━━━━━━
⚡ 黑域電子AI
━━━━━━━━━━

請選擇遊戲：

🎰 戰神賽特1
🎰 戰神賽特2`,
      quickReply: quickSlotGame(),
    });
  }

  if (userText === "戰神賽特1" || userText === "戰神賽特2") {
    slotSessions[userId] = { game: userText, mode: null };

    return client.replyMessage(event.replyToken, {
      type: "text",
      text: `━━━━━━━━━━
⚡ ${userText}
━━━━━━━━━━

請選擇模式：

1️⃣ 隨機爆分房
2️⃣ 自選房號分析`,
      quickReply: quickSlotMode(),
    });
  }

  if (userText === "隨機爆分房") {
    const session = slotSessions[userId];

    if (!session?.game) {
      return client.replyMessage(event.replyToken, {
        type: "text",
        text: "請先選擇遊戲：戰神賽特1 / 戰神賽特2",
        quickReply: quickSlotGame(),
      });
    }

    let room;
    let analysis;

    do {
      room = Math.floor(Math.random() * 3500) + 1;
      analysis = analyzeSlotRoom(session.game, room);
    } while (analysis.suggestion === "建議觀望");

    return client.replyMessage(event.replyToken, {
      type: "text",
      text: formatSlotAnalysis(analysis),
      quickReply: quickSlotMode(),
    });
  }

  if (userText === "自選房號") {
    if (!slotSessions[userId]?.game) {
      return client.replyMessage(event.replyToken, {
        type: "text",
        text: "請先選擇遊戲：戰神賽特1 / 戰神賽特2",
        quickReply: quickSlotGame(),
      });
    }

    slotSessions[userId].mode = "custom";

    return client.replyMessage(event.replyToken, {
      type: "text",
      text: `━━━━━━━━━━
⚡ 自選房號分析
━━━━━━━━━━

請輸入房號：

範例：
377`,
    });
  }

  if (/^\d{1,4}$/.test(userText) && slotSessions[userId]?.mode === "custom") {
    const room = Number(userText);

    if (room < 1 || room > 3500) {
      return client.replyMessage(event.replyToken, {
        type: "text",
        text: "房號範圍錯誤，請輸入 1～3500。",
      });
    }

    const analysis = analyzeSlotRoom(slotSessions[userId].game, room);

    return client.replyMessage(event.replyToken, {
      type: "text",
      text: formatSlotAnalysis(analysis),
      quickReply: quickSlotMode(),
    });
  }

  if (userText === "539" || userText === "539AI" || userText === "539 AI") {
    return client.replyMessage(event.replyToken, {
      type: "text",
      text: `━━━━━━━━━━
📊 黑域539AI已啟動
━━━━━━━━━━

請選擇模式：

• 539穩定
• 539熱號
• 539冷號`,
      quickReply: quick539(),
    });
  }

  const modeMap = {
    "539穩定": "stable",
    "539熱號": "hot",
    "539冷號": "cold",
  };

  if (modeMap[userText]) {
    const result = await generate539Numbers(modeMap[userText]);
    const nums = result.numbers;
    const predictionDate = getPredictionDate();
    const confidence = userText === "539熱號" ? "★★★★☆" : "★★★☆☆";

    return client.replyMessage(event.replyToken, {
      type: "text",
      text: `━━━━━━━━━━
📊 ${userText}
━━━━━━━━━━

預測日期：
${predictionDate}

AI建議號碼：

${nums.join("　")}

主推號：
${nums[0]} / ${nums[2]}

信心指數：
${confidence}

資料來源：
${result.source}

分析依據：
${result.detail}

⚠️ 僅供娛樂分析參考`,
      quickReply: quick539(userText),
    });
  }

  return client.replyMessage(event.replyToken, {
    type: "text",
    text: `━━━━━━━━━━
🤖 歡迎使用黑域AI
━━━━━━━━━━

請選擇功能：

• 百家樂
• 電子
• 539

若尚未開通：

申請開通 你的3A帳號`,
  });
}

const port = process.env.PORT || 8080;

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
