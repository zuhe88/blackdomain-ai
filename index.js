const { startAtgSocket } = require("./atgSocket");
const OpenAI = require("openai");
const WebSocket = require("ws");
global.WebSocket = WebSocket;

const express = require("express");
const line = require("@line/bot-sdk");
const { createClient } = require("@supabase/supabase-js");
const axios = require("axios");
const worldCupSchedule = require("./worldcupSchedule");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const app = express();

const client = new line.Client({
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
});

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

const adminId = "Uaf293ee976e5170d4e8672d2c12b3f76";
const ADMIN_UIDS = [adminId];

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

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function safePush(uid, message) {
  try {
    await client.pushMessage(uid, message);
  } catch (err) {
    console.log("LINE PUSH ERROR:", err.message);
  }
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
  return q(
    [["本期推薦"], ["539熱號"], ["539冷號"]].filter(([x]) => x !== exclude)
  );
}

function quickSports() {
  return q([["世足"], ["MLB"], ["NBA"]]);
}

function quickWorldCup() {
  return q([
    ["賽程查詢", "世足賽程查詢"],
    ["球隊查詢", "世足球隊查詢"],
    ["冠軍預測", "世足冠軍預測"],
  ]);
}

function quickMLB() {
  return q([["近日賽程", "MLB近日賽程"]]);
}

function quickNBA() {
  return q([["近日賽程", "NBA近日賽程"]]);
}

