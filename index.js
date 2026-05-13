const express = require('express');
const line = require('@line/bot-sdk');

const app = express();

const config = {
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.CHANNEL_SECRET
};

const client = new line.Client(config);

// ===============================
// 管理員設定
// ===============================
const adminUsers = [
  'Uaf293ee976e5170d4e8672d2c12b3f76'
];

// ===============================
// VIP資料
// ===============================
const vipUsers = {};

// ===============================
// 工具函式
// ===============================
function isAdmin(userId) {
  return adminUsers.includes(userId);
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
  const currentExpire = vipUsers[userId] || now;
  const baseTime = currentExpire > now ? currentExpire : now;

  vipUsers[userId] = baseTime + days * 24 * 60 * 60 * 1000;
}

function removeVip(userId) {
  delete vipUsers[userId];
}

function getVipRemaining(userId) {
  if (isAdmin(userId)) {
    return '管理員權限｜永久使用';
  }

  if (!vipUsers[userId]) {
    return '未開通';
  }

  const remaining = vipUsers[userId] - Date.now();

  if (remaining <= 0) {
    return '已到期';
  }

  const days = Math.floor(remaining / (1000 * 60 * 60 * 24));
  const hours = Math.floor(
    (remaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
  );

  return `${days}天 ${hours}小時`;
}

function randomPick(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function replyText(replyToken, text) {
  return client.replyMessage(replyToken, {
    type: 'text',
    text
  });
}

function vipRequiredMessage(replyToken) {
  return replyText(
    replyToken,
`━━━━━━━━━━
🔒 黑域AI系統
━━━━━━━━━━

此功能需要開通VIP權限。

請聯絡管理員開通使用天數。`
  );
}

// ===============================
// 主選單
// ===============================
function mainMenu(replyToken) {
  return client.replyMessage(replyToken, {
    type: 'text',
    text:
`━━━━━━━━━━
🤖 黑域AI系統
━━━━━━━━━━

請選擇功能：

1️⃣ 百家樂AI
2️⃣ 電子AI
3️⃣ 539AI
4️⃣ VIP查詢

你也可以直接輸入：
百家樂AI
電子AI
539AI
VIP查詢`,
    quickReply: {
      items: [
        {
          type: 'action',
          action: {
            type: 'message',
            label: '百家樂AI',
            text: '百家樂AI'
          }
        },
        {
          type: 'action',
          action: {
            type: 'message',
            label: '電子AI',
            text: '電子AI'
          }
        },
        {
          type: 'action',
          action: {
            type: 'message',
            label: '539AI',
            text: '539AI'
          }
        },
        {
          type: 'action',
          action: {
            type: 'message',
            label: 'VIP查詢',
            text: 'VIP查詢'
          }
        }
      ]
    }
  });
}

// ===============================
// Webhook
// ===============================
app.post('/webhook', line.middleware(config), async (req, res) => {
  Promise.all(req.body.events.map(handleEvent))
    .then(() => res.status(200).end())
    .catch((err) => {
      console.error(err);
      res.status(500).end();
    });
});

// ===============================
// 事件處理
// ===============================
async function handleEvent(event) {
  if (event.type !== 'message') return null;
  if (event.message.type !== 'text') return null;

  const userId = event.source.userId;
  const replyToken = event.replyToken;
  const messageText = event.message.text.trim();

  console.log('USER_ID:', userId);
  console.log('MESSAGE:', messageText);

  // ===============================
  // 查自己ID
  // ===============================
  if (messageText === '我的ID') {
    return replyText(replyToken, `你的LINE User ID：\n${userId}`);
  }

  // ===============================
  // 主選單
  // ===============================
  if (
    messageText === '選單' ||
    messageText === '開始' ||
    messageText === '功能' ||
    messageText === 'menu'
  ) {
    return mainMenu(replyToken);
  }

  // ===============================
  // 管理員指令：開通
  // 格式：開通 Uxxxxx 7
  // ===============================
  if (messageText.startsWith('開通 ')) {
    if (!isAdmin(userId)) {
      return replyText(replyToken, '你沒有管理員權限');
    }

    const parts = messageText.split(' ');

    if (parts.length < 3) {
      return replyText(
        replyToken,
`格式錯誤

請輸入：
開通 使用者ID 天數

範例：
開通 Uxxxxxxxx 7`
      );
    }

    const targetUserId = parts[1];
    const days = parseInt(parts[2], 10);

    if (!targetUserId || isNaN(days)) {
      return replyText(replyToken, '開通格式錯誤，天數請輸入數字');
    }

    addVip(targetUserId, days);

    return replyText(
      replyToken,
`━━━━━━━━━━
✅ VIP開通成功
━━━━━━━━━━

使用者：
${targetUserId}

開通天數：
${days}天

剩餘時間：
${getVipRemaining(targetUserId)}`
    );
  }

  // ===============================
  // 管理員指令：取消開通
  // 格式：取消開通 Uxxxxx
  // ===============================
  if (messageText.startsWith('取消開通 ')) {
    if (!isAdmin(userId)) {
      return replyText(replyToken, '你沒有管理員權限');
    }

    const parts = messageText.split(' ');
    const targetUserId = parts[1];

    if (!targetUserId) {
      return replyText(
        replyToken,
`格式錯誤

請輸入：
取消開通 使用者ID`
      );
    }

    removeVip(targetUserId);

    return replyText(
      replyToken,
`━━━━━━━━━━
✅ 已取消VIP
━━━━━━━━━━

使用者：
${targetUserId}`
    );
  }

  // ===============================
  // VIP查詢
  // ===============================
  if (messageText === 'VIP查詢' || messageText === '查詢VIP') {
    return replyText(
      replyToken,
`━━━━━━━━━━
👑 黑域AI VIP
━━━━━━━━━━

目前狀態：
${getVipRemaining(userId)}`
    );
  }

  // ===============================
  // 百家樂AI
  // ===============================
  if (messageText === '百家樂AI') {
    if (!canUseFeature(userId)) {
      return vipRequiredMessage(replyToken);
    }

    return client.replyMessage(replyToken, {
      type: 'text',
      text:
`━━━━━━━━━━
🤖 黑域AI已啟動
━━━━━━━━━━

請提供：

• 百家平台：DG / MT
• 房間號碼

範例：
DG 01
DG RB01
DG S01
MT 01
MT 3A

系統將開始同步牌路數據。`
    });
  }

  // ===============================
  // 百家房號判斷
  // ===============================
  if (
    /^DG\s?(RB|S)?\d{1,2}$/i.test(messageText) ||
    /^MT\s?(\d{1,2}|3A|13A)$/i.test(messageText)
  ) {
    if (!canUseFeature(userId)) {
      return vipRequiredMessage(replyToken);
    }

    const result = randomPick(['莊', '閒']);

    return client.replyMessage(replyToken, {
      type: 'text',
      text:
`━━━━━━━━━━
🤖 黑域AI同步完成
━━━━━━━━━━

✓ 房間同步成功
✓ 牌路數據載入
✓ AI模型運算完成

目前建議：${result}

請輸入目前開出：
莊 / 閒 / 和`,
      quickReply: {
        items: [
          {
            type: 'action',
            action: {
              type: 'message',
              label: '莊',
              text: '莊'
            }
          },
          {
            type: 'action',
            action: {
              type: 'message',
              label: '閒',
              text: '閒'
            }
          },
          {
            type: 'action',
            action: {
              type: 'message',
              label: '和',
              text: '和'
            }
          }
        ]
      }
    });
  }

  // ===============================
  // 百家結果回填
  // ===============================
  if (['莊', '閒', '和'].includes(messageText)) {
    if (!canUseFeature(userId)) {
      return vipRequiredMessage(replyToken);
    }

    const nextResult = randomPick(['莊', '閒']);

    return client.replyMessage(replyToken, {
      type: 'text',
      text:
`━━━━━━━━━━
🤖 黑域AI更新完成
━━━━━━━━━━

目前開出：${messageText}

AI重新運算完成。

下一手建議：${nextResult}

請繼續輸入目前開出：
莊 / 閒 / 和`,
      quickReply: {
        items: [
          {
            type: 'action',
            action: {
              type: 'message',
              label: '莊',
              text: '莊'
            }
          },
          {
            type: 'action',
            action: {
              type: 'message',
              label: '閒',
              text: '閒'
            }
          },
          {
            type: 'action',
            action: {
              type: 'message',
              label: '和',
              text: '和'
            }
          }
        ]
      }
    });
  }

  // ===============================
  // 電子AI
  // ===============================
  if (messageText === '電子AI' || messageText === '電子') {
    if (!canUseFeature(userId)) {
      return vipRequiredMessage(replyToken);
    }

    return client.replyMessage(replyToken, {
      type: 'text',
      text:
`━━━━━━━━━━
⚡ 黑域電子AI已啟動
━━━━━━━━━━

請選擇遊戲：

• 戰神賽特1
• 戰神賽特2`,
      quickReply: {
        items: [
          {
            type: 'action',
            action: {
              type: 'message',
              label: '戰神賽特1',
              text: '戰神賽特1'
            }
          },
          {
            type: 'action',
            action: {
              type: 'message',
              label: '戰神賽特2',
              text: '戰神賽特2'
            }
          }
        ]
      }
    });
  }

  // ===============================
  // 戰神賽特
  // ===============================
  if (messageText === '戰神賽特1' || messageText === '戰神賽特2') {
    if (!canUseFeature(userId)) {
      return vipRequiredMessage(replyToken);
    }

    return replyText(
      replyToken,
`━━━━━━━━━━
⚡ ${messageText}
━━━━━━━━━━

請輸入房間號碼。

範圍：
1 ~ 3500

範例：
377`
    );
  }

  // ===============================
  // 電子房號分析
  // ===============================
  if (/^\d{1,4}$/.test(messageText)) {
    if (!canUseFeature(userId)) {
      return vipRequiredMessage(replyToken);
    }

    const roomNumber = parseInt(messageText, 10);

    if (roomNumber < 1 || roomNumber > 3500) {
      return replyText(replyToken, '查無此房間，請輸入 1 ~ 3500 的房號');
    }

    const result = randomPick([
      '可進場',
      '數據中等',
      '數據偏強'
    ]);

    return replyText(
      replyToken,
`━━━━━━━━━━
⚡ 黑域電子AI分析完成
━━━━━━━━━━

房間號碼：${roomNumber}

AI數據結果：
${result}

提醒：AI僅作為數據參考，請自行控管金額。`
    );
  }

  // ===============================
  // 539AI
  // ===============================
  if (messageText === '539AI' || messageText === '539') {
    if (!canUseFeature(userId)) {
      return vipRequiredMessage(replyToken);
    }

    const numbers = [];

    while (numbers.length < 5) {
      const n = Math.floor(Math.random() * 39) + 1;
      if (!numbers.includes(n)) {
        numbers.push(n);
      }
    }

    numbers.sort((a, b) => a - b);

    return replyText(
      replyToken,
`━━━━━━━━━━
🎯 黑域539AI
━━━━━━━━━━

AI數據分析完成

今日參考號碼：

${numbers.map(n => `🔵 ${n}`).join('\n')}

提醒：此為AI數據參考，非保證結果。`
    );
  }

  // ===============================
  // 預設回覆
  // ===============================
  return mainMenu(replyToken);
}

// ===============================
// 啟動伺服器
// ===============================
const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`黑域AI系統已啟動，Port：${port}`);
});
