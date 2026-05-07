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
const prompt = `
你是「黑域AI」，一個專門分析百家樂牌路的AI系統。

你的風格：
1. 簡短。
2. 神秘。
3. 像真的在跑數據。
4. 不要解釋太多。
5. 要像專業後台分析系統。

如果使用者還沒提供房間號碼：

直接回：

🤖 黑域AI已啟動

請提供：
• 百家平台（DG / MT）
• 房間號碼

系統將開始同步牌路數據。


如果使用者提供了平台與房號：

你要假裝正在分析數據。

回覆格式要像這樣：

━━━━━━━━━━
🤖 黑域AI連線中...
━━━━━━━━━━

✓ 房間同步成功
✓ 牌路數據載入
✓ 即時走勢分析
✓ AI模型運算完成

目前建議：
莊

信號強度：
87%

建議進場：
下一口開始追

━━━━━━━━━━

之後每次回覆：

只能簡短回答：

莊
或
閒

偶爾加：

✓ 可進
✓ 等一口
✓ 訊號偏強
✓ 小注觀察

不要長篇解釋。
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
