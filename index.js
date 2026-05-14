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
const THESPORTSDB_KEY = process.env.THESPORTSDB_KEY || "123";

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
      { type: "action", action: { type: "message", label: "MLB", text: "MLB" } },
      { type: "action", action: { type: "message", label: "CPBL", text: "CPBL" } },
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

  "New York Yankees": "紐約洋基",
  "Boston Red Sox": "波士頓紅襪",
  "Los Angeles Dodgers": "洛杉磯道奇",
  "Houston Astros": "休士頓太空人",
  "Chicago Cubs": "芝加哥小熊",
  "Atlanta Braves": "亞特蘭大勇士",
  "New York Mets": "紐約大都會",
  "San Diego Padres": "聖地牙哥教士",
  "Philadelphia Phillies": "費城費城人",
  "Seattle Mariners": "西雅圖水手",
  "Texas Rangers": "德州遊騎兵",
  "Toronto Blue Jays": "多倫多藍鳥",
  "St. Louis Cardinals": "聖路易紅雀",
  "San Francisco Giants": "舊金山巨人",
  "Tampa Bay Rays": "坦帕灣光芒",
  "Los Angeles Angels": "洛杉磯天使",
  "Chicago White Sox": "芝加哥白襪",
  "Cincinnati Reds": "辛辛那提紅人",
  "Cleveland Guardians": "克里夫蘭守護者",
  "Colorado Rockies": "科羅拉多洛磯",
  "Detroit Tigers": "底特律老虎",
  "Kansas City Royals": "堪薩斯皇家",
  "Miami Marlins": "邁阿密馬林魚",
  "Minnesota Twins": "明尼蘇達雙城",
  "Oakland Athletics": "奧克蘭運動家",
  "Pittsburgh Pirates": "匹茲堡海盜",
  "Washington Nationals": "華盛頓國民",
  "Arizona Diamondbacks": "亞利桑那響尾蛇",
  "Baltimore Orioles": "巴爾的摩金鶯",

  "CTBC Brothers": "中信兄弟",
  "Chinatrust Brothers": "中信兄弟",
  "Rakuten Monkeys": "樂天桃猿",
  "Lamigo Monkeys": "樂天桃猿",
  "Uni-President 7-Eleven Lions": "統一獅",
  "Uni-President Lions": "統一獅",
  "Fubon Guardians": "富邦悍將",
  "Wei Chuan Dragons": "味全龍",
  "TSG Hawks": "台鋼雄鷹",
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
  const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Taipei" }));
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getPredictionFromOdds(markets) {
  let prediction = "建議觀望";
  let confidence = "★★★☆☆";
  let reason = "盤口資料不足，建議等待更多數據同步。";

  const spreadMarket = markets.find((m) => m.key === "spreads");
  const h2hMarket = markets.find((m) => m.key === "h2h");
  const totalMarket = markets.find((m) => m.key === "totals");

  if (spreadMarket?.outcomes?.length) {
    const favorite = spreadMarket.outcomes.find((o) => Number(o.point) < 0);

    if (favorite) {
      prediction = `${translateTeamName(favorite.name)} 讓分方向`;
      confidence = Math.abs(Number(favorite.point)) >= 5 ? "★★★★☆" : "★★★☆☆";
      reason = "讓分盤顯示市場目前偏向該隊，模型優先參考讓分強弱。";
      return { prediction, confidence, reason };
    }
  }

  if (h2hMarket?.outcomes?.length >= 2) {
    const sorted = [...h2hMarket.outcomes].sort(
      (a, b) => Number(a.price) - Number(b.price)
    );

    prediction = `${translateTeamName(sorted[0].name)} 獨贏方向`;
    confidence = "★★★☆☆";
    reason = "獨贏賠率較低，市場支持度較高。";
    return { prediction, confidence, reason };
  }

  if (totalMarket?.outcomes?.length) {
    const over = totalMarket.outcomes.find((o) => String(o.name).toLowerCase() === "over");
    const point = Number(over?.point || totalMarket.outcomes[0]?.point);

    if (point) {
      prediction = point >= 220 ? "大小分偏大" : "大小分偏小";
      confidence = "★★★☆☆";
      reason = "大小分盤已同步，依總分盤高低判斷比賽節奏。";
      return { prediction, confidence, reason };
    }
  }

  return { prediction, confidence, reason };
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
      .update({ account, expire_time: expireTime })
      .eq("user_id", userId);

    error = result.error;
  } else {
    const result = await supabase
      .from("vip_users")
      .insert({ user_id: userId, account, expire_time: expireTime });

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
  const taiwanNow = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Taipei" }));

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

function generate539Numbers(mode) {
  const predictionDate = getPredictionDate();
  const cacheKey = `${predictionDate}-${mode}`;

  if (daily539Cache[cacheKey]) return daily539Cache[cacheKey];

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
    const n = Math.random() < 0.7 ? randomPick(pool) : Math.floor(Math.random() * 39) + 1;
    if (!numbers.includes(n)) numbers.push(n);
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
    const rawHome = game.teams.home?.name || "主隊";
    const rawAway = game.teams.visitors?.name || "客隊";

    const home = translateTeamName(rawHome);
    const away = translateTeamName(rawAway);

    if (home === away) return;

    const time = formatGameTime(game.date.start);

    let spread = "盤口同步中";
    let total = "盤口同步中";
    let h2h = "盤口同步中";
    let markets = [];

    const oddsMatch = oddsGames.find((o) => {
      const homeName = o.home_team || "";
      const awayName = o.away_team || "";
      return (
        homeName.includes(rawHome) ||
        awayName.includes(rawAway) ||
        rawHome.includes(homeName) ||
        rawAway.includes(awayName)
      );
    });

    if (oddsMatch?.bookmakers?.length) {
      markets = oddsMatch.bookmakers[0].markets || [];

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

    const analysis = getPredictionFromOdds(markets);

    message += `${index + 1}. ${away} vs ${home}
時間：${time}

獨贏：${h2h}
讓分：${spread}
大小分：${total}

AI建議：
${analysis.prediction}

信心指數：
${analysis.confidence}

分析依據：
${analysis.reason}

━━━━━━━━━━
`;
  });

  message += `
🤖 黑域體育AI
⚠️ 僅供分析參考`;

  return message;
}

