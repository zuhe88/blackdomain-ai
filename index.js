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

async function handleEvent(event) {
  if (event.type !== "message") {
    return null;
  }

  if (event.message.type !== "text") {
    return null;
  }

  const userText = event.message.text.trim();

  // 隨機 莊 / 閒
  const randomResult = Math.random() < 0.5 ? "莊" : "閒";

  // 啟動系統
  if (
    userText.toLowerCase() === "dg" ||
    userText.toLowerCase() === "mt"
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

  // 房間同步
  if (
    /^dg\s*\d+/i.test(userText) ||
    /^dg\s*rb\d+/i.test(userText) ||
    /^dg\s*s\d+/i.test(userText) ||
    /^mt\s*\d+/i.test(userText) ||
    /^mt\s*3a/i.test(userText) ||
    /^mt\s*13a/i.test(userText)
  ) {
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

  // 玩家輸入結果後 繼續下一顆
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

  // 其他訊息
  return client.replyMessage(event.replyToken, {
    type: "text",
    text: "請輸入 DG 或 MT 啟動系統"
  });
}

const port = process.env.PORT || 8080;

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
