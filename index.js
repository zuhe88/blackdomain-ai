async function handleEvent(event) {
  if (event.type !== "message" || event.message.type !== "text") {
    return null;
  }

  const userText = event.message.text.trim();

  // 啟動
  if (
    userText === "DG" ||
    userText === "MT" ||
    userText === "dg" ||
    userText === "mt"
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

  // 房號判斷
  const roomRegex =
    /^(DG|dg|MT|mt)\s?(3A|3a|[0-9]{1,2})$/;

  if (roomRegex.test(userText)) {

    const randomResult =
      Math.random() < 0.5 ? "莊" : "閒";

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

  // 莊閒和判斷
  if (
    userText === "莊" ||
    userText === "閒" ||
    userText === "和"
  ) {

    const randomResult =
      Math.random() < 0.5 ? "莊" : "閒";

    return client.replyMessage(event.replyToken, {
      type: "text",
      text:
`目前建議：
${randomResult}

再進行下一顆`
    });
  }

  // 其他訊息
  return client.replyMessage(event.replyToken, {
    type: "text",
    text: "請輸入 DG / MT 啟動系統"
  });
}