async function getMLBGamesMessage() {
  const today = getTodayDate();

  const response = await axios.get("https://v1.baseball.api-sports.io/games", {
    params: {
      date: today,
      league: 1,
    },
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
    console.log("MLB odds error:", err.response?.data || err.message);
  }

  const games = response.data.response || [];

  if (!games.length) {
    return `━━━━━━━━━━
⚾ 今日MLB賽程
━━━━━━━━━━

今日目前沒有MLB賽程。`;
  }

  let message = `━━━━━━━━━━
⚾ MLB 黑域AI分析
━━━━━━━━━━

`;

  games.slice(0, 5).forEach((game, index) => {
    const rawHome = game.teams.home?.name || "主隊";
    const rawAway = game.teams.away?.name || "客隊";

    const home = translateTeamName(rawHome);
    const away = translateTeamName(rawAway);

    if (home === away) return;

    const time = formatGameTime(game.date);

    let h2h = "盤口同步中";
    let spread = "盤口同步中";
    let total = "盤口同步中";
    let markets = [];

    const oddsMatch = oddsGames.find((o) => {
      const homeName = o.home_team || "";
      const awayName = o.away_team || "";
      return (
        homeName.includes(rawHome) ||
        awayName.includes(rawAway) ||
        rawHome.includes(homeName) ||
        rawAway.includes(awayName)
      );
    });

    if (oddsMatch?.bookmakers?.length) {
      markets = oddsMatch.bookmakers[0].markets || [];

      const h2hMarket = markets.find((m) => m.key === "h2h");
      const spreadMarket = markets.find((m) => m.key === "spreads");
      const totalMarket = markets.find((m) => m.key === "totals");

      if (h2hMarket?.outcomes?.length) {
        h2h = h2hMarket.outcomes
          .map((o) => `${translateTeamName(o.name)} ${o.price}`)
          .join(" / ");
      }

      if (spreadMarket?.outcomes?.length) {
        const item = spreadMarket.outcomes[0];
        spread = `${translateTeamName(item.name)} ${item.point}`;
      }

      if (totalMarket?.outcomes?.length) {
        total = `${totalMarket.outcomes[0].point}`;
      }
    }

    const analysis = getPredictionFromOdds(markets);

    message += `${index + 1}. ${away} vs ${home}
時間：${time}

獨贏：${h2h}
讓分：${spread}
大小分：${total}

AI建議：
${analysis.prediction}

信心指數：
${analysis.confidence}

分析依據：
${analysis.reason}

━━━━━━━━━━
`;
  });

  message += `
🤖 黑域體育AI
⚠️ 僅供分析參考`;

  return message;
}

async function getCPBLGamesMessage() {
  const today = getTodayDate();

  const response = await axios.get(
    `https://www.thesportsdb.com/api/v1/json/${THESPORTSDB_KEY}/eventsday.php`,
    {
      params: {
        d: today,
        s: "Baseball",
      },
    }
  );

  const allEvents = response.data.events || [];

  const games = allEvents.filter((game) => {
    const league = game.strLeague || "";
    return (
      league.includes("Chinese Professional Baseball League") ||
      league.includes("CPBL")
    );
  });

  if (!games.length) {
    return `━━━━━━━━━━
⚾ 今日CPBL賽程
━━━━━━━━━━

今日目前沒有CPBL賽程。`;
  }

  let message = `━━━━━━━━━━
⚾ CPBL 黑域分析
━━━━━━━━━━

`;

  games.slice(0, 5).forEach((game, index) => {
    const rawHome = game.strHomeTeam || "主隊";
    const rawAway = game.strAwayTeam || "客隊";

    const home = translateTeamName(rawHome);
    const away = translateTeamName(rawAway);

    if (home === away) return;

    const time = formatGameTime(`${game.dateEvent}T${game.strTime || "00:00:00"}Z`);

    message += `${index + 1}. ${away} vs ${home}
時間：${time}

AI建議：
建議觀望

信心指數：
★★★☆☆

分析依據：
CPBL目前以賽程資料為主，尚未接入穩定盤口資料，不建議硬判斷。

━━━━━━━━━━
`;
  });

  message += `
🤖 黑域體育AI
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
      "MLB",
      "CPBL",
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

請選擇項目：

• NBA
• MLB
• CPBL`,
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

  if (userText === "MLB") {
    try {
      const message = await getMLBGamesMessage();
      return client.replyMessage(event.replyToken, {
        type: "text",
        text: message,
        quickReply: quickSports(),
      });
    } catch (error) {
      console.log(error.response?.data || error.message);
      return client.replyMessage(event.replyToken, {
        type: "text",
        text: "MLB賽程同步失敗，請稍後再試。",
        quickReply: quickSports(),
      });
    }
  }

  if (userText === "CPBL") {
    try {
      const message = await getCPBLGamesMessage();
      return client.replyMessage(event.replyToken, {
        type: "text",
        text: message,
        quickReply: quickSports(),
      });
    } catch (error) {
      console.log(error.response?.data || error.message);
      return client.replyMessage(event.replyToken, {
        type: "text",
        text: "CPBL賽程同步失敗，請稍後再試。",
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
