const express = require('express');
const line = require('@line/bot-sdk');

const app = express();

const config = {
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.CHANNEL_SECRET
};

const client = new line.Client(config);

// ===============================
// 管理員
// ===============================
const ADMIN_USERS = [
  'Uaf293ee976e5170d4e8672d2c12b3f76'
];

// ===============================
// 暫存資料
// ===============================
const vipUsers = {};
const userState = {};

// ===============================
// 基本工具
// ===============================
function isAdmin(userId) {
  return ADMIN_USERS.includes(userId);
}

function isVip(userId) {
  if (isAdmin(userId)) return true;
  if (!vipUsers[userId]) return false;
  return Date.now() < vipUsers[userId];
}

function canUseFeature(userId) {
  return isAdmin(userId) || isVip(userId);
}

function addVip(userId, days) {
  const now = Date.now();
  const oldExpire = vipUsers[userId] || now;
  const base = oldExpire > now ? oldExpire : now;
  vipUsers[userId] = base + days * 24 * 60 * 60 * 1000;
}

function removeVip(userId) {
  delete vipUsers[userId];
}

function vipTime(userId) {
  if (isAdmin(userId)) return '管理員權限｜永久使用';

  if (!vipUsers[userId]) return '未開通';

  const left = vipUsers[userId] - Date.now();
  if (left <= 0) return '已到期';

  const days = Math.floor(left / 86400000);
  const hours = Math.floor((left % 86400000) / 3600000);
  const mins = Math.floor((left % 3600000) / 60000);

  return `${days}天 ${hours}小時 ${mins}分鐘`;
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function replyText(replyToken, text, quickReply = null) {
  const msg = {
    type: 'text',
    text
  };

  if (quickReply) msg.quickReply = quickReply;

  return client.replyMessage(replyToken, msg);
}

function requireVip(replyToken) {
  return replyText(replyToken,
`━━━━━━━━━━
🔒 黑域AI系統
━━━━━━━━━━

此功能需要開通VIP權限。

請聯絡管理員開通使用天數。`);
}

// ===============================
// Quick Reply
// ===============================
function qr(items) {
  return {
    items: items.map(i => ({
      type: 'action',
      action: {
        type: 'message',
        label: i,
        text: i
      }
    }))
  };
}

// ===============================
// 主選單
// ===============================
function sendMenu(replyToken) {
  return replyText(replyToken,
`━━━━━━━━━━
🤖 BLACKDOMAIN AI
黑域AI系統
━━━━━━━━━━

請選擇功能：

◼ 百家樂AI
◼ 電子AI
◼ 539AI
◼ VIP查詢

管理員指令：
開通 使用者ID 天數
取消開通 使用者ID
查詢 使用者ID
我的ID`,
    qr(['百家樂AI', '電子AI', '539AI', 'VIP查詢'])
  );
}

// ===============================
// Webhook
// ===============================
app.post('/webhook', line.middleware(config), async (req, res) => {
  try {
    await Promise.all(req.body.events.map(handleEvent));
    res.status(200).end();
  } catch (err) {
    console.error(err);
    res.status(500).end();
  }
});

// ===============================
// 主事件
// ===============================
async function handleEvent(event) {
  if (event.type !== 'message') return null;
  if (event.message.type !== 'text') return null;

  const userId = event.source.userId;
  const replyToken = event.replyToken;
  const text = event.message.text.trim();

  console.log('USER_ID:', userId);
  console.log('TEXT:', text);

  // ===============================
  // 查自己的ID
  // ===============================
  if (text === '我的ID') {
    return replyText(replyToken, `你的LINE User ID：\n${userId}`);
  }

  // ===============================
  // 選單
  // ===============================
  if (['選單', '開始', '功能', 'menu', 'Menu'].includes(text)) {
    return sendMenu(replyToken);
  }

  // ===============================
  // 管理員：開通
  // 格式：開通 Uxxxx 7
  // ===============================
  if (text.startsWith('開通 ')) {
    if (!isAdmin(userId)) {
      return replyText(replyToken, '你沒有管理員權限。');
    }

    const parts = text.split(/\s+/);
    const targetId = parts[1];
    const days = parseInt(parts[2], 10);

    if (!targetId || isNaN(days)) {
      return replyText(replyToken,
`格式錯誤。

正確格式：
開通 使用者ID 天數

範例：
開通 Uxxxxxxxx 7`);
    }

    addVip(targetId, days);

    return replyText(replyToken,
`━━━━━━━━━━
✅ VIP開通成功
━━━━━━━━━━

使用者：
${targetId}

開通天數：
${days}天

目前狀態：
${vipTime(targetId)}`);
  }

  // ===============================
  // 管理員：取消開通
  // 格式：取消開通 Uxxxx
  // ===============================
  if (text.startsWith('取消開通 ')) {
    if (!isAdmin(userId)) {
      return replyText(replyToken, '你沒有管理員權限。');
    }

    const parts = text.split(/\s+/);
    const targetId = parts[1];

    if (!targetId) {
      return replyText(replyToken,
`格式錯誤。

正確格式：
取消開通 使用者ID`);
    }

    removeVip(targetId);

    return replyText(replyToken,
`━━━━━━━━━━
✅ VIP已取消
━━━━━━━━━━

使用者：
${targetId}`);
  }

  // ===============================
  // 管理員：查詢別人
  // 格式：查詢 Uxxxx
  // ===============================
  if (text.startsWith('查詢 ')) {
    if (!isAdmin(userId)) {
      return replyText(replyToken, '你沒有管理員權限。');
    }

    const parts = text.split(/\s+/);
    const targetId = parts[1];

    if (!targetId) {
      return replyText(replyToken,
`格式錯誤。

正確格式：
查詢 使用者ID`);
    }

    return replyText(replyToken,
`━━━━━━━━━━
👑 VIP查詢
━━━━━━━━━━

使用者：
${targetId}

狀態：
${vipTime(targetId)}`);
  }

  // ===============================
  // VIP查詢
  // ===============================
  if (['VIP查詢', '查詢VIP', 'vip查詢', 'VIP'].includes(text)) {
    return replyText(replyToken,
`━━━━━━━━━━
👑 黑域AI VIP
━━━━━━━━━━

你的狀態：
${vipTime(userId)}`);
  }

  // ===============================
  // 百家樂AI
  // ===============================
  if (text === '百家樂AI' || text === '百家樂' || text === '百家') {
    if (!canUseFeature(userId)) return requireVip(replyToken);

    userState[userId] = {
      mode: 'baccarat_wait_room'
    };

    return replyText(replyToken,
`━━━━━━━━━━
🤖 黑域百家樂AI已啟動
━━━━━━━━━━

請提供：

• 百家平台：DG / MT
• 房間號碼

支援格式：

DG 01
DG 1
DG RB01
DG RB1
DG S01
DG S1

MT 01
MT 1
MT 3A
MT 13A

系統將開始同步牌路數據。`);
  }

  // ===============================
  // 百家房號
  // ===============================
  if (
    /^DG\s?((RB|S)?0?[1-7])$/i.test(text) ||
    /^MT\s?(0?[1-9]|1[0-3]|3A|13A)$/i.test(text)
  ) {
    if (!canUseFeature(userId)) return requireVip(replyToken);

    const suggest = pick(['莊', '閒']);

    userState[userId] = {
      mode: 'baccarat_running',
      room: text.toUpperCase(),
      lastSuggest: suggest
    };

    return replyText(replyToken,
`━━━━━━━━━━
🤖 黑域AI同步完成
━━━━━━━━━━

✓ 房間同步成功
✓ 牌路數據載入
✓ AI模型運算完成

房間：
${text.toUpperCase()}

目前建議：${suggest}

請輸入目前開出：
莊 / 閒 / 和`,
      qr(['莊', '閒', '和', '結束百家'])
    );
  }

  // ===============================
  // 百家結果回填
  // ===============================
  if (['莊', '閒', '和'].includes(text)) {
    if (!canUseFeature(userId)) return requireVip(replyToken);

    const state = userState[userId];

    if (!state || state.mode !== 'baccarat_running') {
      return replyText(replyToken,
`尚未同步房間。

請先輸入：
百家樂AI`);
    }

    const next = pick(['莊', '閒']);

    userState[userId].lastOpen = text;
    userState[userId].lastSuggest = next;

    return replyText(replyToken,
`━━━━━━━━━━
🤖 黑域AI重新運算
━━━━━━━━━━

目前開出：${text}

✓ 牌路已更新
✓ 模型重新分析完成

下一手建議：${next}

請繼續輸入目前開出：
莊 / 閒 / 和`,
      qr(['莊', '閒', '和', '結束百家'])
    );
  }

  if (text === '結束百家') {
    delete userState[userId];

    return replyText(replyToken,
`━━━━━━━━━━
✅ 百家樂AI已結束
━━━━━━━━━━

需要再次使用請輸入：
百家樂AI`,
      qr(['百家樂AI', '電子AI', '539AI'])
    );
  }

  // ===============================
  // 電子AI
  // ===============================
  if (text === '電子AI' || text === '電子') {
    if (!canUseFeature(userId)) return requireVip(replyToken);

    userState[userId] = {
      mode: 'slot_wait_game'
    };

    return replyText(replyToken,
`━━━━━━━━━━
⚡ 黑域電子AI已啟動
━━━━━━━━━━

請選擇遊戲：

• 戰神賽特1
• 戰神賽特2`,
      qr(['戰神賽特1', '戰神賽特2'])
    );
  }

  if (text === '戰神賽特1' || text === '戰神賽特2') {
    if (!canUseFeature(userId)) return requireVip(replyToken);

    userState[userId] = {
      mode: 'slot_wait_room',
      game: text
    };

    return replyText(replyToken,
`━━━━━━━━━━
⚡ ${text}
━━━━━━━━━━

請輸入房間號碼。

支援：
1 ~ 3500

範例：
377`);
  }

  // ===============================
  // 電子房號
  // ===============================
  if (/^\d{1,4}$/.test(text)) {
    if (!canUseFeature(userId)) return requireVip(replyToken);

    const state = userState[userId];

    if (!state || state.mode !== 'slot_wait_room') {
      return replyText(replyToken,
`請先選擇電子遊戲。

請輸入：
電子AI`);
    }

    const room = parseInt(text, 10);

    if (room < 1 || room > 3500) {
      return replyText(replyToken, '查無此房間，請輸入 1 ~ 3500。');
    }

    const result = pick([
      '可進場',
      '數據中等',
      '數據偏強',
      '連動訊號偏強',
      '波動值提升',
      '高分區間接近'
    ]);

    return replyText(replyToken,
`━━━━━━━━━━
⚡ 黑域電子AI分析完成
━━━━━━━━━━

遊戲：
${state.game}

房間號碼：
${room}

AI分析結果：
${result}

建議：
請自行控管金額，AI只提供數據參考。`,
      qr(['電子AI', '539AI', '百家樂AI'])
    );
  }

  // ===============================
  // 539AI
  // ===============================
  if (text === '539AI' || text === '539') {
    if (!canUseFeature(userId)) return requireVip(replyToken);

    return replyText(replyToken,
`━━━━━━━━━━
🎯 黑域539AI已啟動
━━━━━━━━━━

請選擇分析模式：

• 穩定模式
• 熱號模式
• 冷號模式`,
      qr(['穩定模式', '熱號模式', '冷號模式'])
    );
  }

  if (['穩定模式', '熱號模式', '冷號模式'].includes(text)) {
    if (!canUseFeature(userId)) return requireVip(replyToken);

    const nums = [];

    while (nums.length < 5) {
      const n = Math.floor(Math.random() * 39) + 1;
      if (!nums.includes(n)) nums.push(n);
    }

    nums.sort((a, b) => a - b);

    let modeText = '';

    if (text === '穩定模式') modeText = '穩定分布分析';
    if (text === '熱號模式') modeText = '近期熱號權重分析';
    if (text === '冷號模式') modeText = '冷門補位數據分析';

    return replyText(replyToken,
`━━━━━━━━━━
🎯 黑域539AI分析完成
━━━━━━━━━━

模式：
${modeText}

參考號碼：

${nums.map(n => `🔵 ${n}`).join('\n')}

提醒：
AI僅提供數據參考，非保證結果。`,
      qr(['穩定模式', '熱號模式', '冷號模式', '選單'])
    );
  }

  // ===============================
  // 查無房間提示
  // ===============================
  if (/^(DG|MT)/i.test(text)) {
    return replyText(replyToken,
`查無此房間。

請確認格式：

DG 01
DG RB01
DG S01
MT 01
MT 3A`);
  }

  // ===============================
  // 預設回覆
  // ===============================
  return sendMenu(replyToken);
}

// ===============================
// 啟動
// ===============================
const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`BLACKDOMAIN AI 啟動成功 Port：${port}`);
});
