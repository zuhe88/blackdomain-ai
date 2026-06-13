const io = require("socket.io-client");

let socket;

function startAtgSocket() {
  socket = io("wss://socket.godeebxp.com", {
    path: "/socket.io",
    transports: ["websocket"],
    reconnection: true,
    reconnectionDelay: 5000,
    timeout: 20000,
    query: {
      EIO: 3,
      transport: "websocket",
    },
  });

  socket.on("connect", () => {
    console.log("✅ ATG Socket.IO 已連線");

    socket.emit("initial", {
      token: "",
      clientType: "web",
      deviceInfo: {
        browser: {
          name: "chrome",
          version: "149.0.0.0",
        },
        os: {
          name: "windows",
        },
      },
    });
  });

  socket.on("slotTableUpdated", (data) => {
    console.log("🔥 房態更新：", data);
  });

  socket.on("notify", (data) => {
    console.log("📢 ATG通知：", data?.text || "");
  });

  socket.on("disconnect", (reason) => {
    console.log("⚠️ ATG Socket.IO 斷線：", reason);
  });

  socket.on("connect_error", (err) => {
    console.error("❌ ATG Socket.IO 連線錯誤：", err.message);
  });
}

module.exports = {
  startAtgSocket,
};
