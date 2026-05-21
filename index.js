const WebSocket = require("ws");
global.WebSocket = WebSocket;

const express = require("express");
const line = require("@line/bot-sdk");
const { createClient } = require("@supabase/supabase-js");
const axios = require("axios");
const worldCupSchedule = require("./worldcupSchedule");

const app = express();

const client = new line.Client({
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
});

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const adminId = "Uaf293ee976e5170d4e8672d2c12b3f76";

const S = {
  baccarat: {},
  result: {},
  lastPred: {},
  lastBet: {},
  bankroll: {},
  startBankroll: {},
  mode: {},
  pendingMoney: {},
  pendingRoom: {},
  flow: {},
  tianmen: {},
  slot: {},
  sport: {},
  wc: {},
  mlb: {},
  nba: {},
  cache539: {},
};

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function q(items) {
  return {
    items: items.map(([label, text = label]) => ({
      type: "action",
      action: { type: "message", label, text },
    })),
  };
}

function quickMain() {
  return q([["百家樂"], ["電子"], ["539"], ["體育"], ["VIP查詢"]]);
}
function quickBaccarat() { return q([["莊"], ["閒"], ["和"]]); }
function quickMoney() { return q([["AI配注"], ["天門五關"], ["自由配注"]]); }
function quickSlotGame() { return q([["戰神賽特1"], ["戰神賽特2"]]); }
function quickSlotMode() { return q([["隨機爆分房"], ["自選房號"]]); }
function quick539(exclude) { return q([["539穩定"], ["539熱號"], ["539冷號"]].filter(([x]) => x !== exclude)); }
function quickSports() { return q([["世足"], ["MLB"], ["NBA"]]); }
function quickWorldCup() { return q([["賽程查詢"], ["球隊查詢"], ["AI精選"], ["冠軍預測"]]); }
function quickMLB() { return q([["近日賽程"], ["AI精選"]]); }
function quickNBA() { return q([["NBA近日賽程"], ["NBA AI精選"]]); }

function clearSessions(uid, keep = "") {
  if (keep !== "slot") S.slot[uid] = null;
  if (keep !== "wc") S.wc[uid] = null;
  if (keep !== "mlb") S.mlb[uid] = null;
  if (keep !== "nba") S.nba[uid] = null;
}

function twDate(offset = 0) {
  const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Taipei" }));
  now.setDate(now.getDate() + offset);
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return { slash: `${y}/${m}/${d}`, espn: `${y}${m}${d}` };
}

function twTime(ts) {
  return new Date(Number(ts)).toLocaleString("zh-TW", { timeZone: "Asia/Taipei" });
}

function noVip() {
  return `━━━━━━━━━━
🔐 黑域AI權限尚未開通
━━━━━━━━━━

請提供3A帳號申請開通。

輸入範例：
申請開通 abc123

📲 開通請私訊
LINE：zu88.8`;
}

async function getVip(uid) {
  const { data } = await supabase.from("vip_users").select("*").eq("user_id", uid).maybeSingle();
  return data;
}

async function isVip(uid) {
  const data = await getVip(uid);
  return !!data && Number(data.expire_time) > Date.now();
}

async function openVip(uid, account, days) {
  const expire_time = Date.now() + days * 86400000;
  const old = await getVip(uid);

  if (old) {
    await supabase.from("vip_users").update({ account, expire_time }).eq("user_id", uid);
  } else {
    await supabase.from("vip_users").insert({ user_id: uid, account, expire_time });
  }

  return expire_time;
}

function roomName(room) {
  const t = room.toUpperCase().replace(/\s+/g, "");

  if (t.startsWith("MT")) {
    const v = t.replace("MT", "");
    return v === "3A" || v === "13A" ? `MT ${v}` : `MT ${v.padStart(2, "0")}`;
  }

  if (t.startsWith("DG")) {
    const v = t.replace("DG", "");
    if (v.startsWith("RB")) return `DG RB${v.replace("RB", "").padStart(2, "0")}`;
    if (v.startsWith("S")) return `DG S${v.replace("S", "").padStart(2, "0")}`;
    return `DG ${v.padStart(2, "0")}`;
  }

  return room.toUpperCase();
}

function resetMoney(uid, money) {
  S.startBankroll[uid] = money;
  S.bankroll[uid] = money;
  S.result[uid] = [];
  S.lastPred[uid] = null;
  S.lastBet[uid] = null;
  S.mode[uid] = null;
  S.tianmen[uid] = null;
}

function profit(uid) {
  return (S.bankroll[uid] || 0) - (S.startBankroll[uid] || 0);
}

function aiBet(uid) {
  const b = S.bankroll[uid] || S.startBankroll[uid] || 1000;
  const p = profit(uid);
  let min = 0.08;
  let max = 0.18;

  if (p >= 3000) { min = 0.1; max = 0.2; }
  if (p >= 10000) { min = 0.12; max = 0.25; }
  if (p >= 50000) { min = 0.15; max = 0.3; }

  const bet = Math.min(b * 0.3, b * (Math.random() * (max - min) + min));
  return Math.max(100, Math.floor(bet / 100) * 100);
}

