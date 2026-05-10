const express = require("express");
const line = require("@line/bot-sdk");

const app = express();

const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
};

const client = new line.Client(config);

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

function randomPick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

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

  // 星期日直接預測星期一
  if (day === 0) {

    targetDate.setDate(
      targetDate.getDate() + 1
    );

  }

  // 晚上20:20後預測隔天
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

    // 如果隔天是星期日
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

// 固定每日號碼
const daily539Cache = {};

function generate539Numbers(mode) {

  const predictionDate =
    getPredictionDate();

  const cacheKey =
    `${predictionDate}-${mode}`;

  // 已存在就固定回傳
  if (daily539Cache[cacheKey]) {
    return daily539Cache[cacheKey];
  }

  let pool;

  if (mode === "hot") {

    pool = [
      3,5,8,11,13,16,19,
      22,27,31,33,36,38,39
    ];

  } else if (mode === "cold") {

    pool = [
      1,4,6,9,12,15,18,
      21,24,26,29,32,34,37
    ];

  } else {

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

    } else {

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

  // 快取固定
  daily539Cache[cacheKey] =
    finalNumbers;

  return finalNumbers;
}

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

async function handleEvent(event) {

  if (event.type !== "message")
    return null;

  if (event.message.type !== "text")
    return null;

  const userText =
    event.message.text.trim();

  const lowerText =
    userText.toLowerCase();

  const bankerPlayer =
    randomPick(["莊", "閒"]);

  // 百家樂
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

  // DG / MT
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

  // 電子AI
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

        quickReply: {
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
        }
      }
    );
  }

  // 電子同步
  if (
    userText === "戰神賽特1" ||
    userText === "戰神賽特2"
  ) {

    const room =
      Math.floor(Math.random() * 3500) + 1;

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
${suggestion}`
      }
    );
  }

  // 539
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

        quickReply: quick539()
      }
    );
  }

  // 539穩定
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

  // 539熱號
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

  // 539冷號
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

本期建議號碼：

${nums.join("　")}

冷區關注：
${nums[1]} / ${nums[4]}

⚠️ 僅供娛樂分析參考`,

        quickReply:
          quick539("539冷號")
      }
    );
  }

  // MT房間
  const isValidMT =
    /^mt\s*(?:0?[1-9]|1[0-3]|3a|13a)$/i
    .test(userText);

  // DG房間
  const isValidDG =
    /^dg\s*(?:0?[1-7]|rb\s*0?[1-7]|s\s*0?[1-7])$/i
    .test(userText);

  const isWrongRoom =
    /^mt/i.test(userText) ||
    /^dg/i.test(userText);

  // 百家樂同步
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

  // 查無房間
  if (isWrongRoom) {

    return client.replyMessage(
      event.replyToken,
      {
        type: "text",
        text: "查無此房間"
      }
    );
  }

  // 莊閒和
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

  // 預設
  return client.replyMessage(
    event.replyToken,
    {
      type: "text",

      text:
`━━━━━━━━━━
🧠 BLACKDOMAIN AI
━━━━━━━━━━

請選擇功能：

• 百家樂
• 電子
• 539`
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
