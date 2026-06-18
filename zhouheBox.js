const express = require("express");
const line = require("@line/bot-sdk");
const { createClient } = require("@supabase/supabase-js");

module.exports = function (app) {
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY
  );

  const LIFF_ID = "2010438983-M6Y3y5Y0";

  const ADMIN_UIDS = [
    "U0ac5f4989e00ef3d8a9ab59dc00dca7d"
  ];

  const pendingBind = {};

  const zhouheConfig = {
    channelAccessToken: process.env.ZHOUHE_CHANNEL_ACCESS_TOKEN,
    channelSecret: process.env.ZHOUHE_CHANNEL_SECRET,
  };

  const zhouheClient = new line.Client(zhouheConfig);

  app.post("/zhouhe/webhook", line.middleware(zhouheConfig), async (req, res) => {
    try {
      await Promise.all(req.body.events.map(handleZhouheEvent));
      res.status(200).end();
    } catch (err) {
      console.error("ZHOUHE WEBHOOK ERROR:", err);
      res.status(500).end();
    }
  });

  async function handleZhouheEvent(event) {
    if (event.type !== "message" || event.message.type !== "text") return;

    const text = event.message.text.trim();
    const userId = event.source.userId;

    if (text === "綁定" || text === "綁定帳號") {
      pendingBind[userId] = true;
      return reply(event.replyToken, "請輸入您的3A帳號\n\n範例：hohoho321321");
    }

    if (pendingBind[userId]) {
      delete pendingBind[userId];
      return createVipRequest(event.replyToken, userId, text);
    }

    if (text === "碎片查詢") {
      return handleFragmentQuery(event.replyToken, userId);
    }

    if (text.startsWith("#通過")) {
      if (!ADMIN_UIDS.includes(userId)) {
        return reply(event.replyToken, "你沒有管理員權限。");
      }

      const parts = text.split(/\s+/);
      const account = parts[1];

      if (!account) {
        return reply(event.replyToken, "格式錯誤\n請輸入：#通過 3A帳號");
      }

      return approveAccount(event.replyToken, account);
    }

    if (text.startsWith("#加碎片")) {
      if (!ADMIN_UIDS.includes(userId)) {
        return reply(event.replyToken, "你沒有管理員權限。");
      }

      const parts = text.split(/\s+/);
      const account = parts[1];
      const count = Number(parts[2]);

      if (!account || !count || count <= 0) {
        return reply(
          event.replyToken,
          "格式錯誤\n請輸入：#加碎片 3A帳號 數量\n例如：#加碎片 hohoho321321 5"
        );
      }

      return handleAddFragments(event.replyToken, userId, account, count);
    }
  }

  function reply(replyToken, text) {
    return zhouheClient.replyMessage(replyToken, {
      type: "text",
      text,
    });
  }

  async function createVipRequest(replyToken, userId, account) {
    const { error } = await supabase.from("vip_requests").insert({
      user_id: userId,
      account,
      status: "pending",
    });

    if (error) {
      console.error("VIP REQUEST ERROR:", error);
      return reply(replyToken, "送出失敗，請稍後再試或聯繫管理員。");
    }

    return reply(
      replyToken,
      "✅ 申請已送出\n\n3A帳號：" +
        account +
        "\n狀態：等待管理員審核\n\n審核通過後可使用碎片系統。"
    );
  }

  async function approveAccount(replyToken, account) {
    const { data: reqData, error: reqError } = await supabase
      .from("vip_requests")
      .select("*")
      .eq("account", account)
      .order("id", { ascending: false })
      .limit(1)
      .single();

    if (reqError || !reqData) {
      return reply(replyToken, "查無待審核帳號：" + account);
    }

    const { data: existing } = await supabase
      .from("vip_users")
      .select("*")
      .eq("user_id", reqData.user_id)
      .limit(1)
      .maybeSingle();

    if (existing) {
      await supabase
        .from("vip_users")
        .update({
          account,
        })
        .eq("id", existing.id);
    } else {
      await supabase.from("vip_users").insert({
        user_id: reqData.user_id,
        account,
        fragments: 0,
        total_recharge: 0,
      });
    }

    await supabase
      .from("vip_requests")
      .update({
        status: "approved",
      })
      .eq("id", reqData.id);

    await zhouheClient.pushMessage(reqData.user_id, {
      type: "text",
      text:
        "✅ 帳號審核通過\n\n3A帳號：" +
        account +
        "\n\n已開通碎片系統。\n可輸入「碎片查詢」查看目前碎片。",
    });

    return reply(
      replyToken,
      "✅ 審核通過\n\n3A帳號：" + account + "\n已加入會員碎片系統。"
    );
  }

  async function handleFragmentQuery(replyToken, userId) {
    const { data: vip, error } = await supabase
      .from("vip_users")
      .select("*")
      .eq("user_id", userId)
      .order("id", { ascending: false })
      .limit(1)
      .single();

    if (error || !vip) {
      return reply(
        replyToken,
        "尚未查詢到你的會員資料。\n\n請先輸入「綁定」提交3A帳號，並等待管理員審核。"
      );
    }

    const fragments = vip.fragments || 0;
    const need = Math.max(10 - fragments, 0);

    return reply(
      replyToken,
      "💎 碎片查詢\n\n" +
        "3A帳號：" +
        vip.account +
        "\n" +
        "目前碎片：" +
        fragments +
        " / 10\n" +
        "累積儲值：" +
        (vip.total_recharge || 0) +
        "\n\n" +
        (fragments >= 10
          ? "✅ 已可開啟寶箱一次"
          : "尚差 " + need + " 個碎片可開啟寶箱")
    );
  }

  async function handleAddFragments(replyToken, adminUserId, account, count) {
    const { data: vip, error } = await supabase
      .from("vip_users")
      .select("*")
      .eq("account", account)
      .order("id", { ascending: false })
      .limit(1)
      .single();

    if (error || !vip) {
      return reply(replyToken, "查無此3A帳號：" + account);
    }

    const newFragments = (vip.fragments || 0) + count;
    const addRecharge = count * 1000;
    const newRecharge = (vip.total_recharge || 0) + addRecharge;

    const { error: updateError } = await supabase
      .from("vip_users")
      .update({
        fragments: newFragments,
        total_recharge: newRecharge,
      })
      .eq("id", vip.id);

    if (updateError) {
      console.error("ADD FRAGMENTS ERROR:", updateError);
      return reply(replyToken, "加碎片失敗，請稍後再試。");
    }

    await supabase.from("zhouhe_fragment_logs").insert({
      line_user_id: vip.user_id,
      account_3a: account,
      amount: addRecharge,
      fragments_added: count,
      note: "管理員加碎片：" + adminUserId,
    });

    return reply(
      replyToken,
      "✅ 加碎片成功\n\n" +
        "3A帳號：" +
        account +
        "\n" +
        "新增碎片：" +
        count +
        "\n" +
        "目前碎片：" +
        newFragments +
        "\n" +
        "累積儲值：" +
        newRecharge
    );
  }

  app.get("/box", (req, res) => {
    res.send(renderBoxPage(LIFF_ID));
  });

  app.post("/api/zhouhe/open-box", express.json(), async (req, res) => {
    try {
      const { lineUserId } = req.body;

      if (!lineUserId) {
        return res.status(400).json({
          ok: false,
          message: "無法取得 LINE 身分，請重新開啟寶箱。",
        });
      }

      const isAdmin = ADMIN_UIDS.includes(lineUserId);
      const reward = pickReward();

      if (isAdmin) {
        return res.json({
          ok: true,
          reward,
          adminTest: true,
        });
      }

      const { data: vip, error } = await supabase
        .from("vip_users")
        .select("*")
        .eq("user_id", lineUserId)
        .order("id", { ascending: false })
        .limit(1)
        .single();

      if (error || !vip) {
        return res.json({
          ok: false,
          message: "尚未完成帳號審核，請先聯繫管理員。",
        });
      }

      const fragments = vip.fragments || 0;

      if (fragments < 10) {
        return res.json({
          ok: false,
          message: "碎片不足，目前碎片：" + fragments + " / 10",
        });
      }

      const newFragments = fragments - 10;

      const { error: updateError } = await supabase
        .from("vip_users")
        .update({
          fragments: newFragments,
        })
        .eq("id", vip.id);

      if (updateError) {
        console.error("BOX UPDATE FRAGMENTS ERROR:", updateError);
        return res.status(500).json({
          ok: false,
          message: "扣除碎片失敗，請稍後再試。",
        });
      }

      await supabase.from("zhouhe_fragment_logs").insert({
        line_user_id: lineUserId,
        account_3a: vip.account,
        amount: 0,
        fragments_added: -10,
        note: "開寶箱抽中：" + reward,
      });

      return res.json({
        ok: true,
        reward,
        fragmentsLeft: newFragments,
      });
    } catch (err) {
      console.error("ZHOUHE BOX ERROR:", err);
      return res.status(500).json({
        ok: false,
        message: "寶箱系統暫時異常，請稍後再試。",
      });
    }
  });
};