function clearSessions(uid, keep = "") {
  if (keep !== "slot") S.slot[uid] = null;
  if (keep !== "wc") S.wc[uid] = null;
  if (keep !== "mlb") S.mlb[uid] = null;
  if (keep !== "nba") S.nba[uid] = null;
  if (!keep) S.sport[uid] = null;
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

function twTime(ts) {
  return new Date(Number(ts)).toLocaleString("zh-TW", {
    timeZone: "Asia/Taipei",
    hour12: false,
  });
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
  const { data } = await supabase
    .from("vip_users")
    .select("*")
    .eq("user_id", uid)
    .maybeSingle();

  return data;
}

async function isVip(uid) {
  const data = await getVip(uid);
  return !!data && Number(data.expire_time) > Date.now();
}

async function openVip(uid, account, days) {
  const old = await getVip(uid);
  const baseTime =
    old && Number(old.expire_time) > Date.now()
      ? Number(old.expire_time)
      : Date.now();

  const expire_time = baseTime + days * 86400000;

  if (old) {
    await supabase
      .from("vip_users")
      .update({ account, expire_time })
      .eq("user_id", uid);
  } else {
    await supabase.from("vip_users").insert({ user_id: uid, account, expire_time });
  }

  return expire_time;
}

function roomName(room) {
  const t = String(room).toUpperCase().replace(/\s+/g, "");

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

  return String(room).toUpperCase();
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

  if (p > 0) maxRate += 0.03;

  const style = Math.random();
  let rate;

  if (style < 0.25) rate = minRate;
  else if (style < 0.75) rate = minRate + Math.random() * (maxRate - minRate);
  else rate = maxRate;

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

  if (last2.length === 2 && last2[0] !== last2[1]) {
    return last === "莊" ? "閒" : "莊";
  }

  if (banker > player) return "莊";
  if (player > banker) return "閒";

  return pick(["莊", "閒"]);
}

function baccaratWarning(history) {
  const h = history.filter((x) => x !== "和");
  const recent = h.slice(-5);

  if (history.slice(-6).filter((x) => x === "和").length >= 2) {
    return "⚠️ 和局波動偏高";
  }

  if (recent.length >= 5 && recent.every((x) => x === recent[0])) {
    return "⚠️ 偵測長龍波動";
  }

  if (
    recent.length >= 5 &&
    recent.every((v, i, arr) => i === 0 || v !== arr[i - 1])
  ) {
    return "⚠️ 偵測震盪波動";
  }

  return "";
}

function baccaratSpecial(history) {
  const h = history.filter((x) => x !== "和");
  const recent = h.slice(-5);
  const roll = Math.random();

  if (roll < 0.02 && recent.filter((x) => x === "莊").length >= 3) {
    return "⚠️ 高倍率區同步完成\n\n可留意：\n莊龍寶";
  }

  if (roll < 0.04 && recent.filter((x) => x === "閒").length >= 3) {
    return "⚠️ 高倍率區同步完成\n\n可留意：\n閒龍寶";
  }

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

    if (S.mode[uid] !== "free") {
      S.bankroll[uid] += opened === "莊" ? Math.floor(bet * 0.95) : bet;
    }

    if (S.mode[uid] === "tianmen" && S.tianmen[uid]) {
      S.tianmen[uid].level = 1;
    }
  } else {
    S.result[uid].push("倒");

    if (S.mode[uid] !== "free") {
      S.bankroll[uid] -= bet;
    }

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

  if (S.slotHot[key]) return S.slotHot[key];

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
  const roomNum = Number(room);
  const hotRooms = buildHotRooms(game);
  const aiRooms = S.slot[uid]?.aiRooms || [];

  // 熱門排行與AI推薦過的房，永遠維持可進場，避免漏線
  if (hotRooms.includes(roomNum) || aiRooms.includes(roomNum)) {
    return slotAnalyzeText(game, roomNum);
  }

  // 建立自選房固定快取：同一遊戲 + 同一房號 + 同一個30分鐘週期，結果固定
  if (!S.slotCustom) S.slotCustom = {};

  const key = `${game}-${slotHotKey(game)}-${roomNum}`;

  if (!S.slotCustom[key]) {
    // 自選房紅燈機率，0.82 = 82% 暫不建議
    const badRate = 0.82;

    S.slotCustom[key] = Math.random() < badRate ? "bad" : "good";
  }

  if (S.slotCustom[key] === "bad") {
    return `━━━━━━━━━━━━
🤖 黑域AI 數據選房
━━━━━━━━━━━━

🎰 ${game}
🏠 ${slotNumber(roomNum)}房

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

  return slotAnalyzeText(game, roomNum);
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

  return q(
    rooms.map((room, i) => {
      const labels = ["🥇", "🥈", "🥉", "④", "⑤"];
      return [`${labels[i]} ${slotNumber(room)}房`, `電子房:${room}`];
    })
  );
}

function gen539(mode) {
  const date = tw539Date();
  const key = `${date}-${mode}`;

  if (S.cache539[key]) return S.cache539[key];

  const used = new Set();

  ["stable", "hot", "cold"].forEach((m) => {
    const k = `${date}-${m}`;

    if (S.cache539[k]) {
      S.cache539[k].forEach((n) => used.add(n));
    }
  });

  const nums = [];

  while (nums.length < 5) {
    const n = String(Math.floor(Math.random() * 39) + 1).padStart(2, "0");

    if (!used.has(n) && !nums.includes(n)) {
      nums.push(n);
      used.add(n);
    }
  }

  nums.sort((a, b) => Number(a) - Number(b));
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
📍 ${g.venue || "未公布"}

`;
  });

  return `${msg}━━━━━━━━━━
請選擇場次查看AI分析`;
}

function wcTeamAnalysis(team) {
  return `━━━━━━━━━━
⚽ ${team} AI球隊分析
━━━━━━━━━━

球隊定位：
${pick(["平衡型球隊", "防守反擊型", "進攻型球隊", "快速轉換型", "控球型球隊"])}

AI評級：
${pick(["B", "B+", "A-", "A"])}

進攻能力：
${pick(["★★★☆☆", "★★★★☆", "★★★★★"])}

防守穩定：
${pick(["★★★☆☆", "★★★★☆", "★★★★★"])}

AI建議：
${pick(["不敗方向", "大球方向", "小球方向", "角球方向", "雙方進球"])}

分析方向：
• 近期狀態波動分析
• 進攻效率模型
• 防守穩定度修正
• 節奏風險預測

━━━━━━━━━━

⚠️ 僅供娛樂分析參考`;
}