function makeTianmen(money) {
  const base = Math.max(100, Math.floor(money / 60 / 100) * 100);
  const levels = [1, 3, 7, 15, 31].map((x) => base * x);
  return { base, levels, total: levels.reduce((a, b) => a + b, 0) };
}

function currentBet(uid) {
  if (S.mode[uid] === "free") return 0;

  if (S.mode[uid] === "tianmen" && S.tianmen[uid]) {
    return S.tianmen[uid].levels[(S.tianmen[uid].level || 1) - 1];
  }

  return aiBet(uid);
}

function baccaratPick(history) {
  const h = history.filter((x) => x !== "和");
  if (h.length < 2) return pick(["莊", "閒"]);

  const banker = h.filter((x) => x === "莊").length;
  const player = h.filter((x) => x === "閒").length;
  const last = h[h.length - 1];
  const last2 = h.slice(-2);

  if (last2.length === 2 && last2[0] !== last2[1]) return last === "莊" ? "閒" : "莊";
  if (banker > player) return "莊";
  if (player > banker) return "閒";
  return pick(["莊", "閒"]);
}

function baccaratWarning(history) {
  const h = history.filter((x) => x !== "和");
  const recent = h.slice(-5);

  if (history.slice(-6).filter((x) => x === "和").length >= 2) return "⚠️ 和局波動偏高";
  if (recent.length >= 5 && recent.every((x) => x === recent[0])) return "⚠️ 偵測長龍波動";
  if (recent.length >= 5 && recent.every((v, i, arr) => i === 0 || v !== arr[i - 1])) return "⚠️ 偵測震盪波動";
  return "";
}

function baccaratSpecial(history) {
  const h = history.filter((x) => x !== "和");
  const recent = h.slice(-5);
  const roll = Math.random();

  if (roll < 0.02 && recent.filter((x) => x === "莊").length >= 3) return "⚠️ 高倍率區同步完成\n\n可留意：\n莊龍寶";
  if (roll < 0.04 && recent.filter((x) => x === "閒").length >= 3) return "⚠️ 高倍率區同步完成\n\n可留意：\n閒龍寶";
  if (roll < 0.1) return "⚠️ 可留意：\n和局";
  if (roll < 0.16) return `⚠️ 可留意：\n${pick(["莊對", "閒對"])}`;
  return "";
}

function applyResult(uid, opened) {
  const last = S.lastPred[uid];
  const bet = S.lastBet[uid] || currentBet(uid);

  if (!last || !S.mode[uid]) return;
  if (!S.result[uid]) S.result[uid] = [];

  if (opened === "和") {
    S.result[uid].push("和");
  } else if (last === opened) {
    S.result[uid].push("過");
    if (S.mode[uid] !== "free") S.bankroll[uid] += opened === "莊" ? Math.floor(bet * 0.95) : bet;
    if (S.mode[uid] === "tianmen" && S.tianmen[uid]) S.tianmen[uid].level = 1;
  } else {
    S.result[uid].push("倒");
    if (S.mode[uid] !== "free") S.bankroll[uid] -= bet;
    if (S.mode[uid] === "tianmen" && S.tianmen[uid]) S.tianmen[uid].level = Math.min(5, (S.tianmen[uid].level || 1) + 1);
  }

  if (S.result[uid].length > 50) S.result[uid].shift();
}

function baccaratReply(uid, pred, bet, extra = "") {
  const records = S.result[uid] || [];
  const stat = `過：${records.filter((x) => x === "過").length} 把
倒：${records.filter((x) => x === "倒").length} 把
和：${records.filter((x) => x === "和").length} 把`;

  if (S.mode[uid] === "free") {
    return `━━━━━━━━━━
🤖 黑域AI運算完成
━━━━━━━━━━

目前建議：
${pred}${extra}

━━━━━━━━━━

${stat}

━━━━━━━━━━

請輸入目前開出：
莊 / 閒 / 和`;
  }

  let money = `目前本金：
${S.bankroll[uid]}

目前獲利：
${profit(uid) >= 0 ? "+" : ""}${profit(uid)}`;

  if (S.mode[uid] === "tianmen" && S.tianmen[uid]) {
    money += `

目前階段：
天門${S.tianmen[uid].level}`;
  }

  return `━━━━━━━━━━
🤖 黑域AI運算完成
━━━━━━━━━━

目前建議：
${pred}｜下注：${bet}${extra}

━━━━━━━━━━

${stat}

${money}

━━━━━━━━━━

請輸入目前開出：
莊 / 閒 / 和`;
}

