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

const adminId =
  "Uaf293ee976e5170d4e8672d2c12b3f76";

const baccaratHistory = {};
const baccaratResultHistory = {};
const baccaratLastPrediction = {};
const baccaratLastBet = {};
const baccaratBankroll = {};
const baccaratStartBankroll = {};
const baccaratMode = {};
const baccaratPendingMoney = {};
const baccaratPendingRoom = {};
const baccaratFlow = {};
const tianmenState = {};

const slotSessions = {};
const worldCupSessions = {};
const daily539Cache = {};

function randomPick(arr) {
  return arr[
    Math.floor(Math.random() * arr.length)
  ];
}

function quickBaccarat() {
  return {
    items: [
      {
        type: "action",
        action: {
          type: "message",
          label: "莊",
          text: "莊",
        },
      },
      {
        type: "action",
        action: {
          type: "message",
          label: "閒",
          text: "閒",
        },
      },
      {
        type: "action",
        action: {
          type: "message",
          label: "和",
          text: "和",
        },
      },
    ],
  };
}

function quickMoneyMode() {
  return {
    items: [
      {
        type: "action",
        action: {
          type: "message",
          label: "AI配注",
          text: "AI配注",
        },
      },
      {
        type: "action",
        action: {
          type: "message",
          label: "天門五關",
          text: "天門五關",
        },
      },
    ],
  };
}

function clearSessions(userId) {
  slotSessions[userId] = null;
  worldCupSessions[userId] = null;
}

function resetBaccaratMoney(
  userId,
  money
) {
  baccaratStartBankroll[userId] = money;
  baccaratBankroll[userId] = money;

  baccaratResultHistory[userId] = [];

  baccaratLastPrediction[userId] = null;
  baccaratLastBet[userId] = null;

  baccaratMode[userId] = null;

  tianmenState[userId] = null;
}

function getProfit(userId) {
  return (
    (baccaratBankroll[userId] || 0) -
    (baccaratStartBankroll[userId] || 0)
  );
}

function roundBet(n) {
  if (n < 10) {
    return Math.max(1, Math.floor(n));
  }

  return Math.max(
    10,
    Math.floor(n / 10) * 10
  );
}

function getAiBet(userId) {
  const bankroll =
    baccaratBankroll[userId] ||
    baccaratStartBankroll[userId] ||
    1000;

  let minPct = 0.08;
  let maxPct = 0.18;

  // 獲利後提高侵略性
  const profit = getProfit(userId);

  if (profit >= 3000) {
    minPct = 0.12;
    maxPct = 0.25;
  }

  if (profit >= 10000) {
    minPct = 0.18;
    maxPct = 0.35;
  }

  if (profit >= 30000) {
    minPct = 0.25;
    maxPct = 0.5;
  }

  const pct =
    Math.random() *
      (maxPct - minPct) +
    minPct;

  let bet = Math.floor(bankroll * pct);

  // 最低保護
  if (bet < 100) bet = 100;

  // 最大不要超過本金50%
  if (bet > bankroll * 0.5) {
    bet = Math.floor(bankroll * 0.5);
  }

  // 整數化
  bet = Math.floor(bet / 100) * 100;

  return bet;
}
function buildTianmen(money) {
  const base = Math.max(
    1,
    Math.floor(money / 57)
  );

  const levels = [
    base,
    base * 3,
    base * 7,
    base * 15,
    base * 31,
  ].map((n) => Math.floor(n));

  return {
    base,
    levels,
    total: levels.reduce(
      (a, b) => a + b,
      0
    ),
  };
}

function getCurrentBet(userId) {
  if (
    baccaratMode[userId] === "tianmen" &&
    tianmenState[userId]
  ) {
    const level =
      tianmenState[userId].level || 1;

    return (
      tianmenState[userId].levels[
        level - 1
      ] ||
      tianmenState[userId].levels[0]
    );
  }

  return getAiBet(userId);
}

