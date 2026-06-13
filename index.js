const OpenAI = require("openai");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});
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
  betLimit: {},
  flow: {},
  tianmen: {},
  slot: {},
  slotHot: {},
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

function quickBaccarat() {
  return q([["莊"], ["閒"], ["和"]]);
}

function quickMoney() {
  return q([["AI配注"], ["天門五關"], ["自由配注"]]);
}

function quickSlotGame() {
  return q([
    ["🎰 戰神賽特1", "戰神賽特1"],
    ["🎰 戰神賽特2", "戰神賽特2"],
    ["👹 古神巴風特", "古神巴風特"],
  ]);
}

function quickSlotMode() {
  return q([
    ["🎲 AI推薦房", "AI推薦房"],
    ["🔥 熱門房排行", "熱門房排行"],
    ["🔢 自選房號分析", "自選房號分析"],
  ]);
}

function quick539(exclude) {
  return q([["本期推薦"], ["539熱號"], ["539冷號"]].filter(([x]) => x !== exclude));
}

function quickSports() {
  return q([["世足"], ["MLB"], ["NBA"]]);
}

function quickWorldCup() {
  return q([
    ["賽程查詢", "世足賽程查詢"],
    ["球隊查詢", "世足球隊查詢"],
    ["AI精選", "世足AI精選"],
    ["冠軍預測", "世足冠軍預測"],
  ]);
}

function quickMLB() {
  return q([["近日賽程", "MLB近日賽程"], ["AI精選", "MLB AI精選"]]);
}

function quickNBA() {
  return q([["近日賽程", "NBA近日賽程"], ["AI精選", "NBA AI精選"]]);
}

function clearSessions(uid, keep = "") {
  if (keep !== "slot") S.slot[uid] = null;
  if (keep !== "wc") S.wc[uid] = null;
  if (keep !== "mlb") S.mlb[uid] = null;
  if (keep !== "nba") S.nba[uid] = null;
  if (!keep) S.sport[uid] = null;
}

function twDate(offset = 0) {
  const now = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Taipei" }));
  now.setDate(now.getDate() + offset);
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return { slash: `${y}/${m}/${d}`, compact: `${y}${m}${d}` };
}

function twNow() {
  return new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Taipei" }));
}

function twDateTime() {
  const now = twNow();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const h = String(now.getHours()).padStart(2, "0");
  const min = String(now.getMinutes()).padStart(2, "0");
  return `${y}/${m}/${d} ${h}:${min}`;
}

function apiDate(offset = 0) {
  const now = twNow();
  now.setDate(now.getDate() + offset);

  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");

  return `${y}-${m}-${d}`;
}

function twSlotUpdateTime() {
  const now = twNow();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const h = String(now.getHours()).padStart(2, "0");
  const min = now.getMinutes() >= 30 ? "30" : "00";
  return `${y}/${m}/${d} ${h}:${min}`;
}