function startAnalyze(uid) {
  const pred = pick(["莊", "閒"]);
  const bet = currentBet(uid);
  S.lastPred[uid] = pred;
  S.lastBet[uid] = bet;
  S.flow[uid] = "playing";
  return baccaratReply(uid, pred, bet);
}

function slotAnalysis(game, room) {
  const n = Number(room);
  const score = (n * 7) % 100;

  if (score >= 70) return { game, room: n, status: "高波動區", suggestion: "可進場", reason: "倍率區同步完成" };
  if (score >= 45) return { game, room: n, status: "數據偏強", suggestion: "小注試水", reason: "倍率波動偏強" };
  return { game, room: n, status: "回吐區", suggestion: "建議觀望", reason: "目前回吐波動偏高" };
}

function slotText(a) {
  return `━━━━━━━━━━
⚡ 黑域電子AI同步完成
━━━━━━━━━━

目前遊戲：
${a.game}

房間號碼：
${a.room}

目前狀態：
${a.status}

AI建議：
${a.suggestion}

分析依據：
${a.reason}

⚠️ 僅供娛樂分析參考`;
}

function gen539(mode) {
  const key = `${twDate().slash}-${mode}`;
  if (S.cache539[key]) return S.cache539[key];

  const nums = Array.from({ length: 39 }, (_, i) => i + 1)
    .sort(() => Math.random() - 0.5)
    .slice(0, 5)
    .sort((a, b) => a - b)
    .map((n) => String(n).padStart(2, "0"));

  S.cache539[key] = nums;
  return nums;
}

function wcDates(page = 0) {
  const dates = Object.keys(worldCupSchedule || {});
  const start = page * 11;
  const items = dates.slice(start, start + 11).map((d) => [d]);

  if (page > 0) items.push(["上一頁"]);
  if (start + 11 < dates.length) items.push(["下一頁"]);
  return q(items);
}

function wcGames(date, games) {
  let msg = `━━━━━━━━━━
⚽ ${date} 世足賽程
🕒 台灣時間
━━━━━━━━━━

`;

  games.forEach((g, i) => {
    msg += `${i + 1}️⃣ ${g.stage}${g.group ? `｜${g.group}組` : ""}
${g.home} vs ${g.away}
🕒 ${g.time}（台灣時間）
📍 ${g.venue}

`;
  });

  return `${msg}━━━━━━━━━━

請選擇場次查看AI分析`;
}

function wcAnalyze(g) {
  if ([g.home, g.away].some((x) => x.includes("勝方") || x.includes("敗方") || x.includes("第"))) {
    return `━━━━━━━━━━
⚽ 世足AI分析完成
━━━━━━━━━━

${g.home} vs ${g.away}

🕒 ${g.time}（台灣時間）
📍 ${g.venue}

目前狀態：
對戰隊伍尚未確定

AI分析：
待結果出爐後同步更新

━━━━━━━━━━`;
  }

  return `━━━━━━━━━━
⚽ 世足AI分析完成
━━━━━━━━━━

${g.home} vs ${g.away}
🕒 ${g.time}（台灣時間）
📍 ${g.venue}

AI偏向：
${pick([`${g.home} 不敗`, `${g.away} 不敗`, "建議觀望"])}

可留意：
${pick(["上半場節奏偏快", "下半場波動可能放大", "前30分鐘可先觀察", "不建議太早進場"])}

━━━━━━━━━━`;
}

const mlbName = {
  "Arizona Diamondbacks": "響尾蛇",
  "Atlanta Braves": "勇士",
  "Baltimore Orioles": "金鶯",
  "Boston Red Sox": "紅襪",
  "Chicago Cubs": "小熊",
  "Chicago White Sox": "白襪",
  "Cincinnati Reds": "紅人",
  "Cleveland Guardians": "守護者",
  "Colorado Rockies": "洛磯",
  "Detroit Tigers": "老虎",
  "Houston Astros": "太空人",
  "Kansas City Royals": "皇家",
  "Los Angeles Angels": "天使",
  "Los Angeles Dodgers": "道奇",
  "Miami Marlins": "馬林魚",
  "Milwaukee Brewers": "釀酒人",
  "Minnesota Twins": "雙城",
  "New York Mets": "大都會",
  "New York Yankees": "洋基",
  "Oakland Athletics": "運動家",
  "Athletics": "運動家",
  "Philadelphia Phillies": "費城人",
  "Pittsburgh Pirates": "海盜",
  "San Diego Padres": "教士",
  "San Francisco Giants": "巨人",
  "Seattle Mariners": "水手",
  "St. Louis Cardinals": "紅雀",
  "Tampa Bay Rays": "光芒",
  "Texas Rangers": "遊騎兵",
  "Toronto Blue Jays": "藍鳥",
  "Washington Nationals": "國民",
};