function pickReward() {
  const rewards = [
    ...Array(800).fill("AI權限 1 天"),
    ...Array(150).fill("88"),
    ...Array(30).fill("288"),
    ...Array(13).fill("588"),
    ...Array(5).fill("888"),
    ...Array(2).fill("3888"),
  ];

  return rewards[Math.floor(Math.random() * rewards.length)];
}

function renderBoxPage(liffId) {
  return `
<!DOCTYPE html>
<html lang="zh-Hant">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>會員碎片寶箱</title>
<script src="https://static.line-scdn.net/liff/edge/2/sdk.js"></script>

<style>
* { box-sizing: border-box; }

body {
  margin: 0;
  min-height: 100vh;
  background:
    radial-gradient(circle at top, rgba(255, 205, 80, 0.26), transparent 35%),
    linear-gradient(180deg, #050505, #160b24 60%, #050505);
  color: #fff;
  font-family: Arial, "Microsoft JhengHei", sans-serif;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 24px;
}

.card {
  width: 100%;
  max-width: 420px;
  text-align: center;
  border: 1px solid rgba(255, 215, 120, 0.35);
  border-radius: 24px;
  padding: 24px 20px 28px;
  background: rgba(10, 10, 18, 0.92);
  box-shadow: 0 0 35px rgba(255, 190, 70, 0.25);
}

.marquee-wrap {
  width: 100%;
  overflow: hidden;
  margin-bottom: 16px;
  border-radius: 14px;
  background: rgba(255,255,255,0.08);
  border: 1px solid rgba(255,215,120,0.25);
}

.marquee {
  white-space: nowrap;
  padding: 10px 0;
  color: #ffd15c;
  font-weight: bold;
  font-size: 14px;
  animation: marquee 38s linear infinite;
}

@keyframes marquee {
  0% { transform: translateX(100%); }
  100% { transform: translateX(-100%); }
}

h1 {
  font-size: 26px;
  margin: 0 0 12px;
}

.desc {
  color: #ddd;
  line-height: 1.7;
  font-size: 15px;
}

.prize {
  margin: 18px 0;
  padding: 14px;
  border-radius: 16px;
  background: linear-gradient(135deg, rgba(255, 205, 80, 0.2), rgba(255, 255, 255, 0.05));
  border: 1px solid rgba(255, 215, 120, 0.3);
}

.prize .top {
  color: #ffe29a;
  font-size: 15px;
}

.prize .money {
  font-size: 36px;
  font-weight: bold;
  color: #ffd15c;
  margin-top: 4px;
}

.chest {
  font-size: 100px;
  margin: 25px 0 18px;
  filter: drop-shadow(0 0 18px rgba(255, 205, 80, 0.8));
}

.shake { animation: shake 0.22s infinite; }
.opened { animation: pop 0.7s ease forwards; }

@keyframes shake {
  0% { transform: rotate(-5deg) scale(1); }
  50% { transform: rotate(5deg) scale(1.05); }
  100% { transform: rotate(-5deg) scale(1); }
}

@keyframes pop {
  0% { transform: scale(1); }
  50% { transform: scale(1.28); }
  100% { transform: scale(1); }
}

button {
  width: 100%;
  border: none;
  border-radius: 999px;
  padding: 15px 20px;
  font-size: 18px;
  font-weight: bold;
  color: #2b1600;
  background: linear-gradient(135deg, #ffe29a, #ffb52e);
  box-shadow: 0 0 22px rgba(255, 196, 70, 0.45);
  cursor: pointer;
}

button:disabled { opacity: 0.75; }

.result {
  display: none;
  margin-top: 22px;
  padding: 20px 14px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 215, 120, 0.28);
}

.result h2 {
  margin: 0 0 12px;
  color: #ffd15c;
}

.reward {
  font-size: 24px;
  font-weight: bold;
  margin: 14px 0;
  color: #fff1b8;
}

.notice {
  color: #ddd;
  line-height: 1.8;
  font-size: 15px;
}

.loading {
  color: #ddd;
  margin: 18px 0;
  font-size: 15px;
}

.error {
  color: #ff9f9f;
  margin-top: 14px;
  line-height: 1.6;
}
</style>
</head>

<body>
  <div class="card">
    <div class="marquee-wrap">
      <div class="marquee" id="marquee"></div>
    </div>

    <h1>🎁 會員碎片寶箱</h1>

    <div id="loading" class="loading">正在驗證 LINE 身分...</div>

    <div id="mainBox" style="display:none;">
      <div class="desc">
        儲值 1000 可獲得 1 個碎片<br>
        累積 10 個碎片可開啟一次寶箱
      </div>

      <div class="prize">
        <div class="top">🏆 最大獎</div>
        <div class="money">3888</div>
      </div>

      <div id="chest" class="chest">🎁</div>

      <button id="openBtn">立即開啟寶箱</button>

      <div id="result" class="result">
        <h2>🎉 恭喜抽中</h2>
        <div id="rewardText" class="reward">🔓 AI權限 1 天</div>
        <div class="notice">
          請截圖保存此畫面<br>
          並聯繫管理員領取
        </div>
      </div>
    </div>

    <div id="errorBox" class="error" style="display:none;"></div>
  </div>

<script>
let currentUserId = "";

const loading = document.getElementById("loading");
const mainBox = document.getElementById("mainBox");
const errorBox = document.getElementById("errorBox");
const btn = document.getElementById("openBtn");
const chest = document.getElementById("chest");
const result = document.getElementById("result");
const rewardText = document.getElementById("rewardText");

function setupMarquee() {
  const names = [
    "zhu","long","king","win","boss","ray","leo","jack","alex","tony",
    "mark","andy","kevin","tom","nick","john","max","jason","david","eric",
    "allen","steven","sam","lucas","mike","wayne","keith","ben","ryan","ethan",
    "logan","aaron","bruce","chris","daniel","frank","gary","henry","ivan","jerry",
    "ken","louis","mason","neo","oscar","peter","robin","scott","vincent","walker",
    "xavier","york","zack","hunter","rocco","ace","blade","storm","ghost","legend",
    "phoenix","dragon","tiger","wolf","joker","apollo","zeus","thor","titan","viper",
    "hawk","falcon","cobra","spartan","empire"
  ];

  const nums = [
    "66","77","88","99","168","518","668","888","999","1314",
    "520","521","886","887","9527","777","5678","8888","6666","9999",
    "111","222","333","444","555","123","321","789","258","1688",
    "8866","7788","8899","5566","952","16888","52016","77752",
    "88688","99916","66888","51888","2025","2026","7777","8886",
    "8889","6868","5858","5252","101","102","5200","1680","88888",
    "99999","13145"
  ];

  const prizes = [
    "AI權限 1 天","AI權限 1 天","AI權限 1 天","AI權限 1 天",
    "88","88","288","588","888","3888"
  ];

  function randomAccount() {
    const useNumberOnly = Math.random() < 0.25;

    if (useNumberOnly) {
      let account = "";
      const numberLength = Math.floor(Math.random() * 4) + 5;
      for (let i = 0; i < numberLength; i++) {
        account += Math.floor(Math.random() * 10);
      }
      return account + "*".repeat(Math.floor(Math.random() * 3) + 3);
    }

    const name = names[Math.floor(Math.random() * names.length)];
    const num = nums[Math.floor(Math.random() * nums.length)];
    return name + num + "*".repeat(Math.floor(Math.random() * 3) + 3);
  }

  const messages = [];

  for (let i = 0; i < 30; i++) {
    const account = randomAccount();
    const prize = prizes[Math.floor(Math.random() * prizes.length)];
    messages.push("🎉 恭喜 " + account + " 抽中 " + prize);
  }

  document.getElementById("marquee").innerText = messages.join("　　　");
}

async function init() {
  try {
    await liff.init({ liffId: "${liffId}" });

    if (!liff.isLoggedIn()) {
      liff.login();
      return;
    }

    const profile = await liff.getProfile();
    currentUserId = profile.userId;

    loading.style.display = "none";
    mainBox.style.display = "block";
  } catch (err) {
    console.error(err);
    loading.style.display = "none";
    errorBox.style.display = "block";
    errorBox.innerText = "LINE 身分驗證失敗，請從 LINE 內重新開啟寶箱。";
  }
}

async function openBox() {
  if (!currentUserId) {
    errorBox.style.display = "block";
    errorBox.innerText = "無法取得 LINE 身分，請重新開啟寶箱。";
    return;
  }

  btn.disabled = true;
  btn.innerText = "🎁 開寶箱中...";
  chest.classList.add("shake");
  errorBox.style.display = "none";

  try {
    const res = await fetch("/api/zhouhe/open-box", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lineUserId: currentUserId })
    });

    const data = await res.json();

    setTimeout(() => {
      chest.classList.remove("shake");

      if (!data.ok) {
        btn.disabled = false;
        btn.innerText = "立即開啟寶箱";
        errorBox.style.display = "block";
        errorBox.innerText = data.message || "寶箱系統異常，請稍後再試。";
        return;
      }

      rewardText.innerText = data.reward;
      chest.classList.add("opened");
      chest.innerText = "✨";
      btn.style.display = "none";
      result.style.display = "block";
    }, 2600);
  } catch (err) {
    console.error(err);
    chest.classList.remove("shake");
    btn.disabled = false;
    btn.innerText = "立即開啟寶箱";
    errorBox.style.display = "block";
    errorBox.innerText = "寶箱系統暫時異常，請稍後再試。";
  }
}

btn.addEventListener("click", openBox);
setupMarquee();
init();
</script>
</body>
</html>
`;
}