async function wcMatchAnalysis(g) {
  
  const response = await openai.responses.create({
    model: "gpt-4.1-mini",
    input: `
你是黑域AI世足賽前分析系統。

請使用繁體中文分析以下比賽：

時間：${g.time || "未提供"}
主隊：${g.home || "主隊"}
客隊：${g.away || "客隊"}

請嚴格依照以下格式輸出：

⚽ 黑域AI 賽前分析

🏆 ${g.home || "主隊"} VS ${g.away || "客隊"}

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
若平手機率較高可寫：平局機率偏高

━━━━━━━━━━━━

⚠️ 本分析由黑域AI生成，僅供娛樂參考。

不要輸出Markdown。
不要輸出程式碼。
不要輸出額外說明。
`,
  });

  return response.output_text;
}
async function wcChampionPrediction() {
  const prompt = `
你是黑域AI世足冠軍預測系統。

請用繁體中文，產生一份世界盃冠軍預測分析。

請依照以下格式輸出，不要加入多餘說明：

━━━━━━━━━━
🏆 黑域AI 世足冠軍預測
━━━━━━━━━━

🥇 冠軍預測：
請給出最看好的冠軍球隊

🥈 亞軍預測：
請給出最可能進入決賽但落敗的球隊

🥉 四強熱門：
請列出2支四強熱門球隊

━━━━━━━━━━

📊 冠軍熱門分析：
請分析冠軍球隊的整體優勢，例如陣容深度、進攻火力、防守穩定、淘汰賽經驗。

━━━━━━━━━━

⚔️ 主要競爭對手：
請分析2~3支可能威脅冠軍球隊的隊伍。

━━━━━━━━━━

🚨 爆冷黑馬：
請給出1~2支黑馬球隊，並說明原因。

━━━━━━━━━━

🤖 AI綜合判斷：
請用3~5句總結本屆冠軍走勢。

━━━━━━━━━━
⚠️ 僅供娛樂分析參考
`;

  try {
    const response = await openai.responses.create({
      model: "gpt-4.1-mini",
      input: prompt,
    });

    return response.output_text;
  } catch (err) {
    console.log("WC CHAMPION GPT ERROR:", err.message);

    return `━━━━━━━━━━
🏆 黑域AI 世足冠軍預測
━━━━━━━━━━

🥇 冠軍預測：
巴西

🥈 亞軍預測：
阿根廷

🥉 四強熱門：
法國、英格蘭

━━━━━━━━━━

📊 冠軍熱門分析：
巴西整體陣容深度完整，進攻端個人能力強，邊路突破與中前場串聯具備高上限。若淘汰賽階段防守穩定度維持，仍是冠軍最熱門隊伍之一。

━━━━━━━━━━

⚔️ 主要競爭對手：
阿根廷具備成熟的比賽控制力與大賽經驗。
法國攻守轉換速度快，前場爆發力仍具威脅。
英格蘭陣容厚度佳，但關鍵戰心理壓力仍是變數。

━━━━━━━━━━

🚨 爆冷黑馬：
日本、摩洛哥

兩隊都具備高紀律防守與快速反擊能力，若賽程籤運配合，有機會製造爆冷。

━━━━━━━━━━

🤖 AI綜合判斷：
本屆冠軍走勢仍偏向傳統強隊，但淘汰賽變數高。巴西、阿根廷、法國是最具冠軍相的三支球隊，英格蘭與西班牙則屬於高上限競爭者。

━━━━━━━━━━
⚠️ 僅供娛樂分析參考`;
  }
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

const nbaName = {
  "Atlanta Hawks": "老鷹",
  "Boston Celtics": "塞爾提克",
  "Brooklyn Nets": "籃網",
  "Charlotte Hornets": "黃蜂",
  "Chicago Bulls": "公牛",
  "Cleveland Cavaliers": "騎士",
  "Dallas Mavericks": "獨行俠",
  "Denver Nuggets": "金塊",
  "Detroit Pistons": "活塞",
  "Golden State Warriors": "勇士",
  "Houston Rockets": "火箭",
  "Indiana Pacers": "溜馬",
  "LA Clippers": "快艇",
  "Los Angeles Clippers": "快艇",
  "Los Angeles Lakers": "湖人",
  "Memphis Grizzlies": "灰熊",
  "Miami Heat": "熱火",
  "Milwaukee Bucks": "公鹿",
  "Minnesota Timberwolves": "灰狼",
  "New Orleans Pelicans": "鵜鶘",
  "New York Knicks": "尼克",
  "Oklahoma City Thunder": "雷霆",
  "Orlando Magic": "魔術",
  "Philadelphia 76ers": "76人",
  "Phoenix Suns": "太陽",
  "Portland Trail Blazers": "拓荒者",
  "Sacramento Kings": "國王",
  "San Antonio Spurs": "馬刺",
  "Toronto Raptors": "暴龍",
  "Utah Jazz": "爵士",
  "Washington Wizards": "巫師",
};

function teamZh(name) {
  return mlbName[name] || name;
}

function nbaZh(name) {
  return nbaName[name] || name;
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

async function fetchNbaGames(offset = 0) {
  const now = new Date(new Date().toLocaleString("en-US", { timeZone: "America/New_York" }));
  now.setDate(now.getDate() + offset);

  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  const date = `${y}${m}${d}`;

  const url = `https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard?dates=${date}`;
  const { data } = await axios.get(url, { timeout: 10000 });

  const games = (data.events || [])
    .map((e) => {
      const comps = e.competitions?.[0]?.competitors || [];
      const home = comps.find((c) => c.homeAway === "home");
      const away = comps.find((c) => c.homeAway === "away");

      return {
        id: e.id,
        away: nbaZh(away?.team?.displayName || ""),
        home: nbaZh(home?.team?.displayName || ""),
        time: new Date(e.date).toLocaleString("zh-TW", {
          timeZone: "Asia/Taipei",
          hour12: false,
        }),
      };
    })
    .filter((g) => g.away && g.home);

  return { games };
}

async function mlbAnalyze(g) {
  const prompt = `
你是黑域AI MLB賽前分析系統。

請用繁體中文分析以下 MLB 賽事：

${g.away} vs ${g.home}
開賽時間：${g.time}（台灣時間）

請依照以下格式輸出，不要加入多餘說明：

━━━━━━━━━━
⚾ 黑域MLB AI分析完成
━━━━━━━━━━

${g.away} vs ${g.home}

開賽時間（台灣）：
${g.time}

📊 球隊狀態：
請分析兩隊近期狀態、打線火力、投手穩定度、牛棚狀況與主客場因素。

📈 AI方向：
請給出較明確的方向，例如：
${g.home} 不敗 / ${g.away} 不敗 / 建議觀望

🎯 讓分方向：
請給出讓分方向，例如：
${g.home} -1.5 / ${g.away} +1.5 / 讓分保守

📊 大小分：
請給出大分或小分方向，例如：
7.5 大分 / 8.5 小分 / 大小分觀望

⚠️ 風險提醒：
請提醒本場主要風險。

━━━━━━━━━━
⚠️ 僅供娛樂分析參考
`;

  try {
    const response = await openai.responses.create({
      model: "gpt-4.1-mini",
      input: prompt,
    });

    return response.output_text;
  } catch (err) {
    console.log("MLB GPT ERROR:", err.message);

    return `━━━━━━━━━━
⚾ 黑域MLB AI分析完成
━━━━━━━━━━

${g.away} vs ${g.home}

開賽時間（台灣）：
${g.time}

📊 球隊狀態：
目前GPT分析暫時無法同步，系統改用基礎模型分析。

📈 AI方向：
${pick([`${g.home} 不敗`, `${g.away} 不敗`, "建議觀望"])}

🎯 讓分方向：
${pick([`${g.home} -1.5`, `${g.away} +1.5`, "讓分保守"])}

📊 大小分：
${pick(["7.5 大分", "8.5 小分", "大小分觀望"])}

⚠️ 風險提醒：
MLB賽事受先發投手、牛棚輪替與臨場打線影響較大，建議賽前再次確認名單。

━━━━━━━━━━
⚠️ 僅供娛樂分析參考`;
  }
}

async function nbaAnalyze(g) {
  const prompt = `
你是黑域AI NBA賽前分析系統。

請用繁體中文分析以下 NBA 賽事：

${g.away} vs ${g.home}
開賽時間：${g.time}（台灣時間）

請依照以下格式輸出，不要加入多餘說明：

━━━━━━━━━━
🏀 黑域NBA AI分析完成
━━━━━━━━━━

${g.away} vs ${g.home}

開賽時間（台灣）：
${g.time}

📊 球隊狀態：
請分析兩隊近期狀態、進攻效率、防守強度、主客場因素、球星狀態與輪替深度。

📈 AI方向：
請給出較明確的方向，例如：
${g.home} 不敗 / ${g.away} 不敗 / 建議觀望

🎯 讓分方向：
請給出讓分方向，例如：
${g.home} -3.5 / ${g.away} +3.5 / 讓分保守

📊 大小分：
請給出大分或小分方向，例如：
218.5 大分 / 221.5 小分 / 大小分觀望

⚠️ 風險提醒：
請提醒本場主要風險。

━━━━━━━━━━
⚠️ 僅供娛樂分析參考
`;

  try {
    const response = await openai.responses.create({
      model: "gpt-4.1-mini",
      input: prompt,
    });

    return response.output_text;
  } catch (err) {
    console.log("NBA GPT ERROR:", err.message);

    return `━━━━━━━━━━
🏀 黑域NBA AI分析完成
━━━━━━━━━━

${g.away} vs ${g.home}

開賽時間（台灣）：
${g.time}

📊 球隊狀態：
目前GPT分析暫時無法同步，系統改用基礎模型分析。本場主要參考主客場節奏、進攻效率、防守強度與陣容深度。

📈 AI方向：
${pick([`${g.home} 不敗`, `${g.away} 不敗`, "建議觀望"])}

🎯 讓分方向：
${pick([`${g.home} -3.5`, `${g.away} +3.5`, "讓分保守"])}

📊 大小分：
${pick(["218.5 大分", "221.5 小分", "大小分觀望"])}

⚠️ 風險提醒：
NBA賽事受傷兵名單、輪休安排、臨場節奏與第四節罰球戰術影響較大，建議賽前再次確認名單。

━━━━━━━━━━
⚠️ 僅供娛樂分析參考`;
  }
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

  if (text === "我的ID") {
    return client.replyMessage(event.replyToken, {
      type: "text",
      text: uid,
    });
  }

  if (["VIP查詢", "VIP", "VIP時間", "我的VIP"].includes(text)) {
    const data = await getVip(uid);

    if (!data || Number(data.expire_time) <= Date.now()) {
      return client.replyMessage(event.replyToken, {
        type: "text",
        text: noVip(),
      });
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
${twTime(data.expire_time)}

狀態：
🟢 VIP有效中`,
    });
  }

  if (text.startsWith("查VIP ")) {
    if (!ADMIN_UIDS.includes(uid)) {
      return client.replyMessage(event.replyToken, {
        type: "text",
        text: "❌ 你沒有管理員權限",
      });
    }

    const account = text.replace("查VIP", "").trim();

    const { data } = await supabase
      .from("vip_users")
      .select("*")
      .eq("account", account)
      .maybeSingle();

    if (!data) {
      return client.replyMessage(event.replyToken, {
        type: "text",
        text: "查無此VIP帳號",
      });
    }

    const days = Math.ceil((Number(data.expire_time) - Date.now()) / 86400000);

    return client.replyMessage(event.replyToken, {
      type: "text",
      text: `━━━━━━━━━━
👑 VIP資訊
━━━━━━━━━━

3A帳號：
${data.account}

剩餘天數：
${days} 天

到期時間：
${twTime(data.expire_time)}

狀態：
${days > 0 ? "🟢 VIP有效中" : "🔴 VIP已到期"}`,
    });
  }

  if (text.startsWith("加VIP ")) {
    if (!ADMIN_UIDS.includes(uid)) {
      return client.replyMessage(event.replyToken, {
        type: "text",
        text: "❌ 你沒有管理員權限",
      });
    }

    const parts = text.trim().split(/\s+/);
    const account = parts[1];
    const addDays = Number(parts[2]);

    if (!account || !addDays) {
      return client.replyMessage(event.replyToken, {
        type: "text",
        text: "格式錯誤\n\n範例：\n加VIP tel690723 10",
      });
    }

    const { data } = await supabase
      .from("vip_users")
      .select("*")
      .eq("account", account)
      .maybeSingle();

    if (!data) {
      return client.replyMessage(event.replyToken, {
        type: "text",
        text: "查無此VIP帳號",
      });
    }

    const baseTime =
      Number(data.expire_time) > Date.now() ? Number(data.expire_time) : Date.now();

    const newExpireTime = baseTime + addDays * 86400000;

    await supabase
      .from("vip_users")
      .update({ expire_time: newExpireTime })
      .eq("account", account);

    const remainDays = Math.ceil((newExpireTime - Date.now()) / 86400000);

    return client.replyMessage(event.replyToken, {
      type: "text",
      text: `━━━━━━━━━━
✅ VIP時間已增加
━━━━━━━━━━

3A帳號：
${account}

增加天數：
${addDays} 天

目前剩餘：
${remainDays} 天

到期時間：
${twTime(newExpireTime)}`,
    });
  }

  if (text.startsWith("刪除VIP ")) {
  if (!ADMIN_UIDS.includes(uid)) {
    return client.replyMessage(event.replyToken, {
      type: "text",
      text: "❌ 你沒有管理員權限",
    });
  }

  const account = text.replace("刪除VIP", "").trim();

  if (!account) {
    return client.replyMessage(event.replyToken, {
      type: "text",
      text: "格式錯誤\n\n範例：\n刪除VIP tel690723",
    });
  }

  const { data } = await supabase
    .from("vip_users")
    .select("*")
    .eq("account", account)
    .maybeSingle();

  if (!data) {
    return client.replyMessage(event.replyToken, {
      type: "text",
      text: "查無此VIP帳號",
    });
  }

  await supabase
    .from("vip_users")
    .delete()
    .eq("account", account);

  return client.replyMessage(event.replyToken, {
    type: "text",
    text: `━━━━━━━━━━
🗑 VIP已刪除
━━━━━━━━━━

3A帳號：
${account}

狀態：
🔴 已移除VIP權限`,
  });
}

  if (text === "VIP列表") {

  if (!ADMIN_UIDS.includes(uid)) {
    return client.replyMessage(event.replyToken, {
      type: "text",
      text: "❌ 你沒有管理員權限",
    });
  }

  const { data } = await supabase
    .from("vip_users")
    .select("*")
    .order("expire_time", { ascending: false });

  if (!data?.length) {
    return client.replyMessage(event.replyToken, {
      type: "text",
      text: "目前沒有VIP資料",
    });
  }

  const active = data.filter(
    v => Number(v.expire_time) > Date.now()
  );

  const msg = active
    .slice(0, 20)
    .map((v, i) => {

      const days = Math.ceil(
        (Number(v.expire_time) - Date.now()) / 86400000
      );

      return `${i + 1}. ${v.account}
剩餘：${days}天`;
    })
    .join("\n\n");

  return client.replyMessage(event.replyToken, {
    type: "text",
    text: `👑 黑域AI VIP列表
━━━━━━━━━━

${msg}

━━━━━━━━━━
有效VIP：${active.length}人`,
  });
}

  const applyVipMatch = text.match(/^申請開通[:：]?\s*(.+)$/i);

  if (applyVipMatch) {
    const account = applyVipMatch[1].trim();

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

  if (["開通會員", "我要開通", "開通"].includes(text)) {
    return client.replyMessage(event.replyToken, {
      type: "text",
      text: noVip(),
    });
  }

  if (text.startsWith("開通 ")) {
    if (!ADMIN_UIDS.includes(uid)) {
      return client.replyMessage(event.replyToken, {
        type: "text",
        text: "你沒有管理員權限",
      });
    }

    const [, account, dayText] = text.split(/\s+/);
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

  const needsVip =
    [
      "百家樂",
      "電子",
      "電子AI",
      "539",
      "539AI",
      "539 AI",
      "莊",
      "閒",
      "和",
      "體育",
      "世足",
      "MLB",
      "NBA",
      "AI配注",
      "天門五關",
      "自由配注",
      "DG",
      "MT",
      "MLB近日賽程",
      "NBA近日賽程",
      "世足賽程查詢",
      "世足球隊查詢",
      "世足冠軍預測",
    ].includes(text) ||
    /^mt/i.test(text) ||
    /^dg/i.test(text) ||
    /^世足日期:/.test(text) ||
    /^世足場次:/.test(text) ||
    /^MLB場次:/.test(text) ||
    /^NBA場次:/.test(text) ||
    /^電子房:\d+$/.test(text) ||
    (/^\d{1,6}$/.test(text) &&
      ["awaitMoney", "awaitBetLimit", "custom"].includes(
        S.flow[uid] || S.slot[uid]?.mode
      ));

  if (needsVip && !ADMIN_UIDS.includes(uid)) {
    const vipOk = await isVip(uid);

    if (!vipOk) {
      return client.replyMessage(event.replyToken, {
        type: "text",
        text: noVip(),
      });
    }
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

  if (/^世足日期上一頁$/.test(text) || /^世足日期下一頁$/.test(text)) {
    const page = S.wc[uid]?.page || 0;
    const nextPage = text.includes("下一頁") ? page + 1 : Math.max(0, page - 1);

    S.wc[uid] = { ...(S.wc[uid] || {}), page: nextPage };

    return client.replyMessage(event.replyToken, {
      type: "text",
      text: "請選擇日期：",
      quickReply: wcDates(nextPage),
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
    S.wc[uid] = {
      mode: "selectGame",
      page: S.wc[uid]?.page || 0,
      games,
    };

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

    await client.replyMessage(event.replyToken, {
      type: "text",
      text: `━━━━━━━━━━
⚽ 黑域AI數據同步中
━━━━━━━━━━

✓ 賽程資料同步
✓ 球隊狀態載入
✓ 波膽模型運算
✓ 大小分與讓分比對

請稍候，AI分析中...`,
    });

    try {
      const result = await wcMatchAnalysis(g);

    await safePush(uid, {
        type: "text",
        text: result,
      });

      await safePush(uid, {
        type: "text",
        text: `━━━━━━━━━━
⚽ 世足功能選單
━━━━━━━━━━

請選擇功能：`,
        quickReply: quickWorldCup(),
      });
    } catch (err) {
      console.log("WC GPT ERROR:", err.message);

    await safePush(uid, {
        type: "text",
        text: "⚠️ AI分析暫時失敗，請稍後再試。",
      });
    }

    return null;
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

    await client.replyMessage(event.replyToken, {
      type: "text",
      text: `━━━━━━━━━━
⚾ 黑域MLB數據同步中
━━━━━━━━━━

✓ 賽程資料同步
✓ 球隊狀態載入
✓ 打線火力比對
✓ 投手與牛棚權重運算

請稍候，AI分析中...`,
    });

    const result = await mlbAnalyze(g);

  await safePush(uid, {
      type: "text",
      text: result,
    });

    await sleep(1000);

  await safePush(uid, {
      type: "text",
      text: `━━━━━━━━━━
⚾ MLB功能選單
━━━━━━━━━━

請選擇功能：`,
      quickReply: quickMLB(),
    });

    return null;
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

    await client.replyMessage(event.replyToken, {
      type: "text",
      text: `━━━━━━━━━━
🏀 黑域NBA數據同步中
━━━━━━━━━━

✓ 賽程資料同步
✓ 球隊戰力分析
✓ 近期狀態比對
✓ 攻防數據運算

請稍候，AI分析中...`,
    });

    const result = await nbaAnalyze(g);

    await safePush(uid, {
      type: "text",
      text: result,
    });

    await sleep(1000);







    

   await safePush(uid, {
      type: "text",
      text: `━━━━━━━━━━
🏀 NBA功能選單
━━━━━━━━━━

請選擇功能：`,
      quickReply: quickNBA(),
    });

    return null;
  }

 if (S.slot[uid]?.mode === "custom") {
  const match = text.match(/^\d+$/);

  if (!match) {
    S.slot[uid].mode = null;
  } else {
    const n = Number(match[0]);
    const game = S.slot[uid].game;
    const maxRoom = slotMaxRoom(game);

    if (n < 1 || n > maxRoom) {
      return client.replyMessage(event.replyToken, {
        type: "text",
        text: `房號範圍錯誤，請輸入 1～${maxRoom}。`,
      });
    }

    S.slot[uid].mode = null;

    return client.replyMessage(event.replyToken, {
      type: "text",
      text: slotCustomAnalyzeText(game, n, uid),
      quickReply: quickSlotMode(),
    });
  }
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

  const mode539 = {
    本期推薦: "stable",
    "539熱號": "hot",
    "539冷號": "cold",
  }[text];

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

━━━━━━━━━━

⚠️ 僅供娛樂參考`,
      quickReply: quick539(text),
    });
  }

  if (text === "體育") {
    clearSessions(uid);

    return client.replyMessage(event.replyToken, {
      type: "text",
      text: `━━━━━━━━━━
🏟 黑域體育AI
━━━━━━━━━━

請選擇項目：

• 世足
• MLB
• NBA`,
      quickReply: quickSports(),
    });
  }

  if (text === "世足") {
    clearSessions(uid, "wc");
    S.sport[uid] = "wc";
    S.wc[uid] = { mode: "menu", page: 0 };

    return client.replyMessage(event.replyToken, {
      type: "text",
      text: `━━━━━━━━━━
⚽ 黑域世足AI
━━━━━━━━━━

請選擇功能：

• 賽程查詢
• 球隊查詢
• 冠軍預測`,
      quickReply: quickWorldCup(),
    });
  }

  if (text === "世足賽程查詢") {
    S.sport[uid] = "wc";
    S.wc[uid] = { mode: "dateSelect", page: 0 };

    return client.replyMessage(event.replyToken, {
      type: "text",
      text: `━━━━━━━━━━
⚽ 世足賽程查詢
━━━━━━━━━━

請選擇日期：`,
      quickReply: wcDates(0),
    });
  }

  if (text === "世足球隊查詢") {
    S.sport[uid] = "wc";
    S.wc[uid] = { mode: "teamSearch" };

    return client.replyMessage(event.replyToken, {
      type: "text",
      text: "請輸入要查詢的球隊名稱，例如：巴西、阿根廷、日本",
    });
  }

  if (text === "世足冠軍預測") {
  await client.replyMessage(event.replyToken, {
    type: "text",
    text: `━━━━━━━━━━
🏆 黑域AI冠軍模型同步中
━━━━━━━━━━

✓ 球隊實力資料載入
✓ 淘汰賽路徑模擬
✓ 陣容深度權重分析
✓ 爆冷風險交叉比對

請稍候，AI預測中...`,
  });

  const result = await wcChampionPrediction();

await safePush(uid, {
    type: "text",
    text: result,
  });

await sleep(1000);
    
await safePush(uid, {
    type: "text",
    text: `━━━━━━━━━━
⚽ 世足功能選單
━━━━━━━━━━

請選擇功能：`,
    quickReply: quickWorldCup(),
  });

  return null;
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

━━━━━━━━━━`,
      quickReply: quickMLB(),
    });
  }

  if (text === "MLB近日賽程") {
    S.sport[uid] = "mlb";
    let games = [];

    try {
      for (let i = 0; i < 7; i++) {
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

  if (text === "NBA") {
    clearSessions(uid, "nba");
    S.sport[uid] = "nba";
    S.nba[uid] = { mode: "menu", games: [] };

    return client.replyMessage(event.replyToken, {
      type: "text",
      text: `━━━━━━━━━━
🏀 黑域NBA AI
━━━━━━━━━━

請選擇功能：

• NBA近日賽程

━━━━━━━━━━`,
      quickReply: quickNBA(),
    });
  }

  if (text === "NBA近日賽程") {
    S.sport[uid] = "nba";
    let games = [];

    try {
      for (let i = 0; i < 7; i++) {
        const data = await fetchNbaGames(i);

        if (data.games?.length) {
          games = data.games;
          break;
        }
      }
    } catch (err) {
      console.log("NBA API ERROR:", err.message);

      return client.replyMessage(event.replyToken, {
        type: "text",
        text: "NBA賽程資料暫時無法同步，請稍後再試。",
        quickReply: quickNBA(),
      });
    }

    if (!games.length) {
      return client.replyMessage(event.replyToken, {
        type: "text",
        text: "目前查無NBA近日賽程。",
        quickReply: quickNBA(),
      });
    }

    const showGames = games.slice(0, 10);
    S.nba[uid] = { mode: "selectGame", games: showGames };

    const msg = showGames
      .map((g, i) => `${i + 1}️⃣ ${g.away} vs ${g.home}\n🕒 ${g.time}`)
      .join("\n\n");

    return client.replyMessage(event.replyToken, {
      type: "text",
      text: `━━━━━━━━━━
🏀 NBA近日賽程（台灣時間）
━━━━━━━━━━

${msg}

━━━━━━━━━━
請選擇場次查看AI分析`,
      quickReply: q(showGames.map((_, i) => [`${i + 1}`, `NBA場次:${i + 1}`])),
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

try {
  startAtgSocket();
} catch (err) {
  console.log("ATG Socket skipped:", err.message);
}

app.listen(process.env.PORT || 8080, () => {
  console.log("Server running");
});