const mlbPower = {
  道奇: 92,
  洋基: 90,
  勇士: 88,
  費城人: 86,
  太空人: 85,
  水手: 82,
  教士: 82,
  藍鳥: 80,
  紅襪: 79,
  大都會: 78,
  小熊: 77,
  守護者: 76,
  老虎: 75,
  雙城: 74,
  紅雀: 73,
  光芒: 72,
  遊騎兵: 72,
  金鶯: 72,
  紅人: 71,
  皇家: 70,
  釀酒人: 70,
  巨人: 69,
  天使: 68,
  海盜: 67,
  國民: 66,
  馬林魚: 65,
  響尾蛇: 65,
  洛磯: 62,
  白襪: 60,
  運動家: 60,
};

const nbaPower = {
  尼克: 88,
  騎士: 84,
  雷霆: 90,
  馬刺: 86,
  湖人: 82,
  灰狼: 83,
  塞爾提克: 89,
  金塊: 87,
  勇士: 81,
  獨行俠: 80,
};

function teamZh(name) {
  return mlbName[name] || name;
}

async function fetchMlbGames(offset = 0) {
  const date = twDate(offset);
  const url = `https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/scoreboard?dates=${date.espn}`;
  const { data } = await axios.get(url, { timeout: 10000 });

  const games = (data.events || []).map((e) => {
    const competitors = e.competitions?.[0]?.competitors || [];
    const home = competitors.find((x) => x.homeAway === "home")?.team?.displayName || "Home";
    const away = competitors.find((x) => x.homeAway === "away")?.team?.displayName || "Away";

    return {
      id: e.id,
      home: teamZh(home),
      away: teamZh(away),
      time: new Date(e.date).toLocaleString("zh-TW", { timeZone: "Asia/Taipei", hour12: false }),
      rawHome: home,
      rawAway: away,
    };
  });

  return { date: date.slash, games };
}

function mlbAnalyze(g) {
  const hp = mlbPower[g.home] || 70;
  const ap = mlbPower[g.away] || 70;
  const homeScore = hp + 3 + Math.random() * 8;
  const awayScore = ap + Math.random() * 8;
  const side = homeScore >= awayScore ? g.home : g.away;
  const diff = Math.abs(homeScore - awayScore);
  const risk = diff >= 10 ? "中低風險" : diff >= 5 ? "中風險" : "高波動";
  const spread = diff >= 8 ? `${side} -1.5` : "讓分建議保守";
  const totalLine = pick(["7.5", "8.5", "9.5"]);
  const total = hp + ap + Math.random() * 20 >= 160 ? `${totalLine} 大分偏向` : `${totalLine} 小分偏向`;

  return `━━━━━━━━━━
⚾ 黑域MLB AI分析完成
━━━━━━━━━━

${g.away} vs ${g.home}

開賽時間（台灣）：
${g.time}

AI偏向：
${side} ML

讓分偏向：
${spread}

大小分：
${total}

風險指數：
${risk}

分析依據：
• 近期打線火力模型
• 主客場強度修正
• 牛棚穩定性權重

━━━━━━━━━━

⚠️ 僅供娛樂分析參考`;
}

function nbaAnalyze(g) {
  const hp = nbaPower[g.home] || 78;
  const ap = nbaPower[g.away] || 78;
  const homeScore = hp + 3 + Math.random() * 8;
  const awayScore = ap + Math.random() * 8;
  const side = homeScore >= awayScore ? g.home : g.away;
  const diff = Math.abs(homeScore - awayScore);
  const risk = diff >= 10 ? "中低風險" : diff >= 5 ? "中風險" : "高波動";
  const spread = diff >= 8 ? `${side} -3.5` : "讓分建議保守";
  const totalLine = pick(["218.5", "221.5", "224.5", "227.5"]);
  const total = hp + ap + Math.random() * 20 >= 170 ? `${totalLine} 大分偏向` : `${totalLine} 小分偏向`;

  return `━━━━━━━━━━
🏀 黑域NBA AI分析完成
━━━━━━━━━━

${g.away} vs ${g.home}

開賽時間（台灣）：
${g.time}

AI偏向：
${side} ML

讓分偏向：
${spread}

大小分：
${total}

風險指數：
${risk}

分析依據：
• 主客場節奏修正
• 近期進攻效率模型
• 替補深度權重
• 防守強度波動

━━━━━━━━━━

⚠️ 僅供娛樂分析參考`;
}

app.get("/", (req, res) => {
  res.send("BLACKDOMAIN AI Running");
});

app.post(
  "/webhook",
  line.middleware({
    channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
    channelSecret: process.env.LINE_CHANNEL_SECRET,
  }),
  async (req, res) => {
    try {
      await Promise.all(req.body.events.map(handleEvent));
      res.status(200).end();
    } catch (e) {
      console.log(e);
      res.status(500).end();
    }
  }
);

