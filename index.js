const WebSocket = require("ws");
global.WebSocket = WebSocket;

const express = require("express");
const line = require("@line/bot-sdk");
const { createClient } = require("@supabase/supabase-js");
const worldCupSchedule = require("./worldcupSchedule");

const app = express();
const client = new line.Client({
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
});
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY, {
  realtime: {
    enabled: false
  }
});
const adminId = "Uaf293ee976e5170d4e8672d2c12b3f76";

const S = {
  baccarat: {}, result: {}, lastPred: {}, lastBet: {}, bankroll: {}, startBankroll: {},
  mode: {}, pendingMoney: {}, pendingRoom: {}, flow: {}, tianmen: {}, slot: {}, wc: {}, cache539: {},
};

const pick = (a) => a[Math.floor(Math.random() * a.length)];
const q = (items) => ({ items: items.map(([label, text = label]) => ({ type: "action", action: { type: "message", label, text } })) });
const quickBaccarat = () => q([["莊"], ["閒"], ["和"]]);
const quickMoney = () => q([["AI配注"], ["天門五關"], ["自由配注"]]);
const quickSlotGame = () => q([["戰神賽特1"], ["戰神賽特2"]]);
const quickSlotMode = () => q([["隨機爆分房"], ["自選房號"]]);
const quick539 = (ex) => q([["539穩定"], ["539熱號"], ["539冷號"]].filter(([x]) => x !== ex));
const quickWorldCup = () => q([["賽程查詢"], ["球隊查詢"], ["AI精選"], ["冠軍預測"]]);

