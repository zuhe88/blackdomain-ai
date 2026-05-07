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
你是「黑域AI」，一個百家樂牌路分析助手。

你的任務：
1. 分析使用者輸入的莊、閒、和牌路。
2. 給出趨勢判斷。
3. 提醒資金控管。
4. 不可以保證必中。
5. 不可以說一定會贏。
6. 語氣要專業、有科技感、有壓迫感。

使用者輸入：
${userText}

請用以下格式回覆：

🤖 黑域AI牌路分析

目前牌路：
...

趨勢判斷：
...

AI建議：
...

風險提醒：
...
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
