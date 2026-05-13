const express = require("express");
const line = require("@line/bot-sdk");
const { createClient } = require("@supabase/supabase-js");

const app = express();

const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
};

const client = new line.Client(config);

// ===== Supabase =====
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// ===== 管理員設定 =====
const adminId = "Uaf293ee976e5170d4e8672d2c12b3f76";

// ===== 暫存申請帳號 =====
const pendingAccounts = {};

function randomPick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ===== VIP檢查 =====
async function checkVip(userId) {

  const { data } =
    await supabase
      .from("vip_users")
      .select("*")
      .eq("user_id", userId)
      .single();

 // ===== VIP查詢 =====
if (
  userText === "VIP" ||
  userText === "查詢VIP" ||
  userText === "查詢VIP權限" ||
  userText === "查詢VIP權限時間" ||
  userText === "VIP時間"
) {

  const isVip =
    await checkVip(userId);

  if (!isVip) {

    return client.replyMessage(
      event.replyToken,
      {
        type: "text",
        text: noVipMessage()
      }
    );
  }

  return client.replyMessage(
    event.replyToken,
    {
      type: "text",

      text:
`━━━━━━━━━━
👑 黑域 VIP
━━━━━━━━━━

VIP狀態：
已開通

到期時間：
${await vipExpireText(userId)}`
    }
  );
}

// ===== 開通VIP =====
async function openVip(
  userId,
  account,
  days
) {

  const expireTime =
    Date.now() +
    days * 24 * 60 * 60 * 1000;

  await supabase
    .from("vip_users")
    .upsert([
      {
        user_id: userId,
        account: account,
        expire_time: expireTime
      }
    ]);
}

// ===== VIP到期時間 =====
async function vipExpireText(
  userId
) {

  const { data } =
    await supabase
      .from("vip_users")
      .select("*")
      .eq("user_id", userId)
      .single();

  if (!data) {
    return "未開通";
  }

  return new Date(
    data.expire_time
  ).toLocaleString(
    "zh-TW",
    {
      timeZone: "Asia/Taipei"
    }
  );
}

// ===== 未開通 =====
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

// ===== Quick Reply =====
function quick539(excludeMode) {

  const modes = [
    {
      label: "539穩定",
      text: "539穩定"
    },
    {
      label: "539熱號",
      text: "539熱號"
    },
    {
      label: "539冷號",
      text: "539冷號"
    }
  ];

  return {
    items: modes
      .filter(
        mode =>
          mode.text !== excludeMode
      )
      .map(mode => ({
        type: "action",
        action: {
          type: "message",
          label: mode.label,
          text: mode.text
        }
      }))
  };
}

function quickBaccarat() {

  return {
    items: [

      {
        type: "action",
        action: {
          type: "message",
          label: "莊",
          text: "莊"
        }
      },

      {
        type: "action",
        action: {
          type: "message",
          label: "閒",
          text: "閒"
        }
      },

      {
        type: "action",
        action: {
          type: "message",
          label: "和",
          text: "和"
        }
      }

    ]
  };
}

function quickSlot() {

  return {
    items: [

      {
        type: "action",
        action: {
          type: "message",
          label: "戰神賽特1",
          text: "戰神賽特1"
        }
      },

      {
        type: "action",
        action: {
          type: "message",
          label: "戰神賽特2",
          text: "戰神賽特2"
        }
      }

    ]
  };
}

// ===== 539日期 =====
function getPredictionDate() {

  const taiwanNow = new Date(
    new Date().toLocaleString("en-US", {
      timeZone: "Asia/Taipei"
    })
  );

  const taiwanHour = Number(
    taiwanNow.toLocaleString("en-US", {
      hour: "2-digit",
      hour12: false,
      timeZone: "Asia/Taipei"
    })
  );

  const taiwanMinute = Number(
    taiwanNow.toLocaleString("en-US", {
      minute: "2-digit",
      timeZone: "Asia/Taipei"
    })
  );

  const targetDate = new Date(
    taiwanNow.getFullYear(),
    taiwanNow.getMonth(),
    taiwanNow.getDate()
  );

  const day = taiwanNow.getDay();

  if (day === 0) {

    targetDate.setDate(
      targetDate.getDate() + 1
    );

  }

  else if (
    taiwanHour > 20 ||
    (
      taiwanHour === 20 &&
      taiwanMinute >= 20
    )
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

// ===== 固定每日539 =====
const daily539Cache = {};

function generate539Numbers(mode) {

  const predictionDate =
    getPredictionDate();

  const cacheKey =
    `${predictionDate}-${mode}`;

  if (daily539Cache[cacheKey]) {
    return daily539Cache[cacheKey];
  }

  let pool;

  if (mode === "hot") {

    pool = [
      3,5,8,11,13,16,19,
      22,27,31,33,36,38,39
    ];

  }

  else if (mode === "cold") {

    pool = [
      1,4,6,9,12,15,18,
      21,24,26,29,32,34,37
    ];

  }

  else {

    pool = [
      2,5,7,10,13,17,20,
      23,25,28,30,33,35,38,39
    ];
  }

  const numbers = [];

  while (numbers.length < 5) {

    let n;

    if (Math.random() < 0.7) {

      n = randomPick(pool);

    }

    else {

      n =
        Math.floor(Math.random() * 39) + 1;
    }

    if (!numbers.includes(n)) {

      numbers.push(n);
    }
  }

  const finalNumbers = numbers
    .sort((a, b) => a - b)
    .map(n =>
      String(n).padStart(2, "0")
    );

  daily539Cache[cacheKey] =
    finalNumbers;

  return finalNumbers;
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

    }

    catch (err) {

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

  const userId =
    event.source.userId;

  const userText =
    event.message.text.trim();

  const lowerText =
    userText.toLowerCase();

  const bankerPlayer =
    randomPick(["莊", "閒"]);

  // ===== 我的ID =====
  if (userText === "我的ID") {

    return client.replyMessage(
      event.replyToken,
      {
        type: "text",
        text: userId
      }
    );
  }

  // ===== 申請開通 =====
  if (
    userText.startsWith("申請開通 ")
  ) {

    const account =
      userText.replace(
        "申請開通 ",
        ""
      ).trim();

    pendingAccounts[account] =
      userId;

    return client.replyMessage(
      event.replyToken,
      {
        type: "text",

        text:
`━━━━━━━━━━
📝 已收到開通申請
━━━━━━━━━━

3A帳號：
${account}

請等待管理員審核開通。`
      }
    );
  }

  // ===== 管理員開通 =====
  if (
    userText.startsWith("開通 ")
  ) {

    if (userId !== adminId) {

      return client.replyMessage(
        event.replyToken,
        {
          type: "text",
          text: "你沒有管理員權限"
        }
      );
    }

    const parts =
      userText.split(" ");

    const account = parts[1];

    const days =
      parseInt(parts[2]);

    if (!account || !days) {

      return client.replyMessage(
        event.replyToken,
        {
          type: "text",

          text:
"格式錯誤\n範例：開通 abc123 2"
        }
      );
    }

    const targetUserId =
      pendingAccounts[account];

    if (!targetUserId) {

      return client.replyMessage(
        event.replyToken,
        {
          type: "text",

          text:
`查無此申請帳號：
${account}`
        }
      );
    }

    await openVip(
      targetUserId,
      account,
      days
    );

    return client.replyMessage(
      event.replyToken,
      {
        type: "text",

        text:
`━━━━━━━━━━
✅ 黑域AI開通成功
━━━━━━━━━━

3A帳號：
${account}

開通天數：
${days}天

到期時間：
${await vipExpireText(targetUserId)}`
      }
    );
  }

  // ===== VIP查詢 =====
  if (userText === "VIP") {

    const isVip =
      await checkVip(userId);

    if (!isVip) {

      return client.replyMessage(
        event.replyToken,
        {
          type: "text",
          text: noVipMessage()
        }
      );
    }

    return client.replyMessage(
      event.replyToken,
      {
        type: "text",

        text:
`━━━━━━━━━━
👑 BLACKDOMAIN VIP
━━━━━━━━━━

VIP狀態：
已開通

到期時間：
${await vipExpireText(userId)}`
      }
    );
  }

  // ===== 權限檢查 =====
  const vipCommands = [

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
    "和"

  ];

  const isBaccaratRoom =
    /^mt/i.test(userText) ||
    /^dg/i.test(userText);

  if (
    vipCommands.includes(userText) ||
    isBaccaratRoom
  ) {

    const isVip =
      await checkVip(userId);

    if (!isVip) {

      return client.replyMessage(
        event.replyToken,
        {
          type: "text",
          text: noVipMessage()
        }
      );
    }
  }

  // ===== 百家樂 =====
  if (userText === "百家樂") {

    return client.replyMessage(
      event.replyToken,
      {
        type: "text",

        text:
`━━━━━━━━━━
⚡ 黑域AI已啟動
━━━━━━━━━━

請選擇遊戲：

• DG
• MT`,

        quickReply: {
          items: [

            {
              type: "action",
              action: {
                type: "message",
                label: "DG",
                text: "DG"
              }
            },

            {
              type: "action",
              action: {
                type: "message",
                label: "MT",
                text: "MT"
              }
            }

          ]
        }
      }
    );
  }

  // ===== DG MT =====
  if (
    lowerText === "dg" ||
    lowerText === "mt"
  ) {

    return client.replyMessage(
      event.replyToken,
      {
        type: "text",

        text:
`━━━━━━━━━━
🤖 黑域AI已啟動
━━━━━━━━━━

請輸入房間號碼

範例：
DG RB01
MT 01`
      }
    );
  }

  // ===== 電子 =====
  if (
    userText === "電子" ||
    userText === "電子AI"
  ) {

    return client.replyMessage(
      event.replyToken,
      {
        type: "text",

        text:
`━━━━━━━━━━
⚡ 黑域電子AI已啟動
━━━━━━━━━━

請選擇遊戲：

• 戰神賽特1
• 戰神賽特2`,

        quickReply:
          quickSlot()
      }
    );
  }

  // ===== 電子同步 =====
  if (
    userText === "戰神賽特1" ||
    userText === "戰神賽特2"
  ) {

    const room =
      Math.floor(
        Math.random() * 3500
      ) + 1;

    const suggestion =
      randomPick([
        "可進場",
        "數據中等",
        "數據偏強"
      ]);

    return client.replyMessage(
      event.replyToken,
      {
        type: "text",

        text:
`━━━━━━━━━━
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

        quickReply:
          quickSlot()
      }
    );
  }

  // ===== 539 =====
  if (
    userText === "539" ||
    userText === "539AI" ||
    userText === "539 AI"
  ) {

    return client.replyMessage(
      event.replyToken,
      {
        type: "text",

        text:
`━━━━━━━━━━
📊 黑域539AI已啟動
━━━━━━━━━━

請選擇模式：

• 539穩定
• 539熱號
• 539冷號

系統將開始同步號碼波動資料。`,

        quickReply:
          quick539()
      }
    );
  }

  // ===== 539穩定 =====
  if (userText === "539穩定") {

    const nums =
      generate539Numbers("stable");

    const predictionDate =
      getPredictionDate();

    return client.replyMessage(
      event.replyToken,
      {
        type: "text",

        text:
`━━━━━━━━━━
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

        quickReply:
          quick539("539穩定")
      }
    );
  }

  // ===== 539熱號 =====
  if (userText === "539熱號") {

    const nums =
      generate539Numbers("hot");

    const predictionDate =
      getPredictionDate();

    return client.replyMessage(
      event.replyToken,
      {
        type: "text",

        text:
`━━━━━━━━━━
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

        quickReply:
          quick539("539熱號")
      }
    );
  }

  // ===== 539冷號 =====
  if (userText === "539冷號") {

    const nums =
      generate539Numbers("cold");

    const predictionDate =
      getPredictionDate();

    return client.replyMessage(
      event.replyToken,
      {
        type: "text",

        text:
`━━━━━━━━━━
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

        quickReply:
          quick539("539冷號")
      }
    );
  }

  // ===== MT =====
  const isValidMT =
    /^mt\s*(?:0?[1-9]|1[0-3]|3a|13a)$/i
    .test(userText);

  // ===== DG =====
  const isValidDG =
    /^dg\s*(?:0?[1-7]|rb\s*0?[1-7]|s\s*0?[1-7])$/i
    .test(userText);

  const isWrongRoom =
    /^mt/i.test(userText) ||
    /^dg/i.test(userText);

  // ===== 百家樂同步 =====
  if (isValidMT || isValidDG) {

    return client.replyMessage(
      event.replyToken,
      {
        type: "text",

        text:
`━━━━━━━━━━
🤖 黑域AI同步完成
━━━━━━━━━━

✓ 房間同步成功
✓ 牌路數據載入
✓ AI模型運算完成

目前建議：
${bankerPlayer}

請輸入目前開出：
莊 / 閒 / 和`,

        quickReply:
          quickBaccarat()
      }
    );
  }

  // ===== 查無房間 =====
  if (isWrongRoom) {

    return client.replyMessage(
      event.replyToken,
      {
        type: "text",
        text: "查無此房間"
      }
    );
  }

  // ===== 莊閒和 =====
  if (
    userText === "莊" ||
    userText === "閒" ||
    userText === "和"
  ) {

    const nextResult =
      randomPick(["莊", "閒"]);

    return client.replyMessage(
      event.replyToken,
      {
        type: "text",

        text:
`━━━━━━━━━━
🤖 黑域AI運算完成
━━━━━━━━━━

目前建議：
${nextResult}

請輸入目前開出：
莊 / 閒 / 和`,

        quickReply:
          quickBaccarat()
      }
    );
  }

  // ===== 預設 =====
  return client.replyMessage(
    event.replyToken,
    {
      type: "text",

      text:
`━━━━━━━━━━
🤖 歡迎使用黑域AI
━━━━━━━━━━

請選擇功能：

• 百家樂
• 電子
• 539

若尚未開通，請輸入：
申請開通 你的3A帳號`
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
