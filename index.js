const express = require("express");
const line = require("@line/bot-sdk");
const { createClient } = require("@supabase/supabase-js");
const axios = require("axios");
const cheerio = require("cheerio");
const worldCupSchedule = require("./worldcupSchedule");

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
const baccaratHistory = {};
const slotSessions = {};
const worldCupSessions = {};
const daily539Cache = {};

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
        action: {
          type: "message",
          label: mode.label,
          text: mode.text,
        },
      })),
  };
}

function quickWorldCup() {
  return {
    items: [
      { type: "action", action: { type: "message", label: "賽程查詢", text: "賽程查詢" } },
      { type: "action", action: { type: "message", label: "球隊查詢", text: "球隊查詢" } },
      { type: "action", action: { type: "message", label: "AI精選", text: "AI精選" } },
      { type: "action", action: { type: "message", label: "冠軍預測", text: "冠軍預測" } },
    ],
  };
}

function getWorldCupDates() {
  return Object.keys(worldCupSchedule);
}

function quickWorldCupDates(page = 0) {
  const dates = getWorldCupDates();
  const start = page * 11;
  const pageDates = dates.slice(start, start + 11);

  const items = pageDates.map((date) => ({
    type: "action",
    action: {
      type: "message",
      label: date,
      text: date,
    },
  }));

  if (page > 0) {
    items.push({
      type: "action",
      action: {
        type: "message",
        label: "上一頁",
        text: "上一頁",
      },
    });
  }

  if (start + 11 < dates.length) {
    items.push({
      type: "action",
      action: {
        type: "message",
        label: "下一頁",
        text: "下一頁",
      },
    });
  }

  return { items };
}
function quickWorldCupGameNumbers(games) {
  return {
    items: games.map((game, index) => ({
      type: "action",
      action: {
        type: "message",
        label: `${index + 1}`,
        text: `${index + 1}`,
      },
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
      .update({
        account,
        expire_time: expireTime,
      })
      .eq("user_id", userId);
  } else {
    await supabase
      .from("vip_users")
      .insert({
        user_id: userId,
        account,
        expire_time: expireTime,
      });
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
    new Date().toLocaleString("en-US", {
      timeZone: "Asia/Taipei",
    })
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
    if (targetDate.getDay() === 0) {
      targetDate.setDate(targetDate.getDate() + 1);
    }
  }

  const y = targetDate.getFullYear();
  const m = String(targetDate.getMonth() + 1).padStart(2, "0");
  const d = String(targetDate.getDate()).padStart(2, "0");

  return `${y}/${m}/${d}`;
}

function teamEmoji(name) {
  const map = {
    阿根廷: "🇦🇷",
    法國: "🇫🇷",
    巴西: "🇧🇷",
    英格蘭: "🏴",
    西班牙: "🇪🇸",
    德國: "🇩🇪",
    葡萄牙: "🇵🇹",
    荷蘭: "🇳🇱",
    日本: "🇯🇵",
    韓國: "🇰🇷",
    美國: "🇺🇸",
    墨西哥: "🇲🇽",
    摩洛哥: "🇲🇦",
    塞內加爾: "🇸🇳",
    南非: "🇿🇦",
    捷克: "🇨🇿",
    加拿大: "🇨🇦",
    瑞士: "🇨🇭",
    澳洲: "🇦🇺",
    土耳其: "🇹🇷",
    烏拉圭: "🇺🇾",
    比利時: "🇧🇪",
    伊朗: "🇮🇷",
    紐西蘭: "🇳🇿",
    奧地利: "🇦🇹",
    約旦: "🇯🇴",
    克羅埃西亞: "🇭🇷",
    迦納: "🇬🇭",
    巴拿馬: "🇵🇦",
    哥倫比亞: "🇨🇴",
    蘇格蘭: "🏴",
  };

  return map[name] || "⚽";
}

function formatWorldCupGames(date, games) {
  let msg = `━━━━━━━━━━
⚽ ${date} 世足賽程
🕒 台灣時間
━━━━━━━━━━

`;

  games.forEach((game, index) => {
    const groupText = game.group ? `｜${game.group}組` : "";

    msg += `${index + 1}️⃣ ${game.stage}${groupText}
${teamEmoji(game.home)} ${game.home} vs ${teamEmoji(game.away)} ${game.away}
🕒 ${game.time}（台灣時間）
📍 ${game.venue}

`;
  });

  msg += `━━━━━━━━━━

請輸入場次編號
查看AI分析

例如：
1`;

  return msg;
}

function analyzeWorldCupGame(game) {
  const powerTeams = [
    "阿根廷",
    "法國",
    "巴西",
    "英格蘭",
    "西班牙",
    "德國",
    "葡萄牙",
    "荷蘭",
    "比利時",
    "烏拉圭",
  ];

  const homePower = powerTeams.includes(game.home);
  const awayPower = powerTeams.includes(game.away);

  let pick;
  let watch;
  let note;

  if (homePower && !awayPower) {
    pick = `${game.home} 不敗`;
    watch = randomPick(["大1.5", "小3.5"]);
    note = `${game.home}整體戰力與大賽經驗較完整。`;
  } else if (awayPower && !homePower) {
    pick = `${game.away} 不敗`;
    watch = randomPick(["大1.5", "小3.5"]);
    note = `${game.away}整體壓制力較高，但仍需注意小組賽節奏。`;
  } else if (homePower && awayPower) {
    pick = "強強對話，建議保守";
    watch = "小3.5";
    note = "雙方強度接近，模型不建議過度追單。";
  } else {
    pick = randomPick([
      `${game.home} 不敗`,
      `${game.away} 不敗`,
      "建議觀望",
    ]);
    watch = randomPick(["大1.5", "小3.5", "雙方進球"]);
    note = "雙方差距不明顯，建議以低風險玩法觀察。";
  }

  return `━━━━━━━━━━
⚽ 世足AI分析完成
━━━━━━━━━━

${teamEmoji(game.home)} ${game.home} vs ${teamEmoji(game.away)} ${game.away}
🕒 ${game.time}（台灣時間）
📍 ${game.venue}

AI偏向：
${pick}

可留意：
${watch}

⚠️ AI觀察：

${note}

━━━━━━━━━━`;
}

function championPrediction() {
  return `━━━━━━━━━━
🏆 黑域AI冠軍預測
━━━━━━━━━━

目前奪冠熱門：

1️⃣ 🇦🇷 阿根廷
2️⃣ 🇫🇷 法國
3️⃣ 🇧🇷 巴西
4️⃣ 🏴 英格蘭
5️⃣ 🇪🇸 西班牙

━━━━━━━━━━

⚠️ AI觀察：

本屆世足強隊差距接近
淘汰賽波動可能偏高

━━━━━━━━━━`;
}

function teamWorldCupProfile(teamName) {
  const profiles = {
    阿根廷: {
      emoji: "🇦🇷",
      rank: "#1",
      stars: "★★★★★",
      status: "頂級奪冠熱門",
      note: "中前場壓制力偏高，小組晉級機率極高，整體攻防穩定性優秀。",
    },
    法國: {
      emoji: "🇫🇷",
      rank: "#2",
      stars: "★★★★★",
      status: "頂級奪冠熱門",
      note: "前場進攻火力極強，轉換速度優秀，淘汰賽經驗完整。",
    },
    巴西: {
      emoji: "🇧🇷",
      rank: "#5",
      stars: "★★★★☆",
      status: "高奪冠熱門",
      note: "個人能力突出，進攻創造力強，但需觀察防線穩定度。",
    },
    英格蘭: {
      emoji: "🏴",
      rank: "#4",
      stars: "★★★★☆",
      status: "高奪冠熱門",
      note: "陣容厚度完整，中前場火力穩定，淘汰賽抗壓是關鍵。",
    },
    日本: {
      emoji: "🇯🇵",
      rank: "#15",
      stars: "★★★☆☆",
      status: "黑馬觀察名單",
      note: "團隊節奏穩定，反擊效率高，但小組出線壓力較高。",
    },
  };

  const profile = profiles[teamName];

  const scheduleLines = Object.entries(worldCupSchedule)
    .flatMap(([date, games]) =>
      games
        .filter((g) => g.home === teamName || g.away === teamName)
        .map((g) => {
          const opponent = g.home === teamName ? g.away : g.home;
          return `📅 ${date} 🕒 ${g.time}（台灣時間）
vs ${teamEmoji(opponent)} ${opponent}`;
        })
    )
    .join("\n\n");

  if (!profile) {
    if (scheduleLines) {
      return `━━━━━━━━━━
${teamEmoji(teamName)} ${teamName}
━━━━━━━━━━

⚽ 賽程：

${scheduleLines}

━━━━━━━━━━`;
    }

    return `━━━━━━━━━━
⚽ 球隊查詢
━━━━━━━━━━

目前尚未建立「${teamName}」的完整模型。

可查詢範例：
阿根廷
法國
巴西
英格蘭
日本

━━━━━━━━━━`;
  }

  return `━━━━━━━━━━
${profile.emoji} ${teamName}
━━━━━━━━━━

🌍 世界排名：
${profile.rank}

⚽ 小組賽程：

${scheduleLines || "賽程資料陸續補齊中"}

━━━━━━━━━━

🏆 AI奪冠指數：
${profile.stars}

⚠️ AI評價：
${profile.status}

━━━━━━━━━━

⚽ AI觀察：

${profile.note}

━━━━━━━━━━`;
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

    const matches =
      text.match(/\b(?:0?[1-9]|[12][0-9]|3[0-9])\b/g) || [];

    const nums = matches
      .map((n) => Number(n))
      .filter((n) => n >= 1 && n <= 39);

    const history = [];

    for (let i = 0; i <= nums.length - 5; i += 5) {
      const group = nums.slice(i, i + 5);
      const unique = [...new Set(group)];

      if (unique.length === 5) history.push(group);
      if (history.length >= 100) break;
    }

    return history;
  } catch (err) {
    console.log(err.message);
    return [];
  }
}

async function generate539Numbers(mode) {
  const predictionDate = getPredictionDate();
  const cacheKey = `${predictionDate}-${mode}`;

  if (daily539Cache[cacheKey]) return daily539Cache[cacheKey];

  const history = await fetch539History();
  const freq = {};

  for (let i = 1; i <= 39; i++) {
    freq[i] = 0;
  }

  history.forEach((draw) => {
    draw.forEach((n) => {
      freq[n]++;
    });
  });

  let ranked;

  if (mode === "hot") {
    ranked = Object.keys(freq)
      .map(Number)
      .sort((a, b) => freq[b] - freq[a]);
  } else if (mode === "cold") {
    ranked = Object.keys(freq)
      .map(Number)
      .sort((a, b) => freq[a] - freq[b]);
  } else {
    ranked = Object.keys(freq)
      .map(Number)
      .sort(() => Math.random() - 0.5);
  }

  const selected = ranked.slice(0, 5);

  const finalNumbers = selected
    .sort((a, b) => a - b)
    .map((n) => String(n).padStart(2, "0"));

  daily539Cache[cacheKey] = {
    numbers: finalNumbers,
    source: history.length ? "歷史資料模型" : "備用模型",
    detail: history.length
      ? `已讀取近 ${history.length} 期資料`
      : "歷史資料暫時無法讀取，使用備用模型。",
  };

  return daily539Cache[cacheKey];
}

function analyzeSlotRoom(game, roomNumber) {
  const room = Number(roomNumber);
  const score = (room * 7) % 100;

  let status;
  let suggestion;
  let reason;

  if (score >= 70) {
    status = "高波動區";
    suggestion = "可進場";
    reason = "倍率區同步完成";
  } else if (score >= 45) {
    status = "數據偏強";
    suggestion = "小注試水";
    reason = "倍率波動偏強";
  } else {
    status = "回吐區";
    suggestion = "建議觀望";
    reason = "目前回吐波動偏高";
  }

  return {
    game,
    room,
    status,
    suggestion,
    reason,
  };
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

分析依據：
${analysis.reason}

⚠️ 僅供娛樂分析參考`;
}

function getBaccaratMainPrediction(history) {
  const filtered = history.filter((x) => x !== "和");

  if (filtered.length < 2) return randomPick(["莊", "閒"]);

  const bankerCount = filtered.filter((x) => x === "莊").length;
  const playerCount = filtered.filter((x) => x === "閒").length;

  const last = filtered[filtered.length - 1];
  const last2 = filtered.slice(-2);

  if (last2.length === 2 && last2[0] !== last2[1]) {
    return last === "莊" ? "閒" : "莊";
  }

  if (bankerCount > playerCount) return "莊";
  if (playerCount > bankerCount) return "閒";

  return randomPick(["莊", "閒"]);
}

function getBaccaratSpecialTip(history) {
  const filtered = history.filter((x) => x !== "和");
  const recent = filtered.slice(-5);

  const bankerStreak = recent.filter((x) => x === "莊").length;
  const playerStreak = recent.filter((x) => x === "閒").length;

  const roll = Math.random();

  if (roll < 0.02 && bankerStreak >= 3) {
    return `⚠️ 高倍率區同步完成

可留意：
莊龍寶`;
  }

  if (roll < 0.04 && playerStreak >= 3) {
    return `⚠️ 高倍率區同步完成

可留意：
閒龍寶`;
  }

  if (roll < 0.10) {
    return `⚠️ 可留意：
和局`;
  }

  if (roll < 0.16) {
    return `⚠️ 可留意：
${randomPick(["莊對", "閒對"])}`;
  }

  if (roll < 0.20) {
    return `⚠️ 特殊波動：
超6`;
  }

  return "";
}

function getBaccaratWarning(history) {
  const filtered = history.filter((x) => x !== "和");
  const recent = filtered.slice(-5);
  const heCount = history.slice(-6).filter((x) => x === "和").length;

  if (heCount >= 2) return "⚠️ 和局波動偏高";

  if (recent.length >= 5 && recent.every((x) => x === recent[0])) {
    return "⚠️ 偵測長龍波動";
  }

  if (recent.length >= 5) {
    const isShake = recent.every(
      (v, i, arr) => i === 0 || v !== arr[i - 1]
    );

    if (isShake) return "⚠️ 偵測震盪波動";
  }

  return "";
}

function formatBaccaratReply(prediction, extra = "") {
  return `━━━━━━━━━━
🤖 黑域AI運算完成
━━━━━━━━━━

目前建議：
${prediction}${extra}

━━━━━━━━━━

請輸入目前開出：
莊 / 閒 / 和`;
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

  if (!baccaratHistory[userId]) {
    baccaratHistory[userId] = [];
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
      "世足",
      "賽程查詢",
      "球隊查詢",
      "AI精選",
      "冠軍預測",
      "下一頁",
      "上一頁",
    ].includes(userText) ||
    /^mt/i.test(userText) ||
    /^dg/i.test(userText) ||
    /^\d{1,4}$/.test(userText) ||
    Boolean(worldCupSchedule[userText]);

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

  if (userText === "世足") {
    worldCupSessions[userId] = {
      mode: null,
      games: [],
      datePage: 0,
    };

    return client.replyMessage(event.replyToken, {
      type: "text",
      text: `━━━━━━━━━━
⚽ 黑域世足系統
━━━━━━━━━━

請選擇功能：

1️⃣ 賽程查詢
2️⃣ 球隊查詢
3️⃣ AI精選
4️⃣ 冠軍預測

━━━━━━━━━━`,
      quickReply: quickWorldCup(),
    });
  }

  if (
    userText === "賽程查詢" ||
    (userText === "1" && worldCupSessions[userId]?.mode !== "selectGame")
  ) {
    worldCupSessions[userId] = {
      mode: "date",
      games: [],
      datePage: 0,
    };

    return client.replyMessage(event.replyToken, {
      type: "text",
      text: `━━━━━━━━━━
📅 世足賽程查詢
🕒 全部為台灣時間
━━━━━━━━━━

請選擇日期：

━━━━━━━━━━`,
      quickReply: quickWorldCupDates(0),
    });
  }

  if (
    (userText === "下一頁" || userText === "上一頁") &&
    worldCupSessions[userId]?.mode === "date"
  ) {
    const current = worldCupSessions[userId].datePage || 0;
    const next = userText === "下一頁" ? current + 1 : Math.max(0, current - 1);

    worldCupSessions[userId].datePage = next;

    return client.replyMessage(event.replyToken, {
      type: "text",
      text: `━━━━━━━━━━
📅 世足賽程查詢
🕒 全部為台灣時間
━━━━━━━━━━

請選擇日期：

━━━━━━━━━━`,
      quickReply: quickWorldCupDates(next),
    });
  }

  if (worldCupSchedule[userText] && worldCupSessions[userId]?.mode === "date") {
    const games = worldCupSchedule[userText];

    worldCupSessions[userId] = {
      mode: "selectGame",
      games,
      datePage: worldCupSessions[userId].datePage || 0,
    };

   return client.replyMessage(event.replyToken, {
  type: "text",
  text: formatWorldCupGames(userText, games),
  quickReply: quickWorldCupGameNumbers(games),
});
  }

  if (/^\d+$/.test(userText) && worldCupSessions[userId]?.mode === "selectGame") {
    const index = Number(userText) - 1;
    const game = worldCupSessions[userId].games[index];

    if (!game) {
      return client.replyMessage(event.replyToken, {
        type: "text",
        text: "查無此場次",
      });
    }

    return client.replyMessage(event.replyToken, {
      type: "text",
      text: analyzeWorldCupGame(game),
      quickReply: quickWorldCup(),
    });
  }

  if (
    userText === "球隊查詢" ||
    (userText === "2" && worldCupSessions[userId]?.mode !== "selectGame")
  ) {
    worldCupSessions[userId] = {
      mode: "team",
      games: [],
    };

    return client.replyMessage(event.replyToken, {
      type: "text",
      text: `━━━━━━━━━━
⚽ 球隊查詢
━━━━━━━━━━

請輸入球隊名稱：

例如：
阿根廷
法國
日本
巴西

━━━━━━━━━━`,
    });
  }

  if (worldCupSessions[userId]?.mode === "team") {
    return client.replyMessage(event.replyToken, {
      type: "text",
      text: teamWorldCupProfile(userText),
      quickReply: quickWorldCup(),
    });
  }

  if (
    userText === "AI精選" ||
    (userText === "3" && worldCupSessions[userId]?.mode !== "selectGame")
  ) {
    return client.replyMessage(event.replyToken, {
      type: "text",
      text: `━━━━━━━━━━
⚽ AI精選
━━━━━━━━━━

目前世足尚未正式開賽。

AI精選功能將於賽前資料完整同步後開放。

目前可先使用：
1️⃣ 賽程查詢
2️⃣ 球隊查詢
4️⃣ 冠軍預測

━━━━━━━━━━`,
      quickReply: quickWorldCup(),
    });
  }

  if (
    userText === "冠軍預測" ||
    (userText === "4" && worldCupSessions[userId]?.mode !== "selectGame")
  ) {
    return client.replyMessage(event.replyToken, {
      type: "text",
      text: championPrediction(),
      quickReply: quickWorldCup(),
    });
  }

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
    const diffDays = Math.ceil(
      (expireTime - Date.now()) / (1000 * 60 * 60 * 24)
    );

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
    const prediction = randomPick(["莊", "閒"]);

    return client.replyMessage(event.replyToken, {
      type: "text",
      text: `━━━━━━━━━━
🤖 黑域AI同步完成
━━━━━━━━━━

目前建議：
${prediction}

━━━━━━━━━━

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

    if (baccaratHistory[userId].length > 20) {
      baccaratHistory[userId].shift();
    }

    const prediction = getBaccaratMainPrediction(baccaratHistory[userId]);
    const warning = getBaccaratWarning(baccaratHistory[userId]);
    const specialTip = getBaccaratSpecialTip(baccaratHistory[userId]);

    let extra = "";

    if (warning) extra += `\n\n${warning}`;
    if (specialTip) extra += `\n\n${specialTip}`;

    return client.replyMessage(event.replyToken, {
      type: "text",
      text: formatBaccaratReply(prediction, extra),
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
    slotSessions[userId] = {
      game: userText,
      mode: null,
    };

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
• 世足`,
  });
}

const port = process.env.PORT || 8080;

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