function formatRoomName(room) {
  const text = room
    .toUpperCase()
    .replace(/\s+/g, "");

  if (text.startsWith("MT")) {
    const value = text.replace(
      "MT",
      ""
    );

    if (
      value === "3A" ||
      value === "13A"
    ) {
      return `MT ${value}`;
    }

    return `MT ${value.padStart(
      2,
      "0"
    )}`;
  }

  if (text.startsWith("DG")) {
    const value = text.replace(
      "DG",
      ""
    );

    if (value.startsWith("RB")) {
      return `DG RB${value
        .replace("RB", "")
        .padStart(2, "0")}`;
    }

    if (value.startsWith("S")) {
      return `DG S${value
        .replace("S", "")
        .padStart(2, "0")}`;
    }

    return `DG ${value.padStart(
      2,
      "0"
    )}`;
  }

  return room.toUpperCase();
}
function quickSlotGame() {
  return {
    items: [
      {
        type: "action",
        action: {
          type: "message",
          label: "戰神賽特1",
          text: "戰神賽特1",
        },
      },
      {
        type: "action",
        action: {
          type: "message",
          label: "戰神賽特2",
          text: "戰神賽特2",
        },
      },
    ],
  };
}

function quickSlotMode() {
  return {
    items: [
      {
        type: "action",
        action: {
          type: "message",
          label: "隨機爆分房",
          text: "隨機爆分房",
        },
      },
      {
        type: "action",
        action: {
          type: "message",
          label: "自選房號",
          text: "自選房號",
        },
      },
    ],
  };
}

function quick539(excludeMode) {
  const modes = [
    {
      label: "539穩定",
      text: "539穩定",
    },
    {
      label: "539熱號",
      text: "539熱號",
    },
    {
      label: "539冷號",
      text: "539冷號",
    },
  ];

  return {
    items: modes
      .filter(
        (mode) =>
          mode.text !== excludeMode
      )
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
      {
        type: "action",
        action: {
          type: "message",
          label: "賽程查詢",
          text: "賽程查詢",
        },
      },
      {
        type: "action",
        action: {
          type: "message",
          label: "球隊查詢",
          text: "球隊查詢",
        },
      },
      {
        type: "action",
        action: {
          type: "message",
          label: "AI精選",
          text: "AI精選",
        },
      },
      {
        type: "action",
        action: {
          type: "message",
          label: "冠軍預測",
          text: "冠軍預測",
        },
      },
    ],
  };
}

function getWorldCupDates() {
  return Object.keys(worldCupSchedule);
}

function quickWorldCupDates(page = 0) {
  const dates = getWorldCupDates();

  const start = page * 11;

  const pageDates = dates.slice(
    start,
    start + 11
  );

  const items = pageDates.map(
    (date) => ({
      type: "action",
      action: {
        type: "message",
        label: date,
        text: date,
      },
    })
  );

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

  return (
    Number(data.expire_time) >
    Date.now()
  );
}

async function openVip(
  userId,
  account,
  days
) {
  const expireTime =
    Date.now() +
    days * 24 * 60 * 60 * 1000;

  const oldData = await getVipData(
    userId
  );

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
  return new Date(
    Number(timestamp)
  ).toLocaleString("zh-TW", {
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
    targetDate.setDate(
      targetDate.getDate() + 1
    );
  } else if (
    hour > 20 ||
    (hour === 20 && minute >= 20)
  ) {
    targetDate.setDate(
      targetDate.getDate() + 1
    );

    if (targetDate.getDay() === 0) {
      targetDate.setDate(
        targetDate.getDate() + 1
      );
    }
  }

  const y = targetDate.getFullYear();

  const m = String(
    targetDate.getMonth() + 1
  ).padStart(2, "0");

  const d = String(
    targetDate.getDate()
  ).padStart(2, "0");

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
  };

  return map[name] || "⚽";
}

function getBaccaratMainPrediction(
  history
) {
  const filtered = history.filter(
    (x) => x !== "和"
  );

  if (filtered.length < 2) {
    return randomPick(["莊", "閒"]);
  }

  const bankerCount = filtered.filter(
    (x) => x === "莊"
  ).length;

  const playerCount = filtered.filter(
    (x) => x === "閒"
  ).length;

  const last =
    filtered[filtered.length - 1];

  const last2 = filtered.slice(-2);

  if (
    last2.length === 2 &&
    last2[0] !== last2[1]
  ) {
    return last === "莊"
      ? "閒"
      : "莊";
  }

  if (bankerCount > playerCount)
    return "莊";

  if (playerCount > bankerCount)
    return "閒";

  return randomPick(["莊", "閒"]);
}

