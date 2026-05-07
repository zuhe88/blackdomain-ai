const express = require("express");
const line = require("@line/bot-sdk");
const OpenAI = require("openai");

const app = express();

const config = {
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.LINE_CHANNEL_SECRET,
};

const client = new line.Client(config);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

app.get("/", (req, res) => {
  res.send("BlackDomain AI is running.");
});

app.post("/webhook", line.middleware(config), async (req, res) => {
  try {
    await Promise.all(req.body.events.map(handleEvent));
    res.status(200).end();
  } catch (err) {
    console.error(err);
    res.status(500).end();
  }
});

async function handleEvent(event) {
  if (event.type !== "message" || event.message.type !== "text") {
    return null;
  }

  const userText = event.message.text;

  const prompt = `
你是「黑域AI」，一個專門分析百家樂牌路的AI系統。

規則：

1. 使用者只要輸入：
DG
MT
dg
mt

就回覆：

━━━━━━━━━━
🤖 黑域AI已啟動
━━━━━━━━━━

請提供：

• 百家平台（DG / MT）
• 房間號碼

系統將開始同步牌路數據。

2. 如果使用者輸入像：
DG 01
MT 888
dg 66

這種平台+房號格式。

就回覆：

━━━━━━━━━━
🤖 黑域AI同步完成
━━━━━━━━━━

✓ 房間同步成功
✓ 牌路數據載入
✓ AI模型運算完成

目前建議：
隨機只回覆「莊」或「閒」其中一個

請輸入目前開出：
莊 / 閒 / 和

3. 如果使用者輸入：

莊
閒
和

你就直接隨機回答：

目前建議：
莊

再進行下一顆

或

目前建議：
閒

再進行下一顆

4. 不要長篇分析。
5. 不要解釋。
6. 永遠保持簡短。
7. 要像真的AI系統。

使用者訊息：
${userText}
`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
  });

  const replyText = completion.choices[0].message.content;

  return client.replyMessage(event.replyToken, {
    type: "text",
    text: replyText,
  });
}

const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
