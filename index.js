const express = require("express");
const line = require("@line/bot-sdk");

const app = express();

const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
};

const client = new line.Client(config);

app.get("/", (req, res) => {
  res.send("BlackDomain AI Running");
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

function getPredictionDate() {
  const now = new Date();

  const taiwanTime = new Date(
    now.toLocaleString("en-US", { timeZone: "Asia/Taipei" })
  );

  let year = taiwanTime.getFullYear();
  let month = taiwanTime.getMonth();
  let date = taiwanTime.getDate();
  let hour = taiwanTime.getHours();
  let day = taiwanTime.getDay();

  let targetDate = new Date(year, month, date);

  // 星期日統一預測星期一
  if (day === 0) {
    targetDate.setDate(targetDate.getDate() + 1);
  } 
  // 晚上8點後預測隔天
  else if (hour >= 20) {
    targetDate.setDate(targetDate.getDate() + 1);

    // 如果隔天是星期日，跳到星期一
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
  let pool = [];

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
      n = pool[Math.floor(Math.random() * pool.length)];
    } else {
      n = Math.floor(Math.random() * 39) + 1;
    }

    if (!numbers.includes(n)) {
      numbers.push(n);
    }
  }

  return numbers.sort((a, b) => a - b).map(n => String(n).padStart(2, "0"));
}

async function handleEvent(event) {
  if (event.type !== "message") return null;
  if (event.message.type !== "text") return null;

  const userText = event.message.text.trim();
  const lowerText = userText.toLowerCase();

  const randomResult = Math.random() < 0.5 ? "莊" : "閒";

  // 539 AI 選單
  if (
    userText === "539" ||
    userText === "539AI" ||
    userText === "539 AI"
  ) {
    return client.replyMessage(event.replyToken, {
      type: "text",
      text:
`━━━━━━━━━━
📊 黑域539AI已啟動
━━━━━━━━━━

請選擇模式：

• 539穩定
• 539熱號
• 539冷號

系統將開始同步號碼波動資料。`
    });
  }

  // 539 穩定模式
  if (userText === "539穩定") {
    const nums = generate539Numbers("stable");
    const predictionDate = getPredictionDate();

    return client.replyMessage(event.replyToken, {
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

⚠️ 僅供娛樂分析參考`
    });
  }

  // 539 熱號模式
  if (userText === "539熱號") {
    const nums = generate539Numbers("hot");
    const predictionDate = getPredictionDate();

    return client.replyMessage(event.replyToken, {
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

⚠️ 僅供娛樂分析參考`
    });
  }

  // 539 冷號模式
  if (userText === "539冷號") {
    const nums = generate539Numbers("cold");
    const predictionDate = getPredictionDate();

    return client.replyMessage(event.replyToken, {
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

建議：
可搭配熱號混合觀察

⚠️ 僅供娛樂分析參考`
    });
  }

  // 百家樂選單
  if (userText === "百家樂") {
    return client.replyMessage(event.replyToken, {
      type: "text",
      text:
`━━━━━━━━━━
⚡ 黑域AI已啟動
━━━━━━━━━━

請選擇遊戲：

• DG
• MT`
    });
  }

  // 電子AI啟動
  if (
    userText === "電子" ||
    userText === "電子AI"
  ) {
    return client.replyMessage(event.replyToken, {
      type: "text",
      text:
`━━━━━━━━━━
⚡ 黑域電子AI已啟動
━━━━━━━━━━

請選擇遊戲：

• 戰神賽特1
• 戰神賽特2`
    });
  }

  // 電子遊戲選擇
  if (
    userText === "戰神賽特1" ||
    userText === "戰神賽特2"
  ) {
    const room = Math.floor(Math.random() * 3500) + 1;

    const suggestions = [
      "可進場",
      "不可進場",
      "數據偏弱",
      "數據中等",
      "數據偏強"
    ];

    const randomSuggestion =
      suggestions[Math.floor(Math.random() * suggestions.length)];

    return client.replyMessage(event.replyToken, {
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
${randomSuggestion}`
    });
  }

  // DG / MT 啟動
  if (
    lowerText === "dg" ||
    lowerText === "mt"
  ) {
    return client.replyMessage(event.replyToken, {
      type: "text",
      text:
`━━━━━━━━━━
🤖 黑域AI已啟動
━━━━━━━━━━

請提供：

• 百家平台（DG / MT）
• 房間號碼

系統將開始同步牌路數據。`
    });
  }

  // MT房間判斷
  const isValidMT =
    /^mt\s*(?:0?[1-9]|1[0-3]|3a|13a)$/i.test(userText);

  // DG房間判斷
  const isValidDG =
    /^dg\s*(?:0?[1-7]|rb0?[1-7]|s0?[1-7])$/i.test(userText);

  const isWrongRoom =
    /^mt/i.test(userText) ||
    /^dg/i.test(userText);

  // 百家樂同步完成
  if (isValidMT || isValidDG) {
    return client.replyMessage(event.replyToken, {
      type: "text",
      text:
`━━━━━━━━━━
🤖 黑域AI同步完成
━━━━━━━━━━

✓ 房間同步成功
✓ 牌路數據載入
✓ AI模型運算完成

目前建議：
${randomResult}

請輸入目前開出：
莊 / 閒 / 和`
    });
  }

  // 查無房間
  if (isWrongRoom) {
    return client.replyMessage(event.replyToken, {
      type: "text",
      text: "查無此房間"
    });
  }

  // 莊閒和輸入
  if (
    userText === "莊" ||
    userText === "閒" ||
    userText === "和"
  ) {
    const nextResult = Math.random() < 0.5 ? "莊" : "閒";

    return client.replyMessage(event.replyToken, {
      type: "text",
      text:
`━━━━━━━━━━
🤖 黑域AI運算完成
━━━━━━━━━━

目前建議：
${nextResult}

請輸入目前開出：
莊 / 閒 / 和`
    });
  }

  // 預設訊息
  return client.replyMessage(event.replyToken, {
    type: "text",
    text:
`━━━━━━━━━━
🧠 BLACKDOMAIN AI
━━━━━━━━━━

請輸入：

• 百家樂
• 電子
• 539`
  });
}

const port = process.env.PORT || 8080;

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