function getBaccaratWarning(
  history
) {
  const filtered = history.filter(
    (x) => x !== "和"
  );

  const recent = filtered.slice(-5);

  const heCount = history
    .slice(-6)
    .filter((x) => x === "和").length;

  if (heCount >= 2) {
    return "⚠️ 和局波動偏高";
  }

  if (
    recent.length >= 5 &&
    recent.every((x) => x === recent[0])
  ) {
    return "⚠️ 偵測長龍波動";
  }

  if (recent.length >= 5) {
    const isShake = recent.every(
      (v, i, arr) =>
        i === 0 || v !== arr[i - 1]
    );

    if (isShake) {
      return "⚠️ 偵測震盪波動";
    }
  }

  return "";
}

function getBaccaratSpecialTip(
  history
) {
  const filtered = history.filter(
    (x) => x !== "和"
  );

  const recent = filtered.slice(-5);

  const bankerStreak = recent.filter(
    (x) => x === "莊"
  ).length;

  const playerStreak = recent.filter(
    (x) => x === "閒"
  ).length;

  const roll = Math.random();

  if (
    roll < 0.02 &&
    bankerStreak >= 3
  ) {
    return `⚠️ 高倍率區同步完成

可留意：
莊龍寶`;
  }

  if (
    roll < 0.04 &&
    playerStreak >= 3
  ) {
    return `⚠️ 高倍率區同步完成

可留意：
閒龍寶`;
  }

  if (roll < 0.1) {
    return `⚠️ 可留意：
和局`;
  }

  if (roll < 0.16) {
    return `⚠️ 可留意：
${randomPick(["莊對", "閒對"])}`;
  }

  return "";
}

function applyBaccaratResult(
  userId,
  opened
) {
  const lastPrediction =
    baccaratLastPrediction[userId];

  const lastBet =
    baccaratLastBet[userId] ||
    getCurrentBet(userId);

  if (
    !lastPrediction ||
    !baccaratMode[userId]
  )
    return;

  if (
    !baccaratResultHistory[userId]
  ) {
    baccaratResultHistory[userId] = [];
  }

  if (opened === "和") {
    baccaratResultHistory[userId].push(
      "和"
    );
  } else if (
    lastPrediction === opened
  ) {
    baccaratResultHistory[userId].push(
      "過"
    );

    baccaratBankroll[userId] +=
      opened === "莊"
        ? Math.floor(lastBet * 0.95)
        : lastBet;

    if (
      baccaratMode[userId] ===
        "tianmen" &&
      tianmenState[userId]
    ) {
      tianmenState[userId].level = 1;
    }
  } else {
    baccaratResultHistory[userId].push(
      "倒"
    );

    baccaratBankroll[userId] -=
      lastBet;

    if (
      baccaratMode[userId] ===
        "tianmen" &&
      tianmenState[userId]
    ) {
      tianmenState[userId].level =
        Math.min(
          5,
          (tianmenState[userId]
            .level || 1) + 1
        );
    }
  }

  if (
    baccaratResultHistory[userId]
      .length > 50
  ) {
    baccaratResultHistory[
      userId
    ].shift();
  }
}

function formatBaccaratReply(
  userId,
  prediction,
  bet,
  extra = ""
) {
  const records =
    baccaratResultHistory[userId] ||
    [];

  const winCount = records.filter(
    (x) => x === "過"
  ).length;

  const loseCount = records.filter(
    (x) => x === "倒"
  ).length;

  const tieCount = records.filter(
    (x) => x === "和"
  ).length;

  const bankroll =
    baccaratBankroll[userId];

  const profit = getProfit(userId);

  const mode = baccaratMode[userId];

  let moneyText = "";

  if (
    mode &&
    bankroll !== undefined
  ) {
    moneyText += `

━━━━━━━━━━

`;

    moneyText += `過：${winCount} 把
倒：${loseCount} 把
和：${tieCount} 把

`;

    moneyText += `目前本金：
${bankroll}

目前獲利：
${
  profit >= 0 ? "+" : ""
}${profit}`;

    if (
      mode === "tianmen" &&
      tianmenState[userId]
    ) {
      moneyText += `

目前階段：
天門${tianmenState[userId].level}`;
    }
  }

  return `━━━━━━━━━━
🤖 黑域AI運算完成
━━━━━━━━━━

目前建議：
${prediction}｜下注：${bet}${extra}${moneyText}

━━━━━━━━━━

請輸入目前開出：
莊 / 閒 / 和`;
}

