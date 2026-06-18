const express = require("express");
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
      const rewardName = "AI權限 1 天";

      const { data: existing, error: selectError } = await supabase
        .from("zhouhe_box_claims")
        .select("*")
        .eq("line_user_id", lineUserId)
        .maybeSingle();

      if (selectError) {
        console.error("BOX SELECT ERROR:", selectError);
        return res.status(500).json({
          ok: false,
          message: "系統查詢異常，請稍後再試。",
        });
      }

      if (existing && !isAdmin) {
        return res.json({
          ok: true,
          alreadyClaimed: true,
          reward: existing.reward_name || rewardName,
        });
      }

      if (!isAdmin && !existing) {
        const { error: insertError } = await supabase
          .from("zhouhe_box_claims")
          .insert({
            line_user_id: lineUserId,
            reward_name: rewardName,
          });

        if (insertError) {
          console.error("BOX INSERT ERROR:", insertError);
          return res.status(500).json({
            ok: false,
            message: "獎勵發放異常，請稍後再試。",
          });
        }
      }

      return res.json({
        ok: true,
        alreadyClaimed: false,
        reward: rewardName,
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

function renderBoxPage(liffId) {
  return `
<!DOCTYPE html>
<html lang="zh-Hant">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>新會員限定寶箱</title>
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

.used {
  color: #ffcd6a;
  font-size: 22px;
  font-weight: bold;
  margin: 18px 0;
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

    <h1>🎁 新會員限定寶箱</h1>

    <div id="loading" class="loading">正在驗證 LINE 身分...</div>

    <div id="mainBox" style="display:none;">
      <div class="desc">
        歡迎加入<br>
        每位會員限領一次
      </div>

      <div class="prize">
        <div class="top">🏆 最大獎</div>
        <div class="money">888</div>
      </div>

      <div id="chest" class="chest">🎁</div>

      <button id="openBtn">立即開啟寶箱</button>

      <div id="result" class="result">
        <h2>🎉 恭喜獲得專屬獎勵</h2>
        <div class="reward">🔓 AI權限 1 天</div>
        <div class="notice">
          請截圖保存此畫面<br>
          並聯繫管理員開通 AI 權限
        </div>
      </div>
    </div>

    <div id="alreadyBox" style="display:none;">
      <div class="used">⚠️ 此寶箱已開啟過</div>
      <div class="notice">
        每位新會員限領一次<br>
        你已領取過專屬獎勵
      </div>
    </div>

    <div id="errorBox" class="error" style="display:none;"></div>
  </div>

<script>
let currentUserId = "";

const loading = document.getElementById("loading");
const mainBox = document.getElementById("mainBox");
const alreadyBox = document.getElementById("alreadyBox");
const errorBox = document.getElementById("errorBox");
const btn = document.getElementById("openBtn");
const chest = document.getElementById("chest");
const result = document.getElementById("result");

function setupMarquee() {
  const names = [
    "zhu","long","king","win","boss",
    "ray","leo","jack","alex","tony",
    "mark","andy","kevin","tom","nick",
    "john","max","jason","david","eric",
    "allen","steven","sam","lucas","mike",
    "wayne","keith","ben","ryan","ethan",
    "logan","aaron","bruce","chris","daniel",
    "frank","gary","henry","ivan","jerry",
    "ken","louis","mason","neo","oscar",
    "peter","robin","scott","vincent","walker",
    "xavier","york","zack","hunter","rocco",
    "ace","blade","storm","ghost","legend",
    "phoenix","dragon","tiger","wolf","joker",
    "apollo","zeus","thor","titan","viper",
    "hawk","falcon","cobra","spartan","empire"
  ];

  const nums = [
    "66","77","88","99",
    "168","518","668","888",
    "999","1314","520","521",
    "886","887","9527","777",
    "5678","8888","6666","9999",
    "111","222","333","444",
    "555","123","321","789",
    "258","1688","8866","7788",
    "8899","5566","952","16888",
    "52016","77752","88688",
    "99916","66888","51888",
    "2025","2026","7777","8886",
    "8889","6868","5858","5252",
    "101","102","5200","1680",
    "88888","99999","13145"
  ];

  const prizes = [
    188,188,188,188,188,188,188,188,188,188,
    388,388,388,388,388,
    588,588,588,
    888
  ];

  function randomAccount() {
    const useNumberOnly = Math.random() < 0.25;

    if (useNumberOnly) {
      const numberLength = Math.floor(Math.random() * 4) + 5;
      let account = "";

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

  const marquee = document.getElementById("marquee");
  if (marquee) {
    marquee.innerText = messages.join("　　　");
  }
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
        btn.innerText = "重新開啟寶箱";
        errorBox.style.display = "block";
        errorBox.innerText = data.message || "寶箱系統異常，請稍後再試。";
        return;
      }

      if (data.alreadyClaimed) {
        mainBox.style.display = "none";
        alreadyBox.style.display = "block";
        return;
      }

      chest.classList.add("opened");
      chest.innerText = "✨";
      btn.style.display = "none";
      result.style.display = "block";
    }, 2600);
  } catch (err) {
    console.error(err);
    chest.classList.remove("shake");
    btn.disabled = false;
    btn.innerText = "重新開啟寶箱";
    errorBox.style.display = "block";
    errorBox.innerText = "寶箱系統暫時異常，請稍後再試。";
  }
}

if (btn) {
  btn.addEventListener("click", openBox);
}

setupMarquee();
init();
</script>
</body>
</html>
`;
}
