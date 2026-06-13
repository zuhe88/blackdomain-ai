const WebSocket = require("ws");

let ws;

function startAtgSocket() {
  ws = new WebSocket("wss://socket.godeebxp.com/socket.io/?EIO=3&transport=websocket");

  ws.on("open", () => {
    console.log("✅ ATG Socket 已連線");
    ws.send("40");
  });

  ws.on("message", (msg) => {
    const text = msg.toString();

    if (text.includes("slotTableUpdated")) {
      console.log("🔥 房態更新：", text);
    }
  });

  ws.on("close", () => {
    console.log("⚠️ ATG Socket 斷線，5秒後重連");
    setTimeout(startAtgSocket, 5000);
  });

  ws.on("error", (err) => {
    console.error("ATG Socket Error:", err.message);
  });
}

module.exports = {
  startAtgSocket,
};