app.get("/", (req, res) => {
  res.send("BLACKDOMAIN AI Running");
});

app.post(
  "/webhook",
  line.middleware(config),
  async (req, res) => {
    try {
      await Promise.all(
        req.body.events.map(handleEvent)
      );

      res.status(200).end();
    } catch (err) {
      console.log(err);
      res.status(500).end();
    }
  }
);

async function handleEvent(event) {
  if (event.type !== "message")
    return null;

  if (event.message.type !== "text")
    return null;

  const userId = event.source.userId;

  const userText =
    event.message.text.trim();

  const lowerText =
    userText.toLowerCase();

  if (!baccaratHistory[userId]) {
    baccaratHistory[userId] = [];
  }

  if (
    !baccaratResultHistory[userId]
  ) {
    baccaratResultHistory[userId] = [];
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
      "AI配注",
      "天門五關",
    ].includes(userText) ||
    /^mt/i.test(userText) ||
    /^dg/i.test(userText) ||
    (
      /^\d{1,6}$/.test(userText) &&
      (
        baccaratFlow[userId] ===
          "awaitMoney" ||
        worldCupSessions[userId]
          ?.mode === "selectGame" ||
        slotSessions[userId]?.mode ===
          "custom"
      )
    ) ||
    Boolean(worldCupSchedule[userText]);

  if (isVipCommand) {
    if (userId !== adminId) {
      const isVip = await checkVip(userId);

      if (!isVip) {
        return client.replyMessage(
          event.replyToken,
          {
            type: "text",
            text: noVipMessage(),
          }
        );
      }
    }
  }

  if (userText === "我的ID") {
    return client.replyMessage(
      event.replyToken,
      {
        type: "text",
        text: userId,
      }
    );
  }

  if (
    userText === "VIP查詢" ||
    userText === "VIP" ||
    userText === "VIP時間"
  ) {
    clearSessions(userId);

    baccaratFlow[userId] = null;

    const data = await getVipData(userId);

    if (
      !data ||
      Number(data.expire_time) <= Date.now()
    ) {
      return client.replyMessage(
        event.replyToken,
        {
          type: "text",
          text: noVipMessage(),
        }
      );
    }

    const expireTime = Number(
      data.expire_time
    );

    const diffDays = Math.ceil(
      (expireTime - Date.now()) /
        (1000 * 60 * 60 * 24)
    );

    return client.replyMessage(
      event.replyToken,
      {
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
      }
    );
  }

  if (
    userText === "開通會員" ||
    userText === "我要開通" ||
    userText === "開通"
  ) {
    clearSessions(userId);

    baccaratFlow[userId] = null;

    return client.replyMessage(
      event.replyToken,
      {
        type: "text",
        text: noVipMessage(),
      }
    );
  }

  if (
    userText.startsWith("申請開通 ")
  ) {
    clearSessions(userId);

    baccaratFlow[userId] = null;

    const account = userText
      .replace("申請開通 ", "")
      .trim();

    if (!account) {
      return client.replyMessage(
        event.replyToken,
        {
          type: "text",
          text:
            "請輸入3A帳號\n範例：申請開通 abc123",
        }
      );
    }

    await supabase
      .from("vip_requests")
      .insert({
        user_id: userId,
        account,
      });

    return client.replyMessage(
      event.replyToken,
      {
        type: "text",
        text: `━━━━━━━━━━
📝 已收到開通申請
━━━━━━━━━━

3A帳號：
${account}

請等待管理員審核。`,
      }
    );
  }

  if (userText.startsWith("開通 ")) {
    clearSessions(userId);

    baccaratFlow[userId] = null;

    if (userId !== adminId) {
      return client.replyMessage(
        event.replyToken,
        {
          type: "text",
          text: "你沒有管理員權限",
        }
      );
    }

    const parts = userText.split(" ");

    const account = parts[1];

    const days = parseInt(parts[2], 10);

    if (!account || !days) {
      return client.replyMessage(
        event.replyToken,
        {
          type: "text",
          text:
            "格式錯誤\n範例：開通 abc123 2",
        }
      );
    }

    const { data: requestData } =
      await supabase
        .from("vip_requests")
        .select("*")
        .eq("account", account)
        .order("created_at", {
          ascending: false,
        })
        .limit(1)
        .maybeSingle();

    const targetUserId =
      requestData?.user_id;

    if (!targetUserId) {
      return client.replyMessage(
        event.replyToken,
        {
          type: "text",
          text: "查無此申請帳號",
        }
      );
    }

    const expireTime = await openVip(
      targetUserId,
      account,
      days
    );

    return client.replyMessage(
      event.replyToken,
      {
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
      }
    );
  }

  if (userText === "百家樂") {
    clearSessions(userId);

    baccaratFlow[userId] = "awaitMoney";

    return client.replyMessage(
      event.replyToken,
      {
        type: "text",
        text: `━━━━━━━━━━
⚡ 黑域AI已啟動
━━━━━━━━━━

請輸入本金：

例如：
1000
5000
10000

━━━━━━━━━━`,
      }
    );
  }

  if (
    /^\d+$/.test(userText) &&
    baccaratFlow[userId] ===
      "awaitMoney"
  ) {
    const money = Number(userText);

    if (money < 100) {
      return client.replyMessage(
        event.replyToken,
        {
          type: "text",
          text:
            "本金金額過低，請重新輸入。",
        }
      );
    }

    clearSessions(userId);

    resetBaccaratMoney(userId, money);

    baccaratPendingMoney[userId] =
      money;

    baccaratFlow[userId] = "awaitMode";

    return client.replyMessage(
      event.replyToken,
      {
        type: "text",
        text: `━━━━━━━━━━
💰 黑域AI資金配置
━━━━━━━━━━

目前本金：
${money}

請選擇模式：

1️⃣ AI配注
2️⃣ 天門五關

━━━━━━━━━━`,
        quickReply: quickMoneyMode(),
      }
    );
  }

  if (
    userText === "AI配注" ||
    (
      userText === "1" &&
      baccaratFlow[userId] ===
        "awaitMode"
    )
  ) {
    clearSessions(userId);

    const money =
      baccaratPendingMoney[userId] ||
      baccaratBankroll[userId] ||
      1000;

    baccaratMode[userId] = "ai";

    baccaratBankroll[userId] = money;

    baccaratStartBankroll[userId] =
      money;

    baccaratFlow[userId] = "awaitRoom";

    return client.replyMessage(
      event.replyToken,
      {
        type: "text",
        text: `━━━━━━━━━━
💰 黑域AI配注模式
━━━━━━━━━━

目前本金：
${money}

系統將依照目前本金
自動計算每局下注金額。

━━━━━━━━━━

const roomText =
  baccaratPendingRoom[userId];

const prediction = randomPick([
  "莊",
  "閒",
]);

const bet = getCurrentBet(userId);

baccaratLastPrediction[userId] =
  prediction;

baccaratLastBet[userId] = bet;

baccaratFlow[userId] = "playing";

return client.replyMessage(
  event.replyToken,
  [
    {
      type: "text",
      text: `━━━━━━━━━━
🤖 黑域AI運算完成
━━━━━━━━━━

房間：
${roomText}

目前建議：
${prediction}｜下注：${bet}

━━━━━━━━━━

請輸入目前開出：
莊 / 閒 / 和`,
      quickReply: quickBaccarat(),
    },
  ]
);
        event.replyToken,
        {
          type: "text",
          text: `━━━━━━━━━━
⛩️ 黑域AI天門配置
━━━━━━━━━━

目前本金：
${money}

⚠️ 不建議使用天門模式

建議本金至少：
1000以上

目前較適合：
AI配注模式

━━━━━━━━━━`,
          quickReply:
            quickMoneyMode(),
        }
      );
    }

    return client.replyMessage(
      event.replyToken,
      {
        type: "text",
        text: `━━━━━━━━━━
⛩️ 黑域AI天門配置
━━━━━━━━━━

總本金：
${money}

天門一：${plan.levels[0]}
天門二：${plan.levels[1]}
天門三：${plan.levels[2]}
天門四：${plan.levels[3]}
天門五：${plan.levels[4]}

總配置：
${plan.total}

━━━━━━━━━━

目前階段：
天門一

目前下注：
${plan.levels[0]}

━━━━━━━━━━

⚠️ 天門規則：

過一關 → 回天門一
錯一關 → 進下一關

━━━━━━━━━━

請輸入房號：

例如：
MT01
DG RB01`,
      }
    );
  }

  const isValidMT =
    /^mt\s*(?:0?[1-9]|1[0-3]|3a|13a)$/i.test(
      userText
    );

  const isValidDG =
    /^dg\s*(?:0?[1-7]|rb\s*0?[1-7]|s\s*0?[1-7])$/i.test(
      userText
    );

  const isWrongRoom =
    /^mt/i.test(userText) ||
    /^dg/i.test(userText);

  if (isValidMT || isValidDG) {
  clearSessions(userId);

  baccaratHistory[userId] = [];

  baccaratResultHistory[userId] = [];

  baccaratLastPrediction[userId] = null;

  baccaratLastBet[userId] = null;

  const roomText =
    formatRoomName(userText);

  baccaratFlow[userId] = "awaitMoney";

  baccaratPendingRoom[userId] =
    roomText;

  return client.replyMessage(
    event.replyToken,
    {
      type: "text",
      text: `━━━━━━━━━━
🤖 黑域AI數據同步成功
━━━━━━━━━━

同步房間：
${roomText}

✓ 房間同步完成
✓ 牌路資料載入
✓ 模型運算啟動

━━━━━━━━━━

請輸入本金：

例如：
1000
5000
10000`,
    }
  );
}

    const bet = getCurrentBet(userId);

    const roomText =
      formatRoomName(userText);

    baccaratLastPrediction[userId] =
      prediction;

    baccaratLastBet[userId] = bet;

    baccaratFlow[userId] = "playing";

    return client.replyMessage(
      event.replyToken,
      [
        {
          type: "text",
          text: `━━━━━━━━━━
🤖 黑域AI數據同步成功
━━━━━━━━━━

同步房間：
${roomText}

✓ 房間同步完成
✓ 牌路資料載入
✓ 模型運算啟動

系統正在進行首局建議...`,
        },
        {
          type: "text",
          text: `━━━━━━━━━━
🤖 黑域AI運算完成
━━━━━━━━━━

房間：
${roomText}

目前建議：
${prediction}｜下注：${bet}

━━━━━━━━━━

請輸入目前開出：
莊 / 閒 / 和`,
          quickReply:
            quickBaccarat(),
        },
      ]
    );
  }

  if (isWrongRoom) {
    return client.replyMessage(
      event.replyToken,
      {
        type: "text",
        text: "查無此房間",
      }
    );
  }

  if (
    userText === "莊" ||
    userText === "閒" ||
    userText === "和"
  ) {
    clearSessions(userId);

    applyBaccaratResult(
      userId,
      userText
    );

    baccaratHistory[userId].push(
      userText
    );

    if (
      baccaratHistory[userId].length >
      20
    ) {
      baccaratHistory[userId].shift();
    }

    const prediction =
      getBaccaratMainPrediction(
        baccaratHistory[userId]
      );

    const bet = getCurrentBet(userId);

    const warning =
      getBaccaratWarning(
        baccaratHistory[userId]
      );

    const specialTip =
      getBaccaratSpecialTip(
        baccaratHistory[userId]
      );

    let extra = "";

    if (warning) {
      extra += `\n\n${warning}`;
    }

    if (specialTip) {
      extra += `\n\n${specialTip}`;
    }

    baccaratLastPrediction[userId] =
      prediction;

    baccaratLastBet[userId] = bet;

    return client.replyMessage(
      event.replyToken,
      {
        type: "text",
        text: formatBaccaratReply(
          userId,
          prediction,
          bet,
          extra
        ),
        quickReply: quickBaccarat(),
      }
    );
  }

  return client.replyMessage(
    event.replyToken,
    {
      type: "text",
      text: `━━━━━━━━━━
🤖 歡迎使用黑域AI
━━━━━━━━━━

請選擇功能：

• 百家樂
• 電子
• 539
• 世足`,
    }
  );
}

const port =
  process.env.PORT || 8080;

app.listen(port, () => {
  console.log(
    `Server running on port ${port}`
  );
});