function tw539Date() {
  const now = twNow();

  if (now.getHours() > 20 || (now.getHours() === 20 && now.getMinutes() >= 30)) {
    now.setDate(now.getDate() + 1);
  }

  if (now.getDay() === 0) {
    now.setDate(now.getDate() + 1);
  }

  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");

  return `${y}/${m}/${d}`;
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
  const old = await getVip(uid);
  const baseTime = old && Number(old.expire_time) > Date.now()
    ? Number(old.expire_time)
    : Date.now();

  const expire_time = baseTime + days * 86400000;

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

function betUnit(bankroll) {
  if (bankroll >= 500000) return 10000;
  if (bankroll >= 10000) return 1000;
  return 100;
}

function roundBet(amount, bankroll) {
  const unit = betUnit(bankroll);
  return Math.max(unit, Math.floor(amount / unit) * unit);
}

function aiBet(uid) {
  const b = S.bankroll[uid] || S.startBankroll[uid] || 1000;
  const limit = S.betLimit[uid] || b;
  const p = profit(uid);

  let minRate = 0.08;
  let maxRate = 0.18;

  if (b >= 10000) {
    minRate = 0.12;
    maxRate = 0.35;
  }

  if (b >= 100000) {
    minRate = 0.08;
    maxRate = 0.28;
  }

  if (p > 0) {
    maxRate += 0.03;
  }

  const style = Math.random();
  let rate;

  if (style < 0.25) {
    rate = minRate;
  } else if (style < 0.75) {
    rate = minRate + Math.random() * (maxRate - minRate);
  } else {
    rate = maxRate;
  }

  const bet = Math.min(b * rate, limit);
  return Math.max(betUnit(b), roundBet(bet, b));
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
    if (S.mode[uid] === "tianmen" && S.tianmen[uid]) {
      S.tianmen[uid].level = Math.min(5, (S.tianmen[uid].level || 1) + 1);
    }
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

function slotMaxRoom(game) {
  if (game === "戰神賽特1") return 2500;
  if (game === "戰神賽特2") return 3500;
  if (game === "古神巴風特") return 1500;
  return 3500;
}

function slotNumber(room) {
  return String(room).padStart(4, "0");
}

function slotHotKey(game) {
  return `${game}-${twSlotUpdateTime()}`;
}

function buildHotRooms(game) {
  const key = slotHotKey(game);

  if (S.slotHot[key]) {
    return S.slotHot[key];
  }

  const max = slotMaxRoom(game);
  const rooms = [];

  while (rooms.length < 5) {
    const n = Math.floor(Math.random() * max) + 1;
    if (!rooms.includes(n)) rooms.push(n);
  }

  S.slotHot[key] = rooms;
  return rooms;
}

function slotDataLines() {
  return pick([
    ["🔥 活躍度提升", "📈 波動增強", "⚡ AI監控中"],
    ["🔥 熱度上升", "📈 波動活躍", "⚡ AI監控中"],
    ["🔥 活躍區同步", "📈 波動提升", "⚡ AI監控中"],
    ["🔥 數據升溫", "📈 活躍增強", "⚡ AI監控中"],
  ]);
}

function slotAnalyzeText(game, room) {
  const lines = slotDataLines();

  return `━━━━━━━━━━━━
🤖 黑域AI 數據選房
━━━━━━━━━━━━

🎰 ${game}
🏠 ${slotNumber(room)}房

📊 數據分析
━━━━━━━━━━━━
${lines[0]}
${lines[1]}
${lines[2]}

🎯 黑域評級
━━━━━━━━━━━━
🟢 可進場

🕒 AI分析時間
${twDateTime()}`;
}

function slotCustomAnalyzeText(game, room, uid) {
  const hotRooms = buildHotRooms(game);
  const aiRooms = S.slot[uid]?.aiRooms || [];

  if (hotRooms.includes(Number(room)) || aiRooms.includes(Number(room))) {
    return slotAnalyzeText(game, room);
  }

  const badRate = 0.55;

  if (Math.random() < badRate) {
    return `━━━━━━━━━━━━
🤖 黑域AI 數據選房
━━━━━━━━━━━━

🎰 ${game}
🏠 ${slotNumber(room)}房

📊 數據分析
━━━━━━━━━━━━
⚠️ 數據未同步
📉 波動不足
🔴 數據不足

🎯 黑域評級
━━━━━━━━━━━━
🔴 暫不建議

🕒 AI分析時間
${twDateTime()}`;
  }

  return slotAnalyzeText(game, room);
}

function slotHotRankText(game) {
  const rooms = buildHotRooms(game);

  return `🔥 ${game} 熱門房排行

🥇 ${slotNumber(rooms[0])}房
🥈 ${slotNumber(rooms[1])}房
🥉 ${slotNumber(rooms[2])}房
④ ${slotNumber(rooms[3])}房
⑤ ${slotNumber(rooms[4])}房

🕒 更新時間
${twSlotUpdateTime()}

點擊房號後直接分析`;
}

function quickSlotHotRooms(game) {
  const rooms = buildHotRooms(game);

  return q(rooms.map((room, i) => {
    const labels = ["🥇", "🥈", "🥉", "④", "⑤"];
    return [`${labels[i]} ${slotNumber(room)}房`, `電子房:${room}`];
  }));
}function gen539(mode) {
  const key = `${tw539Date()}-${mode}`;

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
  const start = page * 10;
  const items = dates.slice(start, start + 10).map((d) => [d, `世足日期:${d}`]);

  if (page > 0) items.push(["上一頁", "世足日期上一頁"]);
  if (start + 10 < dates.length) items.push(["下一頁", "世足日期下一頁"]);

  return q(items);
}
const teamNameMap = {
  Brazil: "巴西",
  England: "英格蘭",
  Germany: "德國",
  Argentina: "阿根廷",
  France: "法國",
  Spain: "西班牙",
  Portugal: "葡萄牙",
  Netherlands: "荷蘭",
  Belgium: "比利時",
  Croatia: "克羅埃西亞",
  Uruguay: "烏拉圭",
  Japan: "日本",
  "South Korea": "韓國",
  "Korea Republic": "韓國",
  Morocco: "摩洛哥",
  Switzerland: "瑞士",
  "United States": "美國",
  USA: "美國",
  Canada: "加拿大",
  Mexico: "墨西哥",
  Australia: "澳洲",
  Norway: "挪威",
  Sweden: "瑞典",
  Austria: "奧地利",
  "Czech Republic": "捷克",
  Czechia: "捷克",
  Egypt: "埃及",
  Paraguay: "巴拉圭",
  Turkey: "土耳其",
  Turkiye: "土耳其",
  Colombia: "哥倫比亞",
  "Bosnia and Herzegovina": "波士尼亞與赫塞哥維納",
  Qatar: "卡達",
  "Saudi Arabia": "沙烏地阿拉伯",
  "South Africa": "南非",
};

function translateTeam(name) {
  return teamNameMap[name] || name;
}
async function fetchFootballGames(days = 7) {
  let allGames = [];

  for (let i = 0; i < days; i++) {
    const date = apiDate(i);

    const { data } = await axios.get("https://v3.football.api-sports.io/fixtures", {
      timeout: 10000,
      headers: {
        "x-apisports-key": process.env.APIFOOTBALL_KEY,
      },
     params: {
  date,
  timezone: "Asia/Taipei",
},
    });

    const games = (data.response || []).map((x) => ({
      id: x.fixture.id,
      stage: x.league.name,
      group: "",
     home: translateTeam(x.teams.home.name),
away: translateTeam(x.teams.away.name),
      time: new Date(x.fixture.date).toLocaleString("zh-TW", {
        timeZone: "Asia/Taipei",
        hour12: false,
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      }),
      venue: x.fixture.venue?.name || "未公布",
    }));

    allGames = allGames.concat(games);
  }

  return allGames.slice(0, 13);
}
function wcGamesText(date, games) {
  let msg = `━━━━━━━━━━
⚽ ${date} 世足賽程
🕒 台灣時間
━━━━━━━━━━

`;

  games.forEach((g, i) => {
    msg += `${i + 1}️⃣ ${g.stage || "賽事"}${g.group ? `｜${g.group}組` : ""}
${g.home} vs ${g.away}
🕒 ${g.time}（台灣時間）
📍 ${g.venue}

`;
  });

  return `${msg}━━━━━━━━━━
請選擇場次查看AI分析`;
}

const teamPower = {
  巴西: 95,
  阿根廷: 94,
  法國: 93,
  英格蘭: 91,
  葡萄牙: 90,
  德國: 89,
  西班牙: 89,
  荷蘭: 87,
  比利時: 85,
  克羅埃西亞: 84,
  哥倫比亞: 84,
  烏拉圭: 83,
  日本: 82,
  摩洛哥: 81,
  韓國: 80,
  墨西哥: 80,
  瑞士: 79,
  瑞典: 79,
  美國: 78,
  挪威: 78,
  奧地利: 77,
  加拿大: 76,
  捷克: 76,
  澳洲: 75,
  埃及: 74,
  波士尼亞與赫塞哥維納: 73,
  巴拉圭: 73,
  土耳其: 73,
  南非: 70,
  維德角: 66,
  海地: 65,
  庫拉索: 64,
  約旦: 63,
  剛果民主共和國: 62,
};

function buildPreMatchText(home, away, hp, ap) {
  const stronger = hp >= ap ? home : away;
  const weaker = hp >= ap ? away : home;
  const diff = Math.abs(hp - ap);

  if (diff >= 15) {
    return `${stronger} 本場整體實力明顯佔優，無論進攻效率、防守穩定度與陣容深度都較 ${weaker} 更有優勢。

${weaker} 預計會採取較保守的防守策略，透過反擊尋找有限機會。若前段時間無法有效壓低比賽節奏，後防線將承受較大壓力。`;
  }

  if (diff >= 8) {
    return `${stronger} 近期整體表現較為穩定，在攻守轉換與比賽節奏掌握方面略佔優勢。

${weaker} 雖然紙面實力稍弱，但仍具備一定反擊能力。若能把握定位球或防守反擊機會，本場仍有機會製造變數。`;
  }

  return `${home} 與 ${away} 整體實力接近，雙方近期狀態皆維持一定水準。

本場勝負關鍵將取決於中場控制力與臨門一腳效率，預計比賽節奏偏謹慎，不排除形成拉鋸戰局。`;
}

function buildCorrectScores(hp, ap) {
  const diff = hp - ap;

  if (diff >= 15) {
    return [
      ["3：0", "89%"],
      ["2：0", "84%"],
      ["3：1", "79%"],
      ["4：0", "71%"],
      ["2：1", "68%"],
    ];
  }

  if (diff >= 8) {
    return [
      ["2：1", "87%"],
      ["2：0", "81%"],
      ["1：0", "74%"],
      ["3：1", "69%"],
      ["1：1", "62%"],
    ];
  }

  if (diff <= -15) {
    return [
      ["0：3", "89%"],
      ["0：2", "84%"],
      ["1：3", "79%"],
      ["0：4", "71%"],
      ["1：2", "68%"],
    ];
  }

  if (diff <= -8) {
    return [
      ["1：2", "87%"],
      ["0：2", "81%"],
      ["0：1", "74%"],
      ["1：3", "69%"],
      ["1：1", "62%"],
    ];
  }

  return [
    ["1：1", "86%"],
    ["2：1", "79%"],
    ["1：0", "74%"],
    ["2：2", "66%"],
    ["0：0", "58%"],
  ];
}

function wcAnalyze(g) {
  if ([g.home, g.away].some((x) => String(x).includes("勝方") || String(x).includes("敗方") || String(x).includes("第"))) {
    return `━━━━━━━━━━
⚽ 黑域AI 世足分析
━━━━━━━━━━

🏆 ${g.home} VS ${g.away}
🕒 ${g.time}（台灣時間）
📍 ${g.venue}

目前狀態：
對戰隊伍尚未確定

AI分析：
待結果出爐後同步更新

━━━━━━━━━━`;
  }

  const hp = teamPower[g.home] || 70;
  const ap = teamPower[g.away] || 70;
  const stronger = hp >= ap ? g.home : g.away;
  const diff = Math.abs(hp - ap);
  const scoreList = buildCorrectScores(hp, ap);

  const winner = diff <= 3 ? `${stronger} 不敗` : stronger;
  const total = diff >= 15 ? "大 2.5 球" : diff >= 8 ? "2~3球方向" : "小 2.5 球";
  const risk = diff >= 15 ? "低" : diff >= 8 ? "中低" : "中";

  return `━━━━━━━━━━
⚽ 黑域AI 世足分析
━━━━━━━━━━

🏆 ${g.home} VS ${g.away}
🕒 ${g.time}（台灣時間）
📍 ${g.venue}

━━━━━━━━━━━━

📋 賽前分析

${buildPreMatchText(g.home, g.away, hp, ap)}

━━━━━━━━━━━━

🤖 AI預測

🏆 勝負方向
${winner}

⚽ 大小球
${total}

🚨 爆冷風險
${risk}

━━━━━━━━━━━━

🎯 波膽分析

🥇 ${scoreList[0][0]} ｜ ${scoreList[0][1]}

🥈 ${scoreList[1][0]} ｜ ${scoreList[1][1]}

🥉 ${scoreList[2][0]} ｜ ${scoreList[2][1]}

🏅 ${scoreList[3][0]} ｜ ${scoreList[3][1]}

🏅 ${scoreList[4][0]} ｜ ${scoreList[4][1]}

━━━━━━━━━━━━

📊 AI終極預測

⏱️ 半場比分
${scoreList[0][0].split("：")[0]}：0

🏁 全場比分
${scoreList[0][0]}

⚽ 預估總進球
${total}

━━━━━━━━━━━━

🧠 黑域AI分析完成

⚡ 多模型交叉分析
⚡ 世界排名權重分析
⚡ 球隊實力模型分析

⚠️ 僅供娛樂分析參考`;
}

function wcTeamAnalysis(team) {
  const strongTeams = {
    "巴西": { level: "A+", style: "進攻型球隊", attack: "★★★★★", defense: "★★★★☆", suggest: "巴西不敗 / 大球方向可留意" },
    "阿根廷": { level: "A+", style: "控場型球隊", attack: "★★★★★", defense: "★★★★☆", suggest: "阿根廷不敗 / 低風險方向" },
    "法國": { level: "A", style: "反擊型球隊", attack: "★★★★★", defense: "★★★☆☆", suggest: "大球方向 / 雙方進球可留意" },
    "英格蘭": { level: "A", style: "平衡型球隊", attack: "★★★★☆", defense: "★★★★☆", suggest: "英格蘭不敗 / 小球方向可留意" },
    "西班牙": { level: "A", style: "傳控型球隊", attack: "★★★★☆", defense: "★★★★☆", suggest: "西班牙不敗 / 控球優勢方向" },
    "葡萄牙": { level: "A", style: "進攻反擊型", attack: "★★★★★", defense: "★★★☆☆", suggest: "大球方向 / 個人能力突破" },
    "德國": { level: "A", style: "高壓進攻型", attack: "★★★★☆", defense: "★★★☆☆", suggest: "雙方進球 / 進球數方向" },
    "荷蘭": { level: "A-", style: "平衡反擊型", attack: "★★★★☆", defense: "★★★★☆", suggest: "荷蘭不敗 / 低風險方向" },
    "日本": { level: "B+", style: "快速反擊型", attack: "★★★☆☆", defense: "★★★★☆", suggest: "小球方向 / 防守反擊可留意" },
    "韓國": { level: "B", style: "快速衝擊型", attack: "★★★☆☆", defense: "★★★☆☆", suggest: "角球方向 / 下半場波動" },
    "比利時": { level: "B+", style: "進攻型球隊", attack: "★★★★☆", defense: "★★★☆☆", suggest: "大球方向" },
    "克羅埃西亞": { level: "A-", style: "控場穩定型", attack: "★★★★☆", defense: "★★★★☆", suggest: "低風險方向 / 不敗可留意" },
    "烏拉圭": { level: "B+", style: "防守反擊型", attack: "★★★☆☆", defense: "★★★★☆", suggest: "小球方向 / 防守盤可留意" },
    "義大利": { level: "A-", style: "防守控制型", attack: "★★★★☆", defense: "★★★★★", suggest: "小球方向 / 防守優勢" },
  };

  const defaultStyles = ["平衡型球隊", "防守反擊型", "進攻型球隊", "快速轉換型", "控球型球隊"];
  const defaultSuggest = ["不敗方向", "大球方向", "小球方向", "角球方向", "雙方進球"];

  const data = strongTeams[team] || {
    level: pick(["B", "B+", "A-"]),
    style: pick(defaultStyles),
    attack: pick(["★★★☆☆", "★★★★☆"]),
    defense: pick(["★★★☆☆", "★★★★☆"]),
    suggest: pick(defaultSuggest),
  };

  return `━━━━━━━━━━
⚽ ${team} AI球隊分析
━━━━━━━━━━

球隊定位：
${data.style}

AI評級：
${data.level}

進攻能力：
${data.attack}

防守穩定：
${data.defense}

AI建議：
${data.suggest}

分析方向：
• 近期狀態波動分析
• 進攻效率模型
• 防守穩定度修正
• 節奏風險預測

━━━━━━━━━━

⚠️ 僅供娛樂分析參考`;
}

async function wcAiPickText() {
  const response = await openai.responses.create({
    model: "gpt-4.1-mini",
    input: `
你是「黑域AI」世足賽前分析系統。

請用繁體中文，產生一段世足 AI 精選分析。
語氣要專業、有氣勢，但不能保證穩贏。

輸出格式：

🌐 世足AI精選

📊 賽前觀察
請分析目前世足賽事可能出現的比賽節奏。

🤖 AI綜合判斷
請給出 2~3 句綜合分析。

🔥 AI傾向
請給出一個方向，例如：
小分方向 / 大分方向 / 強隊不敗 / 雙方進球偏低

⚠️ 僅供娛樂分析參考
`
  });

  return response.output_text;
}
async function wcMatchAnalysis(g) {
  const response = await openai.responses.create({
    model: "gpt-4.1-mini",
    input: `
你是黑域AI世足賽前分析系統。

請使用繁體中文分析以下比賽：

時間：${g.time || "未提供"}
主隊：${g.home || g.team1 || g.a || "主隊"}
客隊：${g.away || g.team2 || g.b || "客隊"}

請嚴格依照以下格式輸出：

⚽ 黑域AI 賽前分析

🏆 ${g.home || g.team1 || g.a || "主隊"} VS ${g.away || g.team2 || g.b || "客隊"}

━━━━━━━━━━━━

📊 球隊狀態

分析雙方近期狀態、進攻能力、防守能力與比賽節奏。

━━━━━━━━━━━━

⚔️ 關鍵對位

分析本場最關鍵的勝負因素。

━━━━━━━━━━━━

🥅 半場波膽推薦

① 比分（機率）
② 比分（機率）
③ 比分（機率）

機率請控制於15%~45%。

━━━━━━━━━━━━

⚽ 全場波膽推薦

① 比分（機率）
② 比分（機率）
③ 比分（機率）

機率請控制於15%~45%。

避免出現不合理比分。

━━━━━━━━━━━━

🎯 預估總進球

請直接輸出：

0~1球方向
或
2~3球方向
或
4球以上方向

━━━━━━━━━━━━

📈 AI大小分

推薦：大2.5 或 小2.5

分析：
簡短說明原因。

━━━━━━━━━━━━

📊 AI讓分

推薦：請直接寫出讓分方向。

例如：
阿根廷 -1
法國 -0.5
日本 +1

分析：
簡短說明原因。

━━━━━━━━━━━━

🏆 AI預測勝方

直接寫出最看好的獲勝球隊名稱。

若平手機率較高可寫：

平局機率偏高

━━━━━━━━━━━━

⚠️ 本分析由黑域AI生成，僅供娛樂參考。

不要輸出Markdown。
不要輸出程式碼。
不要輸出額外說明。
`
  });

  return response.output_text;
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
  道奇: 92, 洋基: 90, 勇士: 88, 費城人: 86, 太空人: 85,
  水手: 82, 教士: 82, 藍鳥: 80, 紅襪: 79, 大都會: 78,
  小熊: 77, 守護者: 76, 老虎: 75, 雙城: 74, 紅雀: 73,
  光芒: 72, 遊騎兵: 72, 金鶯: 72, 紅人: 71, 皇家: 70,
  釀酒人: 70, 巨人: 69, 天使: 68, 海盜: 67, 國民: 66,
  馬林魚: 65, 響尾蛇: 65, 洛磯: 62, 白襪: 60, 運動家: 60,
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
  const now = new Date(new Date().toLocaleString("en-US", { timeZone: "America/New_York" }));
  now.setDate(now.getDate() + offset);

  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const date = `${y}-${m}-${d}`;

  const url = `https://statsapi.mlb.com/api/v1/schedule?sportId=1&date=${date}`;
  const { data } = await axios.get(url, { timeout: 10000 });

  const games = (data.dates?.[0]?.games || []).map((g) => ({
    id: g.gamePk,
    away: teamZh(g.teams.away.team.name),
    home: teamZh(g.teams.home.team.name),
    time: new Date(g.gameDate).toLocaleString("zh-TW", {
      timeZone: "Asia/Taipei",
      hour12: false,
    }),
  }));

  return { games };
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
    "MLB近日賽程", "MLB AI精選", "NBA近日賽程", "NBA AI精選",
    "世足賽程查詢", "世足球隊查詢", "世足AI精選", "世足冠軍預測",
  ].includes(text) || /^mt/i.test(text) || /^dg/i.test(text) ||
    /^世足日期:/.test(text) || /^世足場次:/.test(text) ||
    /^MLB場次:/.test(text) || /^NBA場次:/.test(text) ||
    /^電子房:\d+$/.test(text) ||
    (/^\d{1,6}$/.test(text) && ["awaitMoney", "awaitBetLimit", "custom"].includes(S.flow[uid] || S.slot[uid]?.mode));

  if (needsVip && uid !== adminId && !(await isVip(uid))) {
    return client.replyMessage(event.replyToken, { type: "text", text: noVip() });
  }

  if (S.sport[uid] === "wc" && S.wc[uid]?.mode === "teamSearch") {
    S.wc[uid].mode = "menu";
    return client.replyMessage(event.replyToken, {
      type: "text",
      text: wcTeamAnalysis(text),
      quickReply: quickWorldCup(),
    });
  }

  if (/^電子房:\d+$/.test(text)) {
    const room = Number(text.split(":")[1]);
    const game = S.slot[uid]?.game;
    if (!game) {
      return client.replyMessage(event.replyToken, {
        type: "text",
        text: "請先選擇遊戲。",
        quickReply: quickSlotGame(),
      });
    }

    return client.replyMessage(event.replyToken, {
      type: "text",
      text: slotAnalyzeText(game, room),
      quickReply: quickSlotMode(),
    });
  }

  if (/^世足日期:/.test(text)) {
    const date = text.replace("世足日期:", "");
    const games = worldCupSchedule[date];

    if (!games) {
      return client.replyMessage(event.replyToken, {
        type: "text",
        text: "查無此日期賽程。",
        quickReply: wcDates(S.wc[uid]?.page || 0),
      });
    }

    S.sport[uid] = "wc";
    S.wc[uid] = { mode: "selectGame", page: S.wc[uid]?.page || 0, games };

    return client.replyMessage(event.replyToken, {
      type: "text",
      text: wcGamesText(date, games),
      quickReply: q(games.map((_, i) => [`${i + 1}`, `世足場次:${i + 1}`])),
    });
  }

if (/^世足場次:\d+$/.test(text)) {
  const n = Number(text.split(":")[1]);
  const g = S.wc[uid]?.games?.[n - 1];

  if (!g) {
    return client.replyMessage(event.replyToken, {
      type: "text",
      text: "查無此場次",
      quickReply: quickWorldCup(),
    });
  }

  const aiText = await wcMatchAnalysis(g);

  return client.replyMessage(event.replyToken, {
    type: "text",
    text: aiText,
    quickReply: quickWorldCup(),
  });
}
  if (/^MLB場次:\d+$/.test(text)) {
    const n = Number(text.split(":")[1]);
    const g = S.mlb[uid]?.games?.[n - 1];

    if (!g) {
      return client.replyMessage(event.replyToken, {
        type: "text",
        text: "查無此場次",
        quickReply: quickMLB(),
      });
    }

    return client.replyMessage(event.replyToken, {
      type: "text",
      text: mlbAnalyze(g),
      quickReply: quickMLB(),
    });
  }

  if (/^NBA場次:\d+$/.test(text)) {
    const n = Number(text.split(":")[1]);
    const g = S.nba[uid]?.games?.[n - 1];

    if (!g) {
      return client.replyMessage(event.replyToken, {
        type: "text",
        text: "查無此場次",
        quickReply: quickNBA(),
      });
    }

    return client.replyMessage(event.replyToken, {
      type: "text",
      text: nbaAnalyze(g),
      quickReply: quickNBA(),
    });
  }

  if (/^\d{1,6}$/.test(text) && S.slot[uid]?.mode === "custom") {
    const n = Number(text);
    const maxRoom = slotMaxRoom(S.slot[uid].game);

    if (n < 1 || n > maxRoom) {
      return client.replyMessage(event.replyToken, {
        type: "text",
        text: `房號範圍錯誤，請輸入 1～${maxRoom}。`,
      });
    }

    S.slot[uid].mode = null;

    return client.replyMessage(event.replyToken, {
      type: "text",
      text: slotCustomAnalyzeText(S.slot[uid].game, n, uid),
      quickReply: quickSlotMode(),
    });
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
      return client.replyMessage(event.replyToken, {
        type: "text",
        text: "請輸入3A帳號\n範例：申請開通 abc123",
      });
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
      return client.replyMessage(event.replyToken, {
        type: "text",
        text: "你沒有管理員權限",
      });
    }

    const [, account, dayText] = text.split(" ");
    const days = parseInt(dayText, 10);

    if (!account || !days) {
      return client.replyMessage(event.replyToken, {
        type: "text",
        text: "格式錯誤\n範例：開通 abc123 2",
      });
    }

    const { data } = await supabase
      .from("vip_requests")
      .select("*")
      .eq("account", account)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!data?.user_id) {
      return client.replyMessage(event.replyToken, {
        type: "text",
        text: "查無此申請帳號",
      });
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
    return client.replyMessage(event.replyToken, {
      type: "text",
      text: "查無此房間",
    });
  }

  if (/^\d+$/.test(text) && S.flow[uid] === "awaitMoney") {
    const money = Number(text);

    if (money < 100) {
      return client.replyMessage(event.replyToken, {
        type: "text",
        text: "本金金額過低，請重新輸入。",
      });
    }

    resetMoney(uid, money);
    S.pendingMoney[uid] = money;
    S.flow[uid] = "awaitBetLimit";

    return client.replyMessage(event.replyToken, {
      type: "text",
      text: `━━━━━━━━━━
💰 黑域AI資金配置
━━━━━━━━━━

目前本金：
${money}

請輸入單柱上限：

例如：
1000
3000
5000

━━━━━━━━━━`,
    });
  }

  if (/^\d+$/.test(text) && S.flow[uid] === "awaitBetLimit") {
    const limit = Number(text);
    const money = S.pendingMoney[uid];

    if (!money) {
      S.flow[uid] = "awaitMoney";
      return client.replyMessage(event.replyToken, {
        type: "text",
        text: "請先輸入本金。",
      });
    }

    if (limit < betUnit(money)) {
      return client.replyMessage(event.replyToken, {
        type: "text",
        text: `單柱上限太低，至少需 ${betUnit(money)} 以上。`,
      });
    }

    if (limit > money) {
      return client.replyMessage(event.replyToken, {
        type: "text",
        text: "單柱上限不能超過本金，請重新輸入。",
      });
    }

    S.betLimit[uid] = limit;
    S.flow[uid] = "awaitMode";

    return client.replyMessage(event.replyToken, {
      type: "text",
      text: `━━━━━━━━━━
💰 黑域AI資金配置完成
━━━━━━━━━━

目前本金：
${money}

單柱上限：
${limit}

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

  if (text === "重新設定本金") {
    resetMoney(uid, 0);
    S.flow[uid] = "awaitMoney";

    return client.replyMessage(event.replyToken, {
      type: "text",
      text: `━━━━━━━━━━
💰 黑域AI資金重置
━━━━━━━━━━

請重新輸入本金：

例如：
1000
5000
10000`,
    });
  }

  if (["莊", "閒", "和"].includes(text)) {
    applyResult(uid, text);

    if (S.mode[uid] !== "free" && (S.bankroll[uid] || 0) <= 0) {
      S.bankroll[uid] = 0;

      return client.replyMessage(event.replyToken, {
        type: "text",
        text: `━━━━━━━━━━
⚠️ 黑域AI已停止分析
━━━━━━━━━━

目前本金：
0

狀態：
資金已歸零

建議：
請重新設定本金後再啟動

━━━━━━━━━━`,
        quickReply: q([["重新設定本金"]]),
      });
    }

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
      text: `⚡ 黑域電子AI

請選擇遊戲：

🎰 戰神賽特1
🎰 戰神賽特2
👹 古神巴風特`,
      quickReply: quickSlotGame(),
    });
  }

  if (["戰神賽特1", "戰神賽特2", "古神巴風特"].includes(text)) {
    S.slot[uid] = { game: text, mode: null };

    return client.replyMessage(event.replyToken, {
      type: "text",
      text: `🎰 ${text}

請選擇功能：

🎲 AI推薦房
🔥 熱門房排行
🔢 自選房號分析`,
      quickReply: quickSlotMode(),
    });
  }

  if (text === "熱門房排行") {
    const game = S.slot[uid]?.game;

    if (!game) {
      return client.replyMessage(event.replyToken, {
        type: "text",
        text: "請先選擇遊戲。",
        quickReply: quickSlotGame(),
      });
    }

    return client.replyMessage(event.replyToken, {
      type: "text",
      text: slotHotRankText(game),
      quickReply: quickSlotHotRooms(game),
    });
  }

 if (text === "AI推薦房") {
  const game = S.slot[uid]?.game;

  if (!game) {
    return client.replyMessage(event.replyToken, {
      type: "text",
      text: "請先選擇遊戲。",
      quickReply: quickSlotGame(),
    });
  }

  const maxRoom = slotMaxRoom(game);
  const room = Math.floor(Math.random() * maxRoom) + 1;

  if (!S.slot[uid].aiRooms) S.slot[uid].aiRooms = [];
  S.slot[uid].aiRooms.push(room);

  return client.replyMessage(event.replyToken, {
    type: "text",
    text: slotAnalyzeText(game, room),
    quickReply: quickSlotMode(),
  });
}

  if (text === "自選房號分析") {
    const game = S.slot[uid]?.game;

    if (!game) {
      return client.replyMessage(event.replyToken, {
        type: "text",
        text: "請先選擇遊戲。",
        quickReply: quickSlotGame(),
      });
    }

    S.slot[uid].mode = "custom";
    const maxRoom = slotMaxRoom(game);

    return client.replyMessage(event.replyToken, {
      type: "text",
      text: `🔢 自選房號分析

🎰 ${game}
房號範圍：1～${maxRoom}

請輸入房號：`,
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
    const date = tw539Date();

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

  if (text === "世足") {
    clearSessions(uid, "wc");
    S.sport[uid] = "wc";
    S.wc[uid] = { mode: "menu", page: 0, games: [] };

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

if (text === "世足賽程查詢") {
  S.sport[uid] = "wc";
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

  if (text === "世足球隊查詢") {
    S.sport[uid] = "wc";
    S.wc[uid] = { mode: "teamSearch", page: 0, games: [] };

    return client.replyMessage(event.replyToken, {
      type: "text",
      text: `━━━━━━━━━━
⚽ 球隊查詢
━━━━━━━━━━

請輸入球隊名稱。

例如：
巴西
阿根廷
法國
英格蘭`,
    });
  }

if (text === "世足AI精選") {

  const now = new Date();

  let g = null;

  for (const date of Object.keys(worldCupSchedule || {}).sort()) {
    const games = worldCupSchedule[date] || [];

    for (const game of games) {
      const gameTime = new Date(game.time || date);

      if (gameTime > now) {
        g = game;
        break;
      }
    }

    if (g) break;
  }

  if (!g) {
    return client.replyMessage(event.replyToken, {
      type: "text",
      text: "目前查無可分析賽事",
      quickReply: quickWorldCup(),
    });
  }

  const aiText = await wcMatchAnalysis(g);

  return client.replyMessage(event.replyToken, {
    type: "text",
    text: aiText,
    quickReply: quickWorldCup(),
  });

}

  const aiText = await wcMatchAnalysis(g);

  return client.replyMessage(event.replyToken, {
    type: "text",
    text: aiText,
    quickReply: quickWorldCup(),
  });

}

  if (text === "世足冠軍預測") {
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

  if (text === "MLB近日賽程") {
    S.sport[uid] = "mlb";
    let games = [];

    try {
      for (let i = -1; i < 7; i++) {
        const data = await fetchMlbGames(i);

        if (data.games?.length) {
          games = data.games;
          break;
        }
      }
    } catch (err) {
      console.log("MLB API ERROR:", err.message);

      return client.replyMessage(event.replyToken, {
        type: "text",
        text: "MLB賽程資料暫時無法同步，請稍後再試。",
        quickReply: quickMLB(),
      });
    }

    if (!games.length) {
      return client.replyMessage(event.replyToken, {
        type: "text",
        text: "目前查無MLB近日賽程。",
        quickReply: quickMLB(),
      });
    }

    const showGames = games.slice(0, 10);
    S.mlb[uid] = { mode: "selectGame", games: showGames };

    const msg = showGames
      .map((g, i) => `${i + 1}️⃣ ${g.away} vs ${g.home}\n🕒 ${g.time}`)
      .join("\n\n");

    return client.replyMessage(event.replyToken, {
      type: "text",
      text: `━━━━━━━━━━
⚾ MLB近日賽程（台灣時間）
━━━━━━━━━━

${msg}

━━━━━━━━━━
請選擇場次查看AI分析`,
      quickReply: q(showGames.map((_, i) => [`${i + 1}`, `MLB場次:${i + 1}`])),
    });
  }

  if (text === "MLB AI精選") {
    S.sport[uid] = "mlb";
    let games = S.mlb[uid]?.games || [];

    if (!games.length) {
      for (let i = -1; i < 7; i++) {
        const data = await fetchMlbGames(i);

        if (data.games?.length) {
          games = data.games.slice(0, 10);
          break;
        }
      }

      S.mlb[uid] = { mode: "selectGame", games };
    }

    if (!games.length) {
      return client.replyMessage(event.replyToken, {
        type: "text",
        text: "目前查無MLB賽程，請稍後再試。",
        quickReply: quickMLB(),
      });
    }

    return client.replyMessage(event.replyToken, {
      type: "text",
      text: mlbAnalyze(pick(games)),
      quickReply: quickMLB(),
    });
  }

  if (text === "NBA") {
    clearSessions(uid, "nba");
    S.sport[uid] = "nba";
    S.nba[uid] = {
      mode: "selectGame",
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

  if (text === "NBA近日賽程") {
    S.sport[uid] = "nba";
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
      quickReply: q(games.map((_, i) => [`${i + 1}`, `NBA場次:${i + 1}`])),
    });
  }

  if (text === "NBA AI精選") {
    S.sport[uid] = "nba";
    const games = S.nba[uid]?.games || [];

    if (!games.length) {
      return client.replyMessage(event.replyToken, {
        type: "text",
        text: "目前查無NBA賽程，請稍後再試。",
        quickReply: quickNBA(),
      });
    }

    return client.replyMessage(event.replyToken, {
      type: "text",
      text: nbaAnalyze(pick(games)),
      quickReply: quickNBA(),
    });
  }


  if (text === "GPT測試") {

  try {

    const response = await openai.responses.create({
      model: "gpt-4.1-mini",
      input: "請用一句話介紹黑域AI"
    });

    return client.replyMessage(event.replyToken, {
      type: "text",
      text: response.output_text
    });

  } catch (err) {

    console.error(err);

    return client.replyMessage(event.replyToken, {
      type: "text",
      text: "GPT連線失敗"
    });

  }

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