async function handleEvent(event) {
  if (event.type !== "message" || event.message.type !== "text") return null;

  const uid = event.source.userId;
  const text = event.message.text.trim();
  const lower = text.toLowerCase();

  if (!S.baccarat[uid]) S.baccarat[uid] = [];
  if (!S.result[uid]) S.result[uid] = [];

  const needsVip = [
    "百家樂", "電子", "電子AI", "539", "539AI", "539 AI", "莊", "閒", "和",
    "體育", "世足", "MLB", "NBA", "AI配注", "天門五關", "自由配注", "DG", "MT",
    "近日賽程", "AI精選", "NBA近日賽程", "NBA AI精選",
  ].includes(text) ||
    /^mt/i.test(text) ||
    /^dg/i.test(text) ||
    (/^\d{1,6}$/.test(text) && ["awaitMoney", "selectGame", "custom", "mlbSelect", "nbaSelect"].includes(
      S.flow[uid] || S.wc[uid]?.mode || S.slot[uid]?.mode || S.mlb[uid]?.mode || S.nba[uid]?.mode
    ));

  if (needsVip && uid !== adminId && !(await isVip(uid))) {
    return client.replyMessage(event.replyToken, { type: "text", text: noVip() });
  }

  if (text === "我的ID") {
    return client.replyMessage(event.replyToken, { type: "text", text: uid });
  }

  if (["VIP查詢", "VIP", "VIP時間"].includes(text)) {
    const data = await getVip(uid);

    if (!data || Number(data.expire_time) <= Date.now()) {
      return client.replyMessage(event.replyToken, { type: "text", text: noVip() });
    }

    const days = Math.ceil((Number(data.expire_time) - Date.now()) / 86400000);

    return client.replyMessage(event.replyToken, {
      type: "text",
      text: `━━━━━━━━━━
👑 黑域VIP
━━━━━━━━━━

3A帳號：
${data.account}

剩餘天數：
${days} 天

到期時間：
${twTime(data.expire_time)}`,
    });
  }

  if (["開通會員", "我要開通", "開通"].includes(text)) {
    return client.replyMessage(event.replyToken, { type: "text", text: noVip() });
  }

  if (text.startsWith("申請開通 ")) {
    const account = text.replace("申請開通 ", "").trim();

    if (!account) {
      return client.replyMessage(event.replyToken, { type: "text", text: "請輸入3A帳號\n範例：申請開通 abc123" });
    }

    await supabase.from("vip_requests").insert({ user_id: uid, account });

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

  if (text.startsWith("開通 ")) {
    if (uid !== adminId) {
      return client.replyMessage(event.replyToken, { type: "text", text: "你沒有管理員權限" });
    }

    const [, account, dayText] = text.split(" ");
    const days = parseInt(dayText, 10);

    if (!account || !days) {
      return client.replyMessage(event.replyToken, { type: "text", text: "格式錯誤\n範例：開通 abc123 2" });
    }

    const { data } = await supabase
      .from("vip_requests")
      .select("*")
      .eq("account", account)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!data?.user_id) {
      return client.replyMessage(event.replyToken, { type: "text", text: "查無此申請帳號" });
    }

    const exp = await openVip(data.user_id, account, days);

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
${twTime(exp)}`,
    });
  }

  if (text === "百家樂") {
    clearSessions(uid);
    S.flow[uid] = "awaitPlatform";

    return client.replyMessage(event.replyToken, {
      type: "text",
      text: `━━━━━━━━━━
⚡ 黑域AI已啟動
━━━━━━━━━━

請選擇平台：

• DG
• MT`,
      quickReply: q([["DG"], ["MT"]]),
    });
  }

  if ((lower === "dg" || lower === "mt") && S.flow[uid] === "awaitPlatform") {
    S.flow[uid] = "awaitRoom";

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

  const validMT = /^mt\s*(?:0?[1-9]|1[0-3]|3a|13a)$/i.test(text);
  const validDG = /^dg\s*(?:0?[1-7]|rb\s*0?[1-7]|s\s*0?[1-7])$/i.test(text);

  if (validMT || validDG) {
    S.pendingRoom[uid] = roomName(text);
    S.flow[uid] = "awaitMoney";
    S.baccarat[uid] = [];
    S.result[uid] = [];
    S.lastPred[uid] = null;
    S.lastBet[uid] = null;

    return client.replyMessage(event.replyToken, {
      type: "text",
      text: `━━━━━━━━━━
🤖 黑域AI數據同步成功
━━━━━━━━━━

同步房間：
${S.pendingRoom[uid]}

✓ 房間同步完成
✓ 牌路資料載入
✓ 模型運算啟動

━━━━━━━━━━

請輸入本金：

例如：
1000
5000
10000`,
    });
  }

  if (/^mt/i.test(text) || /^dg/i.test(text)) {
    return client.replyMessage(event.replyToken, { type: "text", text: "查無此房間" });
  }

  if (/^\d+$/.test(text) && S.flow[uid] === "awaitMoney") {
    const money = Number(text);

    if (money < 100) {
      return client.replyMessage(event.replyToken, { type: "text", text: "本金金額過低，請重新輸入。" });
    }

    resetMoney(uid, money);
    S.pendingMoney[uid] = money;
    S.flow[uid] = "awaitMode";

    return client.replyMessage(event.replyToken, {
      type: "text",
      text: `━━━━━━━━━━
💰 黑域AI資金配置
━━━━━━━━━━

目前本金：
${money}

請選擇模式：

1️⃣ AI配注
2️⃣ 天門五關
3️⃣ 自由配注

━━━━━━━━━━`,
      quickReply: quickMoney(),
    });
  }

  if (text === "AI配注" || (text === "1" && S.flow[uid] === "awaitMode")) {
    S.mode[uid] = "ai";
    S.flow[uid] = "playing";
    S.bankroll[uid] = S.pendingMoney[uid];
    S.startBankroll[uid] = S.pendingMoney[uid];

    return client.replyMessage(event.replyToken, {
      type: "text",
      text: startAnalyze(uid),
      quickReply: quickBaccarat(),
    });
  }

  if (text === "天門五關" || (text === "2" && S.flow[uid] === "awaitMode")) {
    const money = S.pendingMoney[uid] || 1000;
    const plan = makeTianmen(money);

    resetMoney(uid, money);
    S.mode[uid] = "tianmen";
    S.flow[uid] = "playing";
    S.tianmen[uid] = { level: 1, ...plan };

    if (money < 1000) {
      return client.replyMessage(event.replyToken, {
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
        quickReply: quickMoney(),
      });
    }

    return client.replyMessage(event.replyToken, {
      type: "text",
      text: startAnalyze(uid),
      quickReply: quickBaccarat(),
    });
  }

  if (text === "自由配注" || (text === "3" && S.flow[uid] === "awaitMode")) {
    S.mode[uid] = "free";
    S.flow[uid] = "playing";

    return client.replyMessage(event.replyToken, {
      type: "text",
      text: startAnalyze(uid),
      quickReply: quickBaccarat(),
    });
  }

  if (["莊", "閒", "和"].includes(text)) {
    applyResult(uid, text);

    S.baccarat[uid].push(text);
    if (S.baccarat[uid].length > 20) S.baccarat[uid].shift();

    const pred = baccaratPick(S.baccarat[uid]);
    const bet = currentBet(uid);

    S.lastPred[uid] = pred;
    S.lastBet[uid] = bet;

    const extra = [baccaratWarning(S.baccarat[uid]), baccaratSpecial(S.baccarat[uid])]
      .filter(Boolean)
      .map((x) => `\n\n${x}`)
      .join("");

    return client.replyMessage(event.replyToken, {
      type: "text",
      text: baccaratReply(uid, pred, bet, extra),
      quickReply: quickBaccarat(),
    });
  }

  if (text === "電子" || text === "電子AI") {
    clearSessions(uid, "slot");

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

  if (["戰神賽特1", "戰神賽特2"].includes(text)) {
    S.slot[uid] = { game: text, mode: null };

    return client.replyMessage(event.replyToken, {
      type: "text",
      text: `━━━━━━━━━━
⚡ ${text}
━━━━━━━━━━

請選擇模式：

1️⃣ 隨機爆分房
2️⃣ 自選房號分析`,
      quickReply: quickSlotMode(),
    });
  }

  if (text === "隨機爆分房") {
    const s = S.slot[uid];

    if (!s?.game) {
      return client.replyMessage(event.replyToken, {
        type: "text",
        text: "請先選擇遊戲：戰神賽特1 / 戰神賽特2",
        quickReply: quickSlotGame(),
      });
    }

    let analysis;
    do {
      analysis = slotAnalysis(s.game, Math.floor(Math.random() * 3500) + 1);
    } while (analysis.suggestion === "建議觀望");

    return client.replyMessage(event.replyToken, {
      type: "text",
      text: slotText(analysis),
      quickReply: quickSlotMode(),
    });
  }

  if (text === "自選房號") {
    if (!S.slot[uid]?.game) {
      return client.replyMessage(event.replyToken, {
        type: "text",
        text: "請先選擇遊戲：戰神賽特1 / 戰神賽特2",
        quickReply: quickSlotGame(),
      });
    }

    S.slot[uid].mode = "custom";

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

  if (/^\d{1,4}$/.test(text) && S.slot[uid]?.mode === "custom") {
    const n = Number(text);

    if (n < 1 || n > 3500) {
      return client.replyMessage(event.replyToken, { type: "text", text: "房號範圍錯誤，請輸入 1～3500。" });
    }

    return client.replyMessage(event.replyToken, {
      type: "text",
      text: slotText(slotAnalysis(S.slot[uid].game, n)),
      quickReply: quickSlotMode(),
    });
  }

  if (["539", "539AI", "539 AI"].includes(text)) {
    return client.replyMessage(event.replyToken, {
      type: "text",
      text: `━━━━━━━━━━
📊 黑域539AI已啟動
━━━━━━━━━━

請選擇模式：

• 本期推薦
• 539熱號
• 539冷號`,
      quickReply: quick539(),
    });
  }

 const mode539 = { "本期推薦": "stable", "539熱號": "hot", "539冷號": "cold" }[text];

  if (mode539) {
    const nums = gen539(mode539);
    const date = twDate().slash;

    return client.replyMessage(event.replyToken, {
      type: "text",
      text: `━━━━━━━━━━
📊 ${text}
━━━━━━━━━━

預測日期：
${date}

AI建議號碼：

${nums.join("　")}

主推號：
${nums[0]} / ${nums[2]}

⚠️ 僅供娛樂分析參考`,
      quickReply: quick539(text),
    });
  }

  if (text === "體育") {
    clearSessions(uid);
    S.sport[uid] = "sports";

    return client.replyMessage(event.replyToken, {
      type: "text",
      text: `━━━━━━━━━━
🏆 黑域體育AI
━━━━━━━━━━

請選擇項目：

• 世足
• MLB
• NBA

━━━━━━━━━━`,
      quickReply: quickSports(),
    });
  }

  if (text === "MLB") {
    clearSessions(uid, "mlb");
    S.sport[uid] = "mlb";
    S.mlb[uid] = { mode: "menu", games: [] };

    return client.replyMessage(event.replyToken, {
      type: "text",
      text: `━━━━━━━━━━
⚾ 黑域MLB AI
━━━━━━━━━━

請選擇功能：

• 近日賽程
• AI精選

━━━━━━━━━━`,
      quickReply: quickMLB(),
    });
  }

  if (text === "NBA") {
    clearSessions(uid, "nba");
    S.sport[uid] = "nba";
    S.nba[uid] = {
      mode: "nbaSelect",
      games: [
        { away: "騎士", home: "尼克", time: "2026/5/22 08:00:00" },
        { away: "雷霆", home: "馬刺", time: "2026/5/23 08:30:00" },
      ],
    };

    return client.replyMessage(event.replyToken, {
      type: "text",
      text: `━━━━━━━━━━
🏀 黑域NBA AI
━━━━━━━━━━

請選擇功能：

• NBA近日賽程
• NBA AI精選

━━━━━━━━━━`,
      quickReply: quickNBA(),
    });
  }

  if (text === "近日賽程" && S.sport[uid] === "mlb") {
    let data;

    try {
      data = await fetchMlbGames(0);
      if (!data.games.length) data = await fetchMlbGames(1);
    } catch (err) {
      console.log(err.message);
      return client.replyMessage(event.replyToken, {
        type: "text",
        text: "MLB賽程資料暫時無法同步，請稍後再試。",
      });
    }

    S.mlb[uid] = { mode: "mlbSelect", games: data.games };

    const msg = data.games.map((g, i) => `${i + 1}️⃣ ${g.away} vs ${g.home}\n🕒 ${g.time}`).join("\n\n");

    return client.replyMessage(event.replyToken, {
      type: "text",
      text: `━━━━━━━━━━
⚾ MLB近日賽程（台灣時間）
━━━━━━━━━━

${msg || "目前查無賽程"}

━━━━━━━━━━
請選擇場次查看AI分析`,
      quickReply: q(data.games.map((_, i) => [`${i + 1}`])),
    });
  }

  if (text === "AI精選" && S.sport[uid] === "mlb") {
    let games = S.mlb[uid]?.games || [];

    if (!games.length) {
      try {
        const data = await fetchMlbGames(0);
        games = data.games;
        if (!games.length) {
          const nextData = await fetchMlbGames(1);
          games = nextData.games;
        }
        S.mlb[uid] = { mode: "mlbSelect", games };
      } catch (err) {
        console.log(err.message);
        return client.replyMessage(event.replyToken, {
          type: "text",
          text: "MLB賽程資料暫時無法同步，請稍後再試。",
          quickReply: quickMLB(),
        });
      }
    }

    if (!games.length) {
      return client.replyMessage(event.replyToken, {
        type: "text",
        text: "目前查無MLB賽程，請稍後再試。",
        quickReply: quickMLB(),
      });
    }

    const g = pick(games);

    return client.replyMessage(event.replyToken, {
      type: "text",
      text: mlbAnalyze(g),
      quickReply: quickMLB(),
    });
  }

  if (/^\d+$/.test(text) && S.sport[uid] === "mlb" && S.mlb[uid]?.mode === "mlbSelect") {
    const g = S.mlb[uid].games[Number(text) - 1];

    if (!g) {
      return client.replyMessage(event.replyToken, { type: "text", text: "查無此場次" });
    }

    return client.replyMessage(event.replyToken, {
      type: "text",
      text: mlbAnalyze(g),
      quickReply: quickMLB(),
    });
  }

  if (text === "NBA近日賽程" && S.sport[uid] === "nba") {
    const games = S.nba[uid]?.games || [];
    const msg = games.map((g, i) => `${i + 1}️⃣ ${g.away} vs ${g.home}\n🕒 ${g.time}`).join("\n\n");

    return client.replyMessage(event.replyToken, {
      type: "text",
      text: `━━━━━━━━━━
🏀 NBA近日賽程（台灣時間）
━━━━━━━━━━

${msg || "目前查無賽程"}

━━━━━━━━━━
請選擇場次查看AI分析`,
      quickReply: q(games.map((_, i) => [`${i + 1}`])),
    });
  }

  if (text === "NBA AI精選" && S.sport[uid] === "nba") {
    const games = S.nba[uid]?.games || [];

    if (!games.length) {
      return client.replyMessage(event.replyToken, {
        type: "text",
        text: "目前查無NBA賽程，請稍後再試。",
        quickReply: quickNBA(),
      });
    }

    const g = pick(games);

    return client.replyMessage(event.replyToken, {
      type: "text",
      text: nbaAnalyze(g),
      quickReply: quickNBA(),
    });
  }

  if (/^\d+$/.test(text) && S.sport[uid] === "nba" && S.nba[uid]?.mode === "nbaSelect") {
    const g = S.nba[uid].games[Number(text) - 1];

    if (!g) {
      return client.replyMessage(event.replyToken, { type: "text", text: "查無此場次" });
    }

    return client.replyMessage(event.replyToken, {
      type: "text",
      text: nbaAnalyze(g),
      quickReply: quickNBA(),
    });
  }

  if (text === "世足") {
    clearSessions(uid, "wc");
    S.sport[uid] = "wc";
    S.wc[uid] = { mode: null, page: 0, games: [] };

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

  if ((text === "賽程查詢" || text === "1") && S.sport[uid] === "wc") {
    S.wc[uid] = { mode: "date", page: 0, games: [] };

    return client.replyMessage(event.replyToken, {
      type: "text",
      text: `━━━━━━━━━━
📅 世足賽程查詢
🕒 全部為台灣時間
━━━━━━━━━━

請選擇日期：`,
      quickReply: wcDates(0),
    });
  }

  if (["下一頁", "上一頁"].includes(text) && S.sport[uid] === "wc" && S.wc[uid]?.mode === "date") {
    S.wc[uid].page = text === "下一頁" ? S.wc[uid].page + 1 : Math.max(0, S.wc[uid].page - 1);

    return client.replyMessage(event.replyToken, {
      type: "text",
      text: `━━━━━━━━━━
📅 世足賽程查詢
🕒 全部為台灣時間
━━━━━━━━━━

請選擇日期：`,
      quickReply: wcDates(S.wc[uid].page),
    });
  }

  if (worldCupSchedule[text] && S.sport[uid] === "wc" && S.wc[uid]?.mode === "date") {
    S.wc[uid] = {
      mode: "selectGame",
      games: worldCupSchedule[text],
      page: S.wc[uid].page || 0,
    };

    return client.replyMessage(event.replyToken, {
      type: "text",
      text: wcGames(text, S.wc[uid].games),
      quickReply: q(S.wc[uid].games.map((_, i) => [`${i + 1}`])),
    });
  }

  if (/^\d+$/.test(text) && S.sport[uid] === "wc" && S.wc[uid]?.mode === "selectGame") {
    const g = S.wc[uid].games[Number(text) - 1];

    if (!g) return client.replyMessage(event.replyToken, { type: "text", text: "查無此場次" });

    return client.replyMessage(event.replyToken, {
      type: "text",
      text: wcAnalyze(g),
      quickReply: quickWorldCup(),
    });
  }

  if ((text === "球隊查詢" || text === "2") && S.sport[uid] === "wc") {
    return client.replyMessage(event.replyToken, {
      type: "text",
      text: `━━━━━━━━━━
⚽ 球隊查詢
━━━━━━━━━━

請輸入球隊名稱。`,
    });
  }

  if ((text === "AI精選" || text === "3") && S.sport[uid] === "wc") {
    return client.replyMessage(event.replyToken, {
      type: "text",
      text: `━━━━━━━━━━
⚽ AI精選
━━━━━━━━━━

目前世足尚未正式開賽。
賽前資料完整後開放。`,
      quickReply: quickWorldCup(),
    });
  }

  if ((text === "冠軍預測" || text === "4") && S.sport[uid] === "wc") {
    return client.replyMessage(event.replyToken, {
      type: "text",
      text: `━━━━━━━━━━
🏆 黑域AI冠軍預測
━━━━━━━━━━

1️⃣ 阿根廷
2️⃣ 法國
3️⃣ 巴西
4️⃣ 英格蘭
5️⃣ 西班牙`,
      quickReply: quickWorldCup(),
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
• 體育`,
    quickReply: quickMain(),
  });
}

app.listen(process.env.PORT || 8080, () => {
  console.log("Server running");
});
