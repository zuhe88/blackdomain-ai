const io = require("socket.io-client");

let socket;

global.atgRooms = global.atgRooms || {};

const ATG_TOKEN = "4beb75654a914c54bab4e97396382638";

function saveRoom(table) {
  if (!table || !table.number) return;

  const roomNo = String(table.number);
  const old = global.atgRooms[roomNo];

  global.atgRooms[roomNo] = {
    number: roomNo,
    roomId: table.roomId || "",
    status: table.status || "Unknown",
    bet: Number(table.bet || 0),
    win: Number(table.win || 0),
    lastStatus: old?.status || "",
    updateCount: (old?.updateCount || 0) + 1,
    lastUpdate: Date.now(),
  };

  console.log(
    `🔥 房態更新｜房號:${roomNo}｜roomId:${global.atgRooms[roomNo].roomId}｜狀態:${global.atgRooms[roomNo].status}｜投注:${global.atgRooms[roomNo].bet}｜派彩:${global.atgRooms[roomNo].win}`
  );
}

function startAtgSocket() {
  if (socket && socket.connected) return;

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

    const initData = {
      token: ATG_TOKEN,
      clientType: "web",
      deviceInfo: {
        browser: {
          name: "chrome",
          version: "149.0.0.0",
        },
        os: {
          name: "Windows",
          version: "",
          versionName: 0,
        },
        platform: {
          type: "DESKTOP_BROWSER",
        },
        engine: {
          name: "cocos creator 3.7.2",
        },
      },
      locale: "zh-tw",
    };

    socket.emit("initial", initData);

    console.log("🚀 ATG initial token 已送出");
  });

  socket.on("initial", (data) => {
    console.log("📦 INITIAL:", JSON.stringify(data).slice(0, 500));
  });

  socket.on("slotTableUpdated", (data) => {
    if (!data) return;

    if (data.table) {
      saveRoom(data.table);
      return;
    }

    for (const [roomId, status] of Object.entries(data)) {
      console.log(`📡 內部房態｜roomId:${roomId}｜狀態:${status}`);
    }
  });

  socket.on("table", (data) => {
    console.log("📊 TABLE:", JSON.stringify(data).slice(0, 500));

    if (data?.table) {
      saveRoom(data.table);
    }
  });

  socket.on("notify", (data) => {
    console.log("📢 ATG通知:", JSON.stringify(data).slice(0, 300));
  });

  socket.on("message", (data) => {
    console.log("📨 MESSAGE:", JSON.stringify(data).slice(0, 500));
  });

  socket.on("disconnect", (reason) => {
    console.log("⚠️ ATG Socket.IO 斷線：", reason);
  });

  socket.on("connect_error", (err) => {
    console.error("❌ ATG Socket.IO 連線錯誤：", err.message);
  });

  socket.on("error", (err) => {
    console.error("❌ ATG Socket.IO Error:", err);
  });
}

function getHotRooms(limit = 10) {
  return Object.values(global.atgRooms)
    .sort((a, b) => {
      const scoreA =
        (a.updateCount || 0) +
        (a.bet || 0) / 10000 +
        (a.win || 0) / 10000;

      const scoreB =
        (b.updateCount || 0) +
        (b.bet || 0) / 10000 +
        (b.win || 0) / 10000;

      return scoreB - scoreA;
    })
    .slice(0, limit);
}

function getRoom(roomNo) {
  return global.atgRooms[String(roomNo)] || null;
}

module.exports = {
  startAtgSocket,
  getHotRooms,
  getRoom,
};