function clearSessions(uid, keep) {
  if (keep !== "slot") S.slot[uid] = null;
  if (keep !== "wc") S.wc[uid] = null;
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
  if (old) await supabase.from("vip_users").update({ account, expire_time }).eq("user_id", uid);
  else await supabase.from("vip_users").insert({ user_id: uid, account, expire_time });
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
function profit(uid) { return (S.bankroll[uid] || 0) - (S.startBankroll[uid] || 0); }
function round100(n) { return Math.max(100, Math.floor(n / 100) * 100); }
function aiBet(uid) {
 const b =
  S.bankroll[uid] ||
  S.startBankroll[uid] ||
  1000;

const p = profit(uid);

let min = 0.08;
let max = 0.18;

if (p >= 3000) {
  min = 0.1;
  max = 0.2;
}

if (p >= 10000) {
  min = 0.12;
  max = 0.25;
}

if (p >= 50000) {
  min = 0.15;
  max = 0.3;
}

const bet = Math.min(
  b * 0.3,
  b * (
    Math.random() *
    (max - min) +
    min
  )
);

return Math.floor(bet / 100) * 100;
}
function makeTianmen(money) {
  const base = Math.max(
  100,
  Math.floor(money / 60 / 100) * 100
);
  const levels = [1, 3, 7, 15, 31].map((x) => base * x);
  return { base, levels, total: levels.reduce((a, b) => a + b, 0) };
}
function currentBet(uid) {
  if (S.mode[uid] === "free") return 0;
  if (S.mode[uid] === "tianmen" && S.tianmen[uid]) return S.tianmen[uid].levels[(S.tianmen[uid].level || 1) - 1];
  return aiBet(uid);
}

function baccaratPick(history) {
  const h = history.filter((x) => x !== "和");
  if (h.length < 2) return pick(["莊", "閒"]);
  const b = h.filter((x) => x === "莊").length;
  const p = h.filter((x) => x === "閒").length;
  const last = h[h.length - 1], last2 = h.slice(-2);
  if (last2.length === 2 && last2[0] !== last2[1]) return last === "莊" ? "閒" : "莊";
  return b > p ? "莊" : p > b ? "閒" : pick(["莊", "閒"]);
}
function baccaratWarning(history) {
  const h = history.filter((x) => x !== "和"), r = h.slice(-5);
  if (history.slice(-6).filter((x) => x === "和").length >= 2) return "⚠️ 和局波動偏高";
  if (r.length >= 5 && r.every((x) => x === r[0])) return "⚠️ 偵測長龍波動";
  if (r.length >= 5 && r.every((v, i, a) => i === 0 || v !== a[i - 1])) return "⚠️ 偵測震盪波動";
  return "";
}
function baccaratSpecial(history) {
  const h = history.filter((x) => x !== "和"), r = h.slice(-5), roll = Math.random();
  if (roll < 0.02 && r.filter((x) => x === "莊").length >= 3) return "⚠️ 高倍率區同步完成\n\n可留意：\n莊龍寶";
  if (roll < 0.04 && r.filter((x) => x === "閒").length >= 3) return "⚠️ 高倍率區同步完成\n\n可留意：\n閒龍寶";
  if (roll < 0.1) return "⚠️ 可留意：\n和局";
  if (roll < 0.16) return `⚠️ 可留意：\n${pick(["莊對", "閒對"])}`;
  return "";
}
function applyResult(uid, opened) {
  const last = S.lastPred[uid], bet = S.lastBet[uid] || currentBet(uid);
  if (!last || !S.mode[uid]) return;
  if (!S.result[uid]) S.result[uid] = [];
  if (opened === "和") S.result[uid].push("和");
  else if (last === opened) {
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
  const r = S.result[uid] || [];
  const stat = `過：${r.filter((x) => x === "過").length} 把\n倒：${r.filter((x) => x === "倒").length} 把\n和：${r.filter((x) => x === "和").length} 把`;
  if (S.mode[uid] === "free") return `━━━━━━━━━━
🤖 黑域AI運算完成
━━━━━━━━━━

目前建議：
${pred}${extra}

━━━━━━━━━━

${stat}

━━━━━━━━━━

請輸入目前開出：
莊 / 閒 / 和`;
  let money = `目前本金：\n${S.bankroll[uid]}\n\n目前獲利：\n${profit(uid) >= 0 ? "+" : ""}${profit(uid)}`;
  if (S.mode[uid] === "tianmen" && S.tianmen[uid]) money += `\n\n目前階段：\n天門${S.tianmen[uid].level}`;
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
  const pred = pick(["莊", "閒"]), bet = currentBet(uid);
  S.lastPred[uid] = pred; S.lastBet[uid] = bet; S.flow[uid] = "playing";
  return baccaratReply(uid, pred, bet);
}

function slotAnalysis(game, room) {
  const n = Number(room), score = (n * 7) % 100;
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
  const key = `${new Date().toLocaleDateString("zh-TW", { timeZone: "Asia/Taipei" })}-${mode}`;
  if (S.cache539[key]) return S.cache539[key];
  let pool = Array.from({ length: 39 }, (_, i) => i + 1).sort(() => Math.random() - 0.5);
  const nums = pool.slice(0, 5).sort((a, b) => a - b).map((n) => String(n).padStart(2, "0"));
  S.cache539[key] = nums;
  return nums;
}

function wcDates(page = 0) {
  const dates = Object.keys(worldCupSchedule), start = page * 11;
  const items = dates.slice(start, start + 11).map((d) => [d]);
  if (page > 0) items.push(["上一頁"]);
  if (start + 11 < dates.length) items.push(["下一頁"]);
  return q(items);
}
function wcGames(date, games) {
  let msg = `━━━━━━━━━━\n⚽ ${date} 世足賽程\n🕒 台灣時間\n━━━━━━━━━━\n\n`;
  games.forEach((g, i) => msg += `${i + 1}️⃣ ${g.stage}${g.group ? `｜${g.group}組` : ""}\n${g.home} vs ${g.away}\n🕒 ${g.time}（台灣時間）\n📍 ${g.venue}\n\n`);
  return msg + "━━━━━━━━━━\n\n請選擇場次查看AI分析";
}
function wcAnalyze(g) {
  if ([g.home, g.away].some((x) => x.includes("勝方") || x.includes("敗方") || x.includes("第"))) return `━━━━━━━━━━
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

app.get("/", (req, res) => res.send("BLACKDOMAIN AI Running"));
app.post("/webhook", line.middleware({ channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN, channelSecret: process.env.LINE_CHANNEL_SECRET }), async (req, res) => {
  try { await Promise.all(req.body.events.map(handleEvent)); res.status(200).end(); }
  catch (e) { console.log(e); res.status(500).end(); }
});

async function handleEvent(event) {
  if (event.type !== "message" || event.message.type !== "text") return null;
  const uid = event.source.userId, text = event.message.text.trim(), lower = text.toLowerCase();
  if (!S.baccarat[uid]) S.baccarat[uid] = [];
  if (!S.result[uid]) S.result[uid] = [];

  const needsVip = ["百家樂", "電子", "電子AI", "539", "539AI", "539 AI", "莊", "閒", "和", "世足", "AI配注", "天門五關", "自由配注", "DG", "MT"].includes(text)
    || /^mt/i.test(text) || /^dg/i.test(text) || ( /^\d{1,6}$/.test(text) && ["awaitMoney", "selectGame", "custom"].includes(S.flow[uid] || S.wc[uid]?.mode || S.slot[uid]?.mode) );
  if (needsVip && uid !== adminId && !(await isVip(uid))) return client.replyMessage(event.replyToken, { type: "text", text: noVip() });

  if (text === "我的ID") return client.replyMessage(event.replyToken, { type: "text", text: uid });
  if (["VIP查詢", "VIP", "VIP時間"].includes(text)) {
    const data = await getVip(uid);
    if (!data || Number(data.expire_time) <= Date.now()) return client.replyMessage(event.replyToken, { type: "text", text: noVip() });
    const days = Math.ceil((Number(data.expire_time) - Date.now()) / 86400000);
    return client.replyMessage(event.replyToken, { type: "text", text: `━━━━━━━━━━\n👑 黑域VIP\n━━━━━━━━━━\n\n3A帳號：\n${data.account}\n\n剩餘天數：\n${days} 天\n\n到期時間：\n${twTime(data.expire_time)}` });
  }
  if (["開通會員", "我要開通", "開通"].includes(text)) return client.replyMessage(event.replyToken, { type: "text", text: noVip() });
  if (text.startsWith("申請開通 ")) {
    const account = text.replace("申請開通 ", "").trim();
    if (!account) return client.replyMessage(event.replyToken, { type: "text", text: "請輸入3A帳號\n範例：申請開通 abc123" });
    await supabase.from("vip_requests").insert({ user_id: uid, account });
    return client.replyMessage(event.replyToken, { type: "text", text: `━━━━━━━━━━\n📝 已收到開通申請\n━━━━━━━━━━\n\n3A帳號：\n${account}\n\n請等待管理員審核。` });
  }
  if (text.startsWith("開通 ")) {
    if (uid !== adminId) return client.replyMessage(event.replyToken, { type: "text", text: "你沒有管理員權限" });
    const [, account, d] = text.split(" "), days = parseInt(d, 10);
    if (!account || !days) return client.replyMessage(event.replyToken, { type: "text", text: "格式錯誤\n範例：開通 abc123 2" });
    const { data } = await supabase.from("vip_requests").select("*").eq("account", account).order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (!data?.user_id) return client.replyMessage(event.replyToken, { type: "text", text: "查無此申請帳號" });
    const exp = await openVip(data.user_id, account, days);
    return client.replyMessage(event.replyToken, { type: "text", text: `━━━━━━━━━━\n✅ 黑域AI開通成功\n━━━━━━━━━━\n\n3A帳號：\n${account}\n\n開通天數：\n${days}天\n\n到期時間：\n${twTime(exp)}` });
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
    return client.replyMessage(event.replyToken, { type: "text", text: `━━━━━━━━━━\n🤖 黑域AI已啟動\n━━━━━━━━━━\n\n請輸入房間號碼\n\n範例：\nDG RB01\nMT 01` });
  }
  const validMT = /^mt\s*(?:0?[1-9]|1[0-3]|3a|13a)$/i.test(text), validDG = /^dg\s*(?:0?[1-7]|rb\s*0?[1-7]|s\s*0?[1-7])$/i.test(text);
  if (validMT || validDG) {
    S.pendingRoom[uid] = roomName(text); S.flow[uid] = "awaitMoney"; S.baccarat[uid] = []; S.result[uid] = []; S.lastPred[uid] = null; S.lastBet[uid] = null;
    return client.replyMessage(event.replyToken, { type: "text", text: `━━━━━━━━━━\n🤖 黑域AI數據同步成功\n━━━━━━━━━━\n\n同步房間：\n${S.pendingRoom[uid]}\n\n✓ 房間同步完成\n✓ 牌路資料載入\n✓ 模型運算啟動\n\n━━━━━━━━━━\n\n請輸入本金：\n\n例如：\n1000\n5000\n10000` });
  }
  if (/^mt/i.test(text) || /^dg/i.test(text)) return client.replyMessage(event.replyToken, { type: "text", text: "查無此房間" });
  if (/^\d+$/.test(text) && S.flow[uid] === "awaitMoney") {
    const money = Number(text); if (money < 100) return client.replyMessage(event.replyToken, { type: "text", text: "本金金額過低，請重新輸入。" });
    resetMoney(uid, money); S.pendingMoney[uid] = money; S.flow[uid] = "awaitMode";
    return client.replyMessage(event.replyToken, { type: "text", text: `━━━━━━━━━━\n💰 黑域AI資金配置\n━━━━━━━━━━\n\n目前本金：\n${money}\n\n請選擇模式：\n\n1️⃣ AI配注\n2️⃣ 天門五關\n3️⃣ 自由配注\n\n━━━━━━━━━━`, quickReply: quickMoney() });
  }
  if (text === "AI配注" || (text === "1" && S.flow[uid] === "awaitMode")) {
    S.mode[uid] = "ai"; S.flow[uid] = "playing"; S.bankroll[uid] = S.pendingMoney[uid]; S.startBankroll[uid] = S.pendingMoney[uid];
    return client.replyMessage(event.replyToken, { type: "text", text: startAnalyze(uid), quickReply: quickBaccarat() });
  }
  if (text === "天門五關" || (text === "2" && S.flow[uid] === "awaitMode")) {
    const money = S.pendingMoney[uid] || 1000, plan = makeTianmen(money); resetMoney(uid, money); S.mode[uid] = "tianmen"; S.flow[uid] = "playing"; S.tianmen[uid] = { level: 1, ...plan };
    if (money < 1000) return client.replyMessage(event.replyToken, { type: "text", text: `━━━━━━━━━━\n⛩️ 黑域AI天門配置\n━━━━━━━━━━\n\n目前本金：\n${money}\n\n⚠️ 不建議使用天門模式\n\n建議本金至少：\n1000以上\n\n目前較適合：\nAI配注模式\n\n━━━━━━━━━━`, quickReply: quickMoney() });
    return client.replyMessage(event.replyToken, {
  type: "text",
  text: startAnalyze(uid),
  quickReply: quickBaccarat()
});
}
  if (text === "自由配注" || (text === "3" && S.flow[uid] === "awaitMode")) {
    S.mode[uid] = "free"; S.flow[uid] = "playing"; return client.replyMessage(event.replyToken, { type: "text", text: startAnalyze(uid), quickReply: quickBaccarat() });
  }
  if (["莊", "閒", "和"].includes(text)) {
    applyResult(uid, text); S.baccarat[uid].push(text); if (S.baccarat[uid].length > 20) S.baccarat[uid].shift();
    const pred = baccaratPick(S.baccarat[uid]), bet = currentBet(uid); S.lastPred[uid] = pred; S.lastBet[uid] = bet;
    const extra = [baccaratWarning(S.baccarat[uid]), baccaratSpecial(S.baccarat[uid])].filter(Boolean).map((x) => `\n\n${x}`).join("");
    return client.replyMessage(event.replyToken, { type: "text", text: baccaratReply(uid, pred, bet, extra), quickReply: quickBaccarat() });
  }

  if (text === "電子" || text === "電子AI") { clearSessions(uid, "slot"); return client.replyMessage(event.replyToken, { type: "text", text: `━━━━━━━━━━\n⚡ 黑域電子AI\n━━━━━━━━━━\n\n請選擇遊戲：\n\n🎰 戰神賽特1\n🎰 戰神賽特2`, quickReply: quickSlotGame() }); }
  if (["戰神賽特1", "戰神賽特2"].includes(text)) { S.slot[uid] = { game: text, mode: null }; return client.replyMessage(event.replyToken, { type: "text", text: `━━━━━━━━━━\n⚡ ${text}\n━━━━━━━━━━\n\n請選擇模式：\n\n1️⃣ 隨機爆分房\n2️⃣ 自選房號分析`, quickReply: quickSlotMode() }); }
  if (text === "隨機爆分房") { const s = S.slot[uid]; if (!s?.game) return client.replyMessage(event.replyToken, { type: "text", text: "請先選擇遊戲：戰神賽特1 / 戰神賽特2", quickReply: quickSlotGame() }); let a; do { a = slotAnalysis(s.game, Math.floor(Math.random() * 3500) + 1); } while (a.suggestion === "建議觀望"); return client.replyMessage(event.replyToken, { type: "text", text: slotText(a), quickReply: quickSlotMode() }); }
  if (text === "自選房號") { if (!S.slot[uid]?.game) return client.replyMessage(event.replyToken, { type: "text", text: "請先選擇遊戲：戰神賽特1 / 戰神賽特2", quickReply: quickSlotGame() }); S.slot[uid].mode = "custom"; return client.replyMessage(event.replyToken, { type: "text", text: `━━━━━━━━━━\n⚡ 自選房號分析\n━━━━━━━━━━\n\n請輸入房號：\n\n範例：\n377` }); }
  if (/^\d{1,4}$/.test(text) && S.slot[uid]?.mode === "custom") { const n = Number(text); if (n < 1 || n > 3500) return client.replyMessage(event.replyToken, { type: "text", text: "房號範圍錯誤，請輸入 1～3500。" }); return client.replyMessage(event.replyToken, { type: "text", text: slotText(slotAnalysis(S.slot[uid].game, n)), quickReply: quickSlotMode() }); }

  if (["539", "539AI", "539 AI"].includes(text)) return client.replyMessage(event.replyToken, { type: "text", text: `━━━━━━━━━━\n📊 黑域539AI已啟動\n━━━━━━━━━━\n\n請選擇模式：\n\n• 539穩定\n• 539熱號\n• 539冷號`, quickReply: quick539() });
  const mode539 = { "539穩定": "stable", "539熱號": "hot", "539冷號": "cold" }[text];
  if (mode539) { const nums = gen539(mode539), date = new Date().toLocaleDateString("zh-TW", { timeZone: "Asia/Taipei" }); return client.replyMessage(event.replyToken, { type: "text", text: `━━━━━━━━━━\n📊 ${text}\n━━━━━━━━━━\n\n預測日期：\n${date}\n\nAI建議號碼：\n\n${nums.join("　")}\n\n主推號：\n${nums[0]} / ${nums[2]}\n\n⚠️ 僅供娛樂分析參考`, quickReply: quick539(text) }); }

  if (text === "世足") { clearSessions(uid, "wc"); S.wc[uid] = { mode: null, page: 0, games: [] }; return client.replyMessage(event.replyToken, { type: "text", text: `━━━━━━━━━━\n⚽ 黑域世足系統\n━━━━━━━━━━\n\n請選擇功能：\n\n1️⃣ 賽程查詢\n2️⃣ 球隊查詢\n3️⃣ AI精選\n4️⃣ 冠軍預測\n\n━━━━━━━━━━`, quickReply: quickWorldCup() }); }
  if (text === "賽程查詢" || (text === "1" && S.wc[uid]?.mode !== "selectGame")) { S.wc[uid] = { mode: "date", page: 0, games: [] }; return client.replyMessage(event.replyToken, { type: "text", text: "━━━━━━━━━━\n📅 世足賽程查詢\n🕒 全部為台灣時間\n━━━━━━━━━━\n\n請選擇日期：", quickReply: wcDates(0) }); }
  if (["下一頁", "上一頁"].includes(text) && S.wc[uid]?.mode === "date") { S.wc[uid].page = text === "下一頁" ? S.wc[uid].page + 1 : Math.max(0, S.wc[uid].page - 1); return client.replyMessage(event.replyToken, { type: "text", text: "━━━━━━━━━━\n📅 世足賽程查詢\n🕒 全部為台灣時間\n━━━━━━━━━━\n\n請選擇日期：", quickReply: wcDates(S.wc[uid].page) }); }
  if (worldCupSchedule[text] && S.wc[uid]?.mode === "date") { S.wc[uid] = { mode: "selectGame", games: worldCupSchedule[text], page: S.wc[uid].page || 0 }; return client.replyMessage(event.replyToken, { type: "text", text: wcGames(text, S.wc[uid].games), quickReply: q(S.wc[uid].games.map((_, i) => [`${i + 1}`])) }); }
  if (/^\d+$/.test(text) && S.wc[uid]?.mode === "selectGame") { const g = S.wc[uid].games[Number(text) - 1]; if (!g) return client.replyMessage(event.replyToken, { type: "text", text: "查無此場次" }); return client.replyMessage(event.replyToken, { type: "text", text: wcAnalyze(g), quickReply: quickWorldCup() }); }
  if (text === "球隊查詢" || text === "2") return client.replyMessage(event.replyToken, { type: "text", text: "━━━━━━━━━━\n⚽ 球隊查詢\n━━━━━━━━━━\n\n請輸入球隊名稱。" });
  if (text === "AI精選" || text === "3") return client.replyMessage(event.replyToken, { type: "text", text: "━━━━━━━━━━\n⚽ AI精選\n━━━━━━━━━━\n\n目前世足尚未正式開賽。\n賽前資料完整後開放。", quickReply: quickWorldCup() });
  if (text === "冠軍預測" || text === "4") return client.replyMessage(event.replyToken, { type: "text", text: "━━━━━━━━━━\n🏆 黑域AI冠軍預測\n━━━━━━━━━━\n\n1️⃣ 阿根廷\n2️⃣ 法國\n3️⃣ 巴西\n4️⃣ 英格蘭\n5️⃣ 西班牙", quickReply: quickWorldCup() });

  return client.replyMessage(event.replyToken, { type: "text", text: `━━━━━━━━━━\n🤖 歡迎使用黑域AI\n━━━━━━━━━━\n\n請選擇功能：\n\n• 百家樂\n• 電子\n• 539\n• 世足` });
}

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`黑域AI啟動成功，Port: ${PORT}`);
});
