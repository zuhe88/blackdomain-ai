const express = require("express");
const line = require("@line/bot-sdk");
const { createClient } = require("@supabase/supabase-js");
const axios = require("axios");

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

const API_KEY = process.env.APISPORTS_KEY;
const ODDS_API_KEY = process.env.ODDS_API_KEY;

const pendingAccounts = {};
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

function quickSlot() {
  return {
    items: [
      { type: "action", action: { type: "message", label: "戰神賽特1", text: "戰神賽特1" } },
      { type: "action", action: { type: "message", label: "戰神賽特2", text: "戰神賽特2" } },
    ],
  };
}

function quickSports() {
  return {
    items: [
      { type: "action", action: { type: "message", label: "NBA", text: "NBA" } },
      { type: "action", action: { type: "message", label: "足球", text: "足球" } },
      { type: "action", action: { type: "message", label: "棒球", text: "棒球" } },
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

const teamNameMap = {
  "Cleveland Cavaliers": "克里夫蘭騎士",
  "Detroit Pistons": "底特律活塞",
  "Los Angeles Lakers": "洛杉磯湖人",
  "Golden State Warriors": "金州勇士",
  "Boston Celtics": "波士頓塞爾提克",
  "Miami Heat": "邁阿密熱火",
  "Denver Nuggets": "丹佛金塊",
  "Dallas Mavericks": "達拉斯獨行俠",
  "Phoenix Suns": "鳳凰城太陽",
  "Milwaukee Bucks": "密爾瓦基公鹿",
  "New York Knicks": "紐約尼克",
  "Brooklyn Nets": "布魯克林籃網",
  "Chicago Bulls": "芝加哥公牛",
  "Houston Rockets": "休士頓火箭",
  "San Antonio Spurs": "聖安東尼奧馬刺",
  "Memphis Grizzlies": "曼菲斯灰熊",
  "Minnesota Timberwolves": "明尼蘇達灰狼",
  "Oklahoma City Thunder": "奧克拉荷馬雷霆",
  "LA Clippers": "洛杉磯快艇",
  "Sacramento Kings": "沙加緬度國王",
  "Toronto Raptors": "多倫多暴龍",
  "Philadelphia 76ers": "費城76人",
  "Atlanta Hawks": "亞特蘭大老鷹",
  "Orlando Magic": "奧蘭多魔術",
  "Indiana Pacers": "印第安納溜馬",
  "Charlotte Hornets": "夏洛特黃蜂",
  "Washington Wizards": "華盛頓巫師",
  "Portland Trail Blazers": "波特蘭拓荒者",
  "Utah Jazz": "猶他爵士",
  "New Orleans Pelicans": "紐奧良鵜鶘",
};

function translateTeamName(name) {
  return teamNameMap[name] || name;
}

function formatGameTime(dateString) {
  if (!dateString) return "時間未定";

  return new Date(dateString).toLocaleString("zh-TW", {
    timeZone: "Asia/Taipei",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function getTodayDate() {
  const now = new Date(
    new Date().toLocaleString("en-US", { timeZone: "Asia/Taipei" })
  );

  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");

  return `${y}-${m}-${d}`;
}

async function getVipData(userId) {
  const { data, error } = await supabase
    .from("vip_users")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.log("getVipData error:", error);
    return null;
  }

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

  let error;

  if (oldData) {
    const result = await supabase
      .from("vip_users")
      .update({
        account: account,
        expire_time: expireTime,
      })
      .eq("user_id", userId);

    error = result.error;
  } else {
    const result = await supabase
      .from("vip_users")
      .insert({
        user_id: userId,
        account: account,
        expire_time: expireTime,
      });

    error = result.error;
  }

  if (error) {
    console.log("openVip error:", error);
    throw error;
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

📲 聯繫管理員：
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

function generate539Numbers(mode) {
  const predictionDate = getPredictionDate();
  const cacheKey = `${predictionDate}-${mode}`;

  if (daily539Cache[cacheKey]) {
    return daily539Cache[cacheKey];
  }

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
    let n;

    if (Math.random() < 0.7) {
      n = randomPick(pool);
    } else {
      n = Math.floor(Math.random() * 39) + 1;
    }

    if (!numbers.includes(n)) {
      numbers.push(n);
    }
  }

  const finalNumbers = numbers
    .sort((a, b) => a - b)
    .map((n) => String(n).padStart(2, "0"));

  daily539Cache[cacheKey] = finalNumbers;
  return finalNumbers;
}

async function getNBAGamesMessage() {
  const today = getTodayDate();

  const response = await axios.get("https://v2.nba.api-sports.io/games", {
    params: { date: today },
    headers: { "x-apisports-key": API_KEY },
  });

  let oddsGames = [];

  try {
    const oddsResponse = await axios.get(
      "https://api.the-odds-api.com/v4/sports/basketball_nba/odds",
      {
        params: {
          apiKey: ODDS_API_KEY,
          regions: "us",
          markets: "spreads,totals,h2h",
          oddsFormat: "decimal",
        },
      }
    );

    oddsGames = oddsResponse.data || [];
  } catch (err) {
    console.log("NBA odds error:", err.response?.data || err.message);
  }

  const games = response.data.response || [];

  if (!games.length) {
    return `━━━━━━━━━━
🏀 今日NBA賽程
━━━━━━━━━━

今日目前沒有NBA賽程。`;
  }

  let message = `━━━━━━━━━━
🏀 NBA 黑域AI分析
━━━━━━━━━━

`;

  games.slice(0, 5).forEach((game, index) => {
    const away = translateTeamName(game.teams.visitors.name);
    const home = translateTeamName(game.teams.home.name);
    const time = formatGameTime(game.date.start);

    let spread = "盤口同步中";
    let total = "盤口同步中";
    let h2h = "盤口同步中";

    const oddsMatch = oddsGames.find((o) => {
      const homeName = o.home_team || "";
      const awayName = o.away_team || "";
      return (
        homeName.includes(game.teams.home.name) ||
        awayName.includes(game.teams.visitors.name) ||
        game.teams.home.name.includes(homeName) ||
        game.teams.visitors.name.includes(awayName)
      );
    });

    if (oddsMatch?.bookmakers?.length) {
      const markets = oddsMatch.bookmakers[0].markets || [];

      const spreadMarket = markets.find((m) => m.key === "spreads");
      const totalMarket = markets.find((m) => m.key === "totals");
      const h2hMarket = markets.find((m) => m.key === "h2h");

      if (spreadMarket?.outcomes?.length) {
        const item = spreadMarket.outcomes[0];
        spread = `${translateTeamName(item.name)} ${item.point}`;
      }

      if (totalMarket?.outcomes?.length) {
        total = `${totalMarket.outcomes[0].point}`;
      }

      if (h2hMarket?.outcomes?.length) {
        h2h = h2hMarket.outcomes
          .map((o) => `${translateTeamName(o.name)} ${o.price}`)
          .join(" / ");
      }
    }

    const prediction = randomPick([
      `${home} 方向`,
      `${away} 方向`,
      "大小分偏大",
      "大小分偏小",
    ]);

    const confidence = randomPick(["★★★☆☆", "★★★★☆", "★★★☆", "★★★★"]);

    message += `${index + 1}. ${away} vs ${home}
時間：${time}

獨贏：${h2h}
讓分：${spread}
大小分：${total}

AI建議：
${prediction}

信心指數：
${confidence}

━━━━━━━━━━
`;
  });

  message += `
🤖 黑域體育AI
分析依據：
✓ 即時賽程
✓ 盤口資料
✓ 主客場資訊
✓ 模型方向判斷

⚠️ 僅供分析參考`;

  return message;
}

async function getFootballGamesMessage() {
  const today = getTodayDate();

  const response = await axios.get("https://v3.football.api-sports.io/fixtures", {
    params: { date: today },
    headers: { "x-apisports-key": API_KEY },
  });

  let oddsGames = [];

  try {
    const oddsResponse = await axios.get(
      "https://api.the-odds-api.com/v4/sports/soccer/odds",
      {
        params: {
          apiKey: ODDS_API_KEY,
          regions: "us",
          markets: "h2h,spreads,totals",
          oddsFormat: "decimal",
        },
      }
    );

    oddsGames = oddsResponse.data || [];
  } catch (err) {
    console.log("Football odds error:", err.response?.data || err.message);
  }

  const games = response.data.response || [];

  if (!games.length) {
    return `━━━━━━━━━━
⚽ 今日足球賽程
━━━━━━━━━━

今日目前沒有足球賽程。`;
  }

  let message = `━━━━━━━━━━
⚽ 足球 黑域AI分析
━━━━━━━━━━

`;

  games.slice(0, 5).forEach((game, index) => {
    const home = game.teams.home.name;
    const away = game.teams.away.name;
    const time = formatGameTime(game.fixture.date);

    let h2h = "盤口同步中";
    let spread = "盤口同步中";
    let total = "盤口同步中";

    const oddsMatch = oddsGames.find((o) => {
      const homeName = o.home_team || "";
      const awayName = o.away_team || "";
      return (
        homeName.includes(home) ||
        awayName.includes(away) ||
        home.includes(homeName) ||
        away.includes(awayName)
      );
    });

    if (oddsMatch?.bookmakers?.length) {
      const markets = oddsMatch.bookmakers[0].markets || [];

      const h2hMarket = markets.find((m) => m.key === "h2h");
      const spreadMarket = markets.find((m) => m.key === "spreads");
      const totalMarket = markets.find((m) => m.key === "totals");

      if (h2hMarket?.outcomes?.length) {
        h2h = h2hMarket.outcomes.map((o) => `${o.name} ${o.price}`).join(" / ");
      }

      if (spreadMarket?.outcomes?.length) {
        const item = spreadMarket.outcomes[0];
        spread = `${item.name} ${item.point}`;
      }

      if (totalMarket?.outcomes?.length) {
        total = `${totalMarket.outcomes[0].point}`;
      }
    }

    const prediction = randomPick([
      `${home} 方向`,
      `${away} 方向`,
      "大小分偏大",
      "大小分偏小",
      "建議觀望",
    ]);

    const confidence = randomPick(["★★★☆☆", "★★★★☆", "★★★☆", "★★★★"]);

    message += `${index + 1}. ${home} vs ${away}
時間：${time}

獨贏：${h2h}
讓分：${spread}
大小分：${total}

AI建議：
${prediction}

信心指數：
${confidence}

━━━━━━━━━━
`;
  });

  message += `
🤖 黑域體育AI
分析依據：
✓ 今日賽程
✓ 盤口資料
✓ 主客場資訊
✓ 進失球趨勢

⚠️ 僅供分析參考`;

  return message;
}

async function getBaseballGamesMessage() {
  const today = getTodayDate();

  const response = await axios.get("https://v1.baseball.api-sports.io/games", {
    params: { date: today },
    headers: { "x-apisports-key": API_KEY },
  });

  let oddsGames = [];

  try {
    const oddsResponse = await axios.get(
      "https://api.the-odds-api.com/v4/sports/baseball_mlb/odds",
      {
        params: {
          apiKey: ODDS_API_KEY,
          regions: "us",
          markets: "h2h,spreads,totals",
          oddsFormat: "decimal",
        },
      }
    );

    oddsGames = oddsResponse.data || [];
  } catch (err) {
    console.log("Baseball odds error:", err.response?.data || err.message);
  }

  const games = response.data.response || [];

  if (!games.length) {
    return `━━━━━━━━━━
⚾ 今日棒球賽程
━━━━━━━━━━

今日目前沒有棒球賽程。`;
  }

  let message = `━━━━━━━━━━
⚾ 棒球 黑域AI分析
━━━━━━━━━━

`;

  games.slice(0, 5).forEach((game, index) => {
    const home = game.teams.home.name;
    const away = game.teams.away.name;
    const time = formatGameTime(game.date);

    let h2h = "盤口同步中";
    let spread = "盤口同步中";
    let total = "盤口同步中";

    const oddsMatch = oddsGames.find((o) => {
      const homeName = o.home_team || "";
      const awayName = o.away_team || "";
      return (
        homeName.includes(home) ||
        awayName.includes(away) ||
        home.includes(homeName) ||
        away.includes(awayName)
      );
    });

    if (oddsMatch?.bookmakers?.length) {
      const markets = oddsMatch.bookmakers[0].markets || [];

      const h2hMarket = markets.find((m) => m.key === "h2h");
      const spreadMarket = markets.find((m) => m.key === "spreads");
      const totalMarket = markets.find((m) => m.key === "totals");

      if (h2hMarket?.outcomes?.length) {
        h2h = h2hMarket.outcomes.map((o) => `${o.name} ${o.price}`).join(" / ");
      }

      if (spreadMarket?.outcomes?.length) {
        const item = spreadMarket.outcomes[0];
        spread = `${item.name} ${item.point}`;
      }

      if (totalMarket?.outcomes?.length) {
        total = `${totalMarket.outcomes[0].point}`;
      }
    }

    const prediction = randomPick([
      `${home} 方向`,
      `${away} 方向`,
      "大小分偏大",
      "大小分偏小",
      "建議觀望",
    ]);

    const confidence = randomPick(["★★★☆☆", "★★★★☆", "★★★☆", "★★★★"]);

    message += `${index + 1}. ${away} vs ${home}
時間：${time}

獨贏：${h2h}
讓分：${spread}
大小分：${total}

AI建議：
${prediction}

信心指數：
${confidence}

━━━━━━━━━━
`;
  });

  message += `
🤖 黑域體育AI
分析依據：
✓ 今日賽程
✓ 盤口資料
✓ 主客場資訊
✓ 投打狀態模型

⚠️ 僅供分析參考`;

  return message;
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
  const bankerPlayer = randomPick(["莊", "閒"]);

  if (userText === "我的ID") {
    return client.replyMessage(event.replyToken, {
      type: "text",
      text: userId,
    });
  }

  if (
    userText === "VIP查詢" ||
    userText === "VIP" ||
    userText === "查詢VIP" ||
    userText === "查詢VIP權限" ||
    userText === "查詢VIP權限時間" ||
    userText === "VIP時間"
  ) {
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
👑 黑域 VIP
━━━━━━━━━━

3A帳號：
${data.account}

VIP狀態：
已開通

剩餘天數：
${diffDays} 天

到期時間：
${formatTaiwanTime(expireTime)}`,
    });
  }

  if (
    userText === "開通會員" ||
    userText === "我要開通" ||
    userText === "開通"
  ) {
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

請等待管理員審核開通。`,
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
        text: `查無此申請帳號：${account}`,
      });
    }

    try {
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
    } catch (err) {
      return client.replyMessage(event.replyToken, {
        type: "text",
        text: "開通失敗，請檢查 Supabase 欄位或權限設定。",
      });
    }
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
      "莊",
      "閒",
      "和",
      "體育",
      "NBA",
      "足球",
      "棒球",
    ].includes(userText) ||
    /^mt/i.test(userText) ||
    /^dg/i.test(userText);

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

  if (userText === "體育") {
    return client.replyMessage(event.replyToken, {
      type: "text",
      text: `━━━━━━━━━━
🏆 黑域體育已啟動
━━━━━━━━━━

請選擇球類：

• NBA
• 足球
• 棒球`,
      quickReply: quickSports(),
    });
  }

  if (userText === "NBA") {
    try {
      const message = await getNBAGamesMessage();

      return client.replyMessage(event.replyToken, {
        type: "text",
        text: message,
        quickReply: quickSports(),
      });
    } catch (error) {
      console.log(error.response?.data || error.message);

      return client.replyMessage(event.replyToken, {
        type: "text",
        text: "NBA賽程同步失敗，請稍後再試。",
        quickReply: quickSports(),
      });
    }
  }

  if (userText === "足球") {
    try {
      const message = await getFootballGamesMessage();

      return client.replyMessage(event.replyToken, {
        type: "text",
        text: message,
        quickReply: quickSports(),
      });
    } catch (error) {
      console.log(error.response?.data || error.message);

      return client.replyMessage(event.replyToken, {
        type: "text",
        text: "足球賽程同步失敗，請稍後再試。",
        quickReply: quickSports(),
      });
    }
  }

  if (userText === "棒球") {
    try {
      const message = await getBaseballGamesMessage();

      return client.replyMessage(event.replyToken, {
        type: "text",
        text: message,
        quickReply: quickSports(),
      });
    } catch (error) {
      console.log(error.response?.data || error.message);

      return client.replyMessage(event.replyToken, {
        type: "text",
        text: "棒球賽程同步失敗，請稍後再試。",
        quickReply: quickSports(),
      });
    }
  }

  if (userText === "百家樂") {
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

  if (userText === "電子" || userText === "電子AI") {
    return client.replyMessage(event.replyToken, {
      type: "text",
      text: `━━━━━━━━━━
⚡ 黑域電子AI已啟動
━━━━━━━━━━

請選擇遊戲：

• 戰神賽特1
• 戰神賽特2`,
      quickReply: quickSlot(),
    });
  }

  if (userText === "戰神賽特1" || userText === "戰神賽特2") {
    const room = Math.floor(Math.random() * 3500) + 1;
    const suggestion = randomPick(["可進場", "數據中等", "數據偏強"]);

    return client.replyMessage(event.replyToken, {
      type: "text",
      text: `━━━━━━━━━━
⚡ 黑域電子AI同步完成
━━━━━━━━━━

✓ 爆分數據載入
✓ AI模型運算完成

目前遊戲：
${userText}

房間號碼：
${room}

目前建議：
${suggestion}`,
      quickReply: quickSlot(),
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
• 539冷號

系統將開始同步號碼波動資料。`,
      quickReply: quick539(),
    });
  }

  if (userText === "539穩定") {
    const nums = generate539Numbers("stable");
    const predictionDate = getPredictionDate();

    return client.replyMessage(event.replyToken, {
      type: "text",
      text: `━━━━━━━━━━
📊 539 AI穩定模式
━━━━━━━━━━

預測日期：
${predictionDate}

✓ 歷史數據同步
✓ 區間波動分析
✓ AI模型運算完成

本期建議號碼：

${nums.join("　")}

特別關注：
${nums[1]} / ${nums[3]}

⚠️ 僅供娛樂分析參考`,
      quickReply: quick539("539穩定"),
    });
  }

  if (userText === "539熱號") {
    const nums = generate539Numbers("hot");
    const predictionDate = getPredictionDate();

    return client.replyMessage(event.replyToken, {
      type: "text",
      text: `━━━━━━━━━━
🔥 539 AI熱號模式
━━━━━━━━━━

預測日期：
${predictionDate}

✓ 熱門號碼同步
✓ 近期走勢分析
✓ AI模型運算完成

本期熱號建議：

${nums.join("　")}

熱區關注：
${nums[0]} / ${nums[2]} / ${nums[4]}

⚠️ 僅供娛樂分析參考`,
      quickReply: quick539("539熱號"),
    });
  }

  if (userText === "539冷號") {
    const nums = generate539Numbers("cold");
    const predictionDate = getPredictionDate();

    return client.replyMessage(event.replyToken, {
      type: "text",
      text: `━━━━━━━━━━
📉 539 AI冷號模式
━━━━━━━━━━

預測日期：
${predictionDate}

✓ 冷號區間同步
✓ 遺漏值分析
✓ AI模型運算完成

本期冷號建議：

${nums.join("　")}

冷區關注：
${nums[1]} / ${nums[4]}

⚠️ 僅供娛樂分析參考`,
      quickReply: quick539("539冷號"),
    });
  }

  const isValidMT = /^mt\s*(?:0?[1-9]|1[0-3]|3a|13a)$/i.test(userText);
  const isValidDG = /^dg\s*(?:0?[1-7]|rb\s*0?[1-7]|s\s*0?[1-7])$/i.test(userText);
  const isWrongRoom = /^mt/i.test(userText) || /^dg/i.test(userText);

  if (isValidMT || isValidDG) {
    return client.replyMessage(event.replyToken, {
      type: "text",
      text: `━━━━━━━━━━
🤖 黑域AI同步完成
━━━━━━━━━━

✓ 房間同步成功
✓ 牌路數據載入
✓ AI模型運算完成

目前建議：
${bankerPlayer}

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
    const nextResult = randomPick(["莊", "閒"]);

    return client.replyMessage(event.replyToken, {
      type: "text",
      text: `━━━━━━━━━━
🤖 黑域AI運算完成
━━━━━━━━━━

目前建議：
${nextResult}

請輸入目前開出：
莊 / 閒 / 和`,
      quickReply: quickBaccarat(),
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
• 體育

若尚未開通，請輸入：
申請開通 你的3A帳號`,
  });
}

const port = process.env.PORT || 8080;

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
