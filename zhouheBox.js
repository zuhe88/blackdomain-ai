const axios = require("axios");
const { createClient } = require("@supabase/supabase-js");

module.exports = function (app) {
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY
  );

  const LOGIN_CHANNEL_ID = process.env.ZHOUHE_LOGIN_CHANNEL_ID;
  const LOGIN_CHANNEL_SECRET = process.env.ZHOUHE_LOGIN_CHANNEL_SECRET;

  function getBaseUrl(req) {
    return "https://" + req.get("host");
  }

  app.get("/box", (req, res) => {
    const redirectUri = `${getBaseUrl(req)}/box/callback`;
    const state = "zhouhe_box_" + Date.now();

    const loginUrl =
      "https://access.line.me/oauth2/v2.1/authorize?" +
      new URLSearchParams({
        response_type: "code",
        client_id: LOGIN_CHANNEL_ID,
        redirect_uri: redirectUri,
        state,
        scope: "profile openid",
      }).toString();

    res.redirect(loginUrl);
  });

  app.get("/box/callback", async (req, res) => {
    try {
      const code = req.query.code;
      if (!code) return res.send("登入失敗，請重新開啟寶箱。");

      const redirectUri = `${getBaseUrl(req)}/box/callback`;

      const tokenRes = await axios.post(
        "https://api.line.me/oauth2/v2.1/token",
        new URLSearchParams({
          grant_type: "authorization_code",
          code,
          redirect_uri: redirectUri,
          client_id: LOGIN_CHANNEL_ID,
          client_secret: LOGIN_CHANNEL_SECRET,
        }).toString(),
        {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
        }
      );

      const accessToken = tokenRes.data.access_token;

      const profileRes = await axios.get("https://api.line.me/v2/profile", {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      const lineUserId = profileRes.data.userId;

      const { data: existing } = await supabase
        .from("zhouhe_box_claims")
        .select("*")
        .eq("line_user_id", lineUserId)
        .maybeSingle();

      let alreadyClaimed = false;

      if (existing) {
        alreadyClaimed = true;
      } else {
        await supabase.from("zhouhe_box_claims").insert({
          line_user_id: lineUserId,
          reward_name: "黑域AI體驗權限 1 天",
        });
      }

      res.send(renderBoxPage(alreadyClaimed));
    } catch (err) {
      console.error("ZHOUHE BOX ERROR:", err.response?.data || err.message);
      res.send("寶箱系統暫時異常，請稍後再試。");
    }
  });
};

function renderBoxPage(alreadyClaimed) {
  return `
<!DOCTYPE html>
<html lang="zh-Hant">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>3A周賀新會員寶箱</title>
<style>
* {
  box-sizing: border-box;
}

body {
  margin: 0;
  min-height: 100vh;
  background:
    radial-gradient(circle at top, rgba(255, 205, 80, 0.25), transparent 35%),
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
  padding: 28px 22px;
  background: rgba(10, 10, 18, 0.88);
  box-shadow: 0 0 35px rgba(255, 190, 70, 0.25);
}

.brand {
  font-size: 15px;
  color: #d8b76a;
  letter-spacing: 2px;
  margin-bottom: 10px;
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
  font-size: 32px;
  font-weight: bold;
  color: #ffd15c;
  margin-top: 4px;
}

.chest {
  font-size: 100px;
  margin: 25px 0 18px;
  filter: drop-shadow(0 0 18px rgba(255, 205, 80, 0.8));
}

.shake {
  animation: shake 0.22s infinite;
}

.opened {
  animation: pop 0.7s ease forwards;
}

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
  font-size: 22px;
  font-weight: bold;
  margin: 14px 0;
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
</style>
</head>
<body>
  <div class="card">
    <div class="brand">3A 周賀官方 LINE</div>
    <h1>🎁 新會員限定寶箱</h1>

    ${
      alreadyClaimed
        ? `
          <div class="used">⚠️ 此寶箱已開啟過</div>
          <div class="notice">
            每位新會員限領一次<br>
            你已領取過專屬獎勵
          </div>
        `
        : `
          <div class="desc">
            歡迎加入 3A周賀<br>
            每位會員限領一次
          </div>

          <div class="prize">
            <div class="top">🏆 最大獎</div>
            <div class="money">888體驗金</div>
          </div>

          <div id="chest" class="chest">🎁</div>

          <button id="openBtn">立即開啟寶箱</button>

          <div id="result" class="result">
            <h2>🎉 恭喜獲得專屬獎勵</h2>
            <div class="reward">🔓 黑域AI體驗權限 1 天</div>
            <div class="notice">
              請保存此畫面<br>
              並聯繫管理員開通體驗權限
            </div>
          </div>
        `
    }
  </div>

<script>
const btn = document.getElementById("openBtn");
const chest = document.getElementById("chest");
const result = document.getElementById("result");

if (btn) {
  btn.addEventListener("click", () => {
    btn.disabled = true;
    btn.innerText = "黑域AI驗證中...";
    chest.classList.add("shake");

    setTimeout(() => {
      chest.classList.remove("shake");
      chest.classList.add("opened");
      chest.innerText = "✨";
      btn.style.display = "none";
      result.style.display = "block";
    }, 2600);
  });
}
</script>
</body>
</html>
`;
}
