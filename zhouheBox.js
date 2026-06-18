const express = require("express");
const line = require("@line/bot-sdk");
const { createClient } = require("@supabase/supabase-js");

module.exports = function (app) {
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY
  );

  const LIFF_ID = "2010438983-M6Y3y5Y0";
  const ADMIN_UIDS = ["U0ac5f4989e00ef3d8a9ab59dc00dca7d"];
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

    if (
      text === "幸運寶箱" ||
      text === "🎁幸運寶箱" ||
      text === "鑰匙" ||
      text === "🔑鑰匙" ||
      text === "鑰匙中心"
    ) {
      return sendKeyMenu(event.replyToken);
    }

    if (text === "管理員" || text === "管理員功能" || text === "後台") {
      if (!ADMIN_UIDS.includes(userId)) {
        return reply(event.replyToken, "你沒有管理員權限。");
      }
      return sendAdminMenu(event.replyToken);
    }

    if (text === "管理指令") {
      if (!ADMIN_UIDS.includes(userId)) {
        return reply(event.replyToken, "你沒有管理員權限。");
      }
      return reply(
        event.replyToken,
        "👑 管理員指令表\n\n" +
          "通過 3A帳號\n" +
          "加鑰匙 3A帳號 數量\n\n" +
          "機率查詢\n" +
          "機率 AI 100\n" +
          "機率 88 20\n" +
          "全關\n" +
          "開獎模式\n\n" +
          "會員入口：幸運寶箱"
      );
    }

    if (text === "綁定" || text === "綁定帳號" || text === "綁定3A帳號") {
      pendingBind[userId] = true;
      return reply(event.replyToken, "請輸入您的3A帳號\n\n範例：kerero777444");
    }

    if (pendingBind[userId]) {
      const blocked = [
        "鑰匙",
        "🔑鑰匙",
        "鑰匙中心",
        "幸運寶箱",
        "🎁幸運寶箱",
        "鑰匙查詢",
        "碎片",
        "碎片查詢",
        "獎勵說明",
        "綁定",
        "綁定帳號",
        "綁定3A帳號",
        "管理員",
        "管理員功能",
        "後台",
        "管理指令",
      ];

      if (blocked.includes(text)) {
        delete pendingBind[userId];

        return reply(
          event.replyToken,
          "已取消綁定流程。\n\n如需綁定3A帳號，請重新點選「綁定3A帳號」，並直接輸入您的3A帳號。"
        );
      }

      delete pendingBind[userId];
      return createVipRequest(event.replyToken, userId, text);
    }

    if (text === "鑰匙查詢" || text === "碎片查詢") {
      return handleKeyQuery(event.replyToken, userId);
    }

    if (text === "獎勵說明") {
      return reply(
        event.replyToken,
        "🎁 幸運寶箱獎勵\n\n" +
          "🔓 AI權限1天\n" +
          "🎁 88\n" +
          "🎁 288\n" +
          "🎁 588\n" +
          "🎁 888\n" +
          "🏆 3888\n\n" +
          "儲值1000 = 1把🔑鑰匙\n" +
          "累積2把🔑鑰匙即可開啟一次寶箱"
      );
    }

    if (text === "機率查詢") {
      if (!ADMIN_UIDS.includes(userId)) return reply(event.replyToken, "你沒有管理員權限。");
      return handleRateQuery(event.replyToken);
    }

    if (text.startsWith("機率 ")) {
      if (!ADMIN_UIDS.includes(userId)) return reply(event.replyToken, "你沒有管理員權限。");

      const parts = text.split(/\s+/);
      const key = parts[1];
      const value = Number(parts[2]);

      if (!key || isNaN(value)) {
        return reply(event.replyToken, "格式錯誤\n例如：機率 AI 100\n例如：機率 88 20");
      }

      return handleRateUpdate(event.replyToken, key, value);
    }

    if (text === "全關") {
      if (!ADMIN_UIDS.includes(userId)) return reply(event.replyToken, "你沒有管理員權限。");
      return handleCloseAllReward(event.replyToken);
    }

    if (text === "開獎模式") {
      if (!ADMIN_UIDS.includes(userId)) return reply(event.replyToken, "你沒有管理員權限。");
      return handleOpenRewardMode(event.replyToken);
    }

    if (text.startsWith("通過 ")) {
      if (!ADMIN_UIDS.includes(userId)) return reply(event.replyToken, "你沒有管理員權限。");

      const account = text.split(/\s+/)[1];
      if (!account) return reply(event.replyToken, "格式錯誤\n請輸入：通過 3A帳號");

      return approveAccount(event.replyToken, account);
    }

    if (text.startsWith("加鑰匙 ") || text.startsWith("加碎片 ")) {
      if (!ADMIN_UIDS.includes(userId)) return reply(event.replyToken, "你沒有管理員權限。");

      const parts = text.split(/\s+/);
      const account = parts[1];
      const count = Number(parts[2]);

      if (!account || !count || count <= 0) {
        return reply(
          event.replyToken,
          "格式錯誤\n請輸入：加鑰匙 3A帳號 數量\n例如：加鑰匙 kerero777444 5"
        );
      }

      return handleAddKeys(event.replyToken, userId, account, count);
    }
  }

  function reply(replyToken, text) {
    return zhouheClient.replyMessage(replyToken, { type: "text", text });
  }

  function sendKeyMenu(replyToken) {
    return zhouheClient.replyMessage(replyToken, {
      type: "template",
      altText: "🎁幸運寶箱",
      template: {
        type: "buttons",
        title: "🎁 幸運寶箱",
        text: "儲值1000可獲得1把🔑鑰匙，累積2把即可開啟一次寶箱",
        actions: [
          { type: "message", label: "🔗 綁定3A帳號", text: "綁定" },
          { type: "message", label: "🔑 鑰匙查詢", text: "鑰匙查詢" },
          { type: "uri", label: "🎁 開啟寶箱", uri: "https://liff.line.me/2010438983-M6Y3y5Y0" },
          { type: "message", label: "📜 獎勵說明", text: "獎勵說明" },
        ],
      },
    });
  }

  function sendAdminMenu(replyToken) {
    return zhouheClient.replyMessage(replyToken, {
      type: "template",
      altText: "管理員功能表",
      template: {
        type: "buttons",
        title: "👑 管理員功能表",
        text: "請選擇常用管理功能",
        actions: [
          { type: "message", label: "📋 管理指令", text: "管理指令" },
          { type: "message", label: "🎯 機率查詢", text: "機率查詢" },
          { type: "message", label: "🔒 全關模式", text: "全關" },
          { type: "message", label: "🎁 開獎模式", text: "開獎模式" },
        ],
      },
    });
  }

  async function createVipRequest(replyToken, userId, account) {
    account = String(account || "").trim();

    const blockedWords = [
      "請輸入",
      "範例",
      "綁定",
      "鑰匙",
      "查詢",
      "獎勵",
      "幸運寶箱",
      "通過",
      "加鑰匙",
      "管理員",
      "後台",
      "機率",
    ];

    if (blockedWords.some(word => account.includes(word))) {
      pendingBind[userId] = true;
      return reply(replyToken, "格式不正確，請只輸入您的3A帳號。\n\n範例：kerero777444");
    }

    if (account.includes("\n") || account.includes(" ")) {
      pendingBind[userId] = true;
      return reply(replyToken, "帳號不能包含空格或換行。\n\n請重新輸入您的3A帳號。");
    }

    if (account.length < 4 || account.length > 24) {
      pendingBind[userId] = true;
      return reply(replyToken, "帳號長度不正確。\n\n請重新輸入您的3A帳號。");
    }

    if (!/^[a-zA-Z0-9_]+$/.test(account)) {
      pendingBind[userId] = true;
      return reply(replyToken, "帳號格式不正確。\n\n請只輸入英文、數字或底線。");
    }

    const { data: alreadyBind } = await supabase
      .from("vip_users")
      .select("*")
      .eq("user_id", userId)
      .limit(1)
      .maybeSingle();

    if (alreadyBind) {
      return reply(
        replyToken,
        "✅ 你已完成綁定\n\n目前帳號：" +
          alreadyBind.account +
          "\n\n如需更換帳號請聯繫管理員。"
      );
    }

    const { data: sameAccount } = await supabase
      .from("vip_users")
      .select("*")
      .eq("account", account)
      .limit(1)
      .maybeSingle();

    if (sameAccount) {
      return reply(replyToken, "此3A帳號已綁定其他LINE帳號。\n\n如有問題請聯繫管理員。");
    }

    const { data: pendingRequest } = await supabase
      .from("vip_requests")
      .select("*")
      .eq("account", account)
      .eq("status", "pending")
      .limit(1)
      .maybeSingle();

    if (pendingRequest) {
      return reply(replyToken, "此帳號已在審核中。\n\n請等待管理員審核。");
    }

    const { error } = await supabase.from("vip_requests").insert({
      user_id: userId,
      account,
      status: "pending",
    });

    if (error) {
      console.error("VIP REQUEST ERROR:", error);
      return reply(replyToken, "送出失敗，請稍後再試或聯繫管理員。");
    }

    for (const adminId of ADMIN_UIDS) {
      await zhouheClient.pushMessage(adminId, {
        type: "text",
        text:
          "🆕 新會員綁定申請\n\n" +
          "3A帳號：" + account + "\n" +
          "LINE UID：" + userId + "\n\n" +
          "管理員輸入：\n通過 " + account,
      });
    }

    return reply(replyToken, "✅ 申請已送出\n\n3A帳號：" + account + "\n狀態：等待管理員審核");
  }

  async function approveAccount(replyToken, account) {
    const { data: reqData, error } = await supabase
      .from("vip_requests")
      .select("*")
      .eq("account", account)
      .order("id", { ascending: false })
      .limit(1)
      .single();

    if (error || !reqData) return reply(replyToken, "查無待審核帳號：" + account);

    const { data: existing } = await supabase
      .from("vip_users")
      .select("*")
      .eq("user_id", reqData.user_id)
      .limit(1)
      .maybeSingle();

    if (existing) {
      await supabase.from("vip_users").update({ account }).eq("id", existing.id);
    } else {
      await supabase.from("vip_users").insert({
        user_id: reqData.user_id,
        account,
        fragments: 0,
        total_recharge: 0,
      });
    }

    await supabase.from("vip_requests").update({ status: "approved" }).eq("id", reqData.id);

    await zhouheClient.pushMessage(reqData.user_id, {
      type: "text",
      text:
        "✅ 帳號審核通過\n\n" +
        "3A帳號：" + account + "\n\n" +
        "已開通🔑鑰匙系統\n" +
        "可至【🎁幸運寶箱】查看目前鑰匙數量",
    });

    return reply(replyToken, "✅ 審核通過\n\n3A帳號：" + account + "\n已加入🔑鑰匙系統");
  }

  async function handleKeyQuery(replyToken, userId) {
    const { data: vip, error } = await supabase
      .from("vip_users")
      .select("*")
      .eq("user_id", userId)
      .order("id", { ascending: false })
      .limit(1)
      .single();

    if (error || !vip) {
      return reply(replyToken, "尚未查詢到你的會員資料。\n\n請先至【🎁幸運寶箱】選擇綁定3A帳號，並等待管理員審核。");
    }

    const keys = vip.fragments || 0;
    const canOpen = Math.floor(keys / 2);
    const need = keys >= 2 ? 0 : 2 - keys;

    return reply(
      replyToken,
      "🔑 鑰匙查詢\n\n" +
        "3A帳號：" + vip.account + "\n" +
        "目前鑰匙：" + keys + " 把\n" +
        "累積儲值：" + (vip.total_recharge || 0) + "\n\n" +
        (keys >= 2
          ? "🎁 可開啟寶箱：" + canOpen + " 次"
          : "尚差 " + need + " 把🔑鑰匙可開啟寶箱")
    );
  }

  async function handleAddKeys(replyToken, adminUserId, account, count) {
    const { data: vip, error } = await supabase
      .from("vip_users")
      .select("*")
      .eq("account", account)
      .order("id", { ascending: false })
      .limit(1)
      .single();

    if (error || !vip) return reply(replyToken, "查無此3A帳號：" + account);

    const newKeys = (vip.fragments || 0) + count;
    const addRecharge = count * 1000;
    const newRecharge = (vip.total_recharge || 0) + addRecharge;
    const canOpen = Math.floor(newKeys / 2);

    const { error: updateError } = await supabase
      .from("vip_users")
      .update({ fragments: newKeys, total_recharge: newRecharge })
      .eq("id", vip.id);

    if (updateError) return reply(replyToken, "加鑰匙失敗，請稍後再試。");

    await supabase.from("zhouhe_fragment_logs").insert({
      line_user_id: vip.user_id,
      account_3a: account,
      amount: addRecharge,
      fragments_added: count,
      note: "管理員加鑰匙：" + adminUserId,
    });

    await zhouheClient.pushMessage(vip.user_id, {
      type: "text",
      text:
        "🔑 鑰匙已增加\n\n" +
        "3A帳號：" + account + "\n" +
        "新增鑰匙：" + count + " 把\n" +
        "目前鑰匙：" + newKeys + " 把\n" +
        "🎁 可開啟寶箱：" + canOpen + " 次",
    });

    return reply(
      replyToken,
      "✅ 加鑰匙成功\n\n" +
        "3A帳號：" + account + "\n" +
        "新增鑰匙：" + count + " 把\n" +
        "目前鑰匙：" + newKeys + " 把\n" +
        "累積儲值：" + newRecharge + "\n" +
        "🎁 可開啟寶箱：" + canOpen + " 次"
    );
  }

  async function handleRateQuery(replyToken) {
    const { data, error } = await supabase
      .from("zhouhe_box_settings")
      .select("key,value");

    if (error || !data) return reply(replyToken, "查詢機率失敗。");

    const map = {};
    data.forEach(row => {
      map[row.key] = row.value;
    });

    return reply(
      replyToken,
      "🎁 目前寶箱機率\n\n" +
        "🔓 AI權限1天：" + (map.AI || 0) + "%\n" +
        "🎁 88：" + (map["88"] || 0) + "%\n" +
        "🎁 288：" + (map["288"] || 0) + "%\n" +
        "🎁 588：" + (map["588"] || 0) + "%\n" +
        "🎁 888：" + (map["888"] || 0) + "%\n" +
        "🏆 3888：" + (map["3888"] || 0) + "%"
    );
  }

  async function handleRateUpdate(replyToken, key, value) {
    const allowKeys = ["AI", "88", "288", "588", "888", "3888"];

    if (!allowKeys.includes(key)) {
      return reply(replyToken, "獎項錯誤，只能輸入：AI、88、288、588、888、3888");
    }

    const { error } = await supabase
      .from("zhouhe_box_settings")
      .upsert({ key, value: String(value) });

    if (error) return reply(replyToken, "更新機率失敗。");

    return reply(replyToken, "✅ 機率已更新\n\n" + key + "：" + value + "%");
  }

  async function handleCloseAllReward(replyToken) {
    const rows = [
      { key: "AI", value: "100" },
      { key: "88", value: "0" },
      { key: "288", value: "0" },
      { key: "588", value: "0" },
      { key: "888", value: "0" },
      { key: "3888", value: "0" },
    ];

    await supabase.from("zhouhe_box_settings").upsert(rows);

    return reply(replyToken, "✅ 已切換全關模式\n\n目前只會抽中：AI權限1天");
  }

  async function handleOpenRewardMode(replyToken) {
    const rows = [
      { key: "AI", value: "45" },
      { key: "88", value: "38" },
      { key: "288", value: "12" },
      { key: "588", value: "3" },
      { key: "888", value: "1.5" },
      { key: "3888", value: "0.5" },
    ];

    await supabase.from("zhouhe_box_settings").upsert(rows);

    return reply(
      replyToken,
      "✅ 已切換開獎模式\n\n" +
        "AI權限1天：45%\n" +
        "88：38%\n" +
        "288：12%\n" +
        "588：3%\n" +
        "888：1.5%\n" +
        "3888：0.5%"
    );
  }

  app.get("/box", (req, res) => {
    res.send(renderBoxPage(LIFF_ID));
  });

  app.get("/api/zhouhe/marquee", async (req, res) => {
  try {
    const { data } = await supabase
      .from("zhouhe_box_logs")
      .select("account_3a,reward")
      .order("created_at", { ascending: false })
      .limit(50);

    const realLogs = data || [];

    const systemAccounts = [
      "zhu88***",
      "long66***",
      "king52***",
      "win88***",
      "boss77***",
      "abc168***",
      "ray520***",
      "alex88***",
      "tony77***",
      "mark168***",
      "dragon88***",
      "tiger66***",
      "vip168***",
      "super88***",
      "kaiser77***",
      "moon520***",
      "rich168***",
      "luck88***",
      "star777***",
      "neo168***",
      "max888***",
      "ken777***",
      "sam168***",
      "ace520***",
      "hero88***",
      "zero777***",
      "gold168***",
      "black88***",
      "top520***",
      "joker77***"
    ];

    const systemRewards = [
      "AI權限 1 天",
      "AI權限 1 天",
      "AI權限 1 天",
      "AI權限 1 天",
      "AI權限 1 天",
      "88",
      "88",
      "88",
      "88",
      "88",
      "288",
      "288",
      "588",
      "888"
    ];

    const systemLogs = [];

    for (let i = 0; i < 40; i++) {
      const account =
        systemAccounts[Math.floor(Math.random() * systemAccounts.length)];

      const reward =
        systemRewards[Math.floor(Math.random() * systemRewards.length)];

      systemLogs.push({
        account_3a: account,
        reward,
      });
    }

    const mixedLogs = [...realLogs, ...systemLogs];

    for (let i = mixedLogs.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [mixedLogs[i], mixedLogs[j]] = [mixedLogs[j], mixedLogs[i]];
    }

    return res.json({
      ok: true,
      logs: mixedLogs.slice(0, 30),
    });
  } catch (err) {
    console.error("MARQUEE ERROR:", err);
    return res.json({ ok: false, logs: [] });
  }
});

  app.post("/api/zhouhe/open-box", express.json(), async (req, res) => {
    try {
      const { lineUserId } = req.body;
      if (!lineUserId) {
        return res.status(400).json({ ok: false, message: "無法取得 LINE 身分，請重新開啟寶箱。" });
      }

      const isAdmin = ADMIN_UIDS.includes(lineUserId);
      const reward = await pickReward(supabase);

      if (isAdmin) {
        return res.json({
          ok: true,
          reward,
          adminTest: true,
          keysLeft: "管理員測試",
          canOpenLeft: "管理員測試",
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
        return res.json({ ok: false, message: "尚未完成帳號審核，請先聯繫管理員。" });
      }

      const keys = vip.fragments || 0;
      if (keys < 2) {
        return res.json({ ok: false, message: "鑰匙不足，目前鑰匙：" + keys + " / 2" });
      }

      const newKeys = keys - 2;
      const canOpenLeft = Math.floor(newKeys / 2);

      const { error: updateError } = await supabase
        .from("vip_users")
        .update({ fragments: newKeys })
        .eq("id", vip.id);

      if (updateError) {
        return res.status(500).json({ ok: false, message: "扣除鑰匙失敗，請稍後再試。" });
      }

      await supabase.from("zhouhe_fragment_logs").insert({
        line_user_id: lineUserId,
        account_3a: vip.account,
        amount: 0,
        fragments_added: -2,
        note: "開寶箱抽中：" + reward,
      });

      await supabase.from("zhouhe_box_logs").insert({
        line_user_id: lineUserId,
        account_3a: vip.account,
        reward,
      });

      for (const adminId of ADMIN_UIDS) {
        await zhouheClient.pushMessage(adminId, {
          type: "text",
          text:
            "🎁 寶箱中獎通知\n\n" +
            "3A帳號：" + vip.account + "\n" +
            "抽中獎勵：" + reward + "\n" +
            "剩餘🔑鑰匙：" + newKeys + " 把\n" +
            "可開啟寶箱：" + canOpenLeft + " 次",
        });
      }

      return res.json({ ok: true, reward, keysLeft: newKeys, canOpenLeft });
    } catch (err) {
      console.error("ZHOUHE BOX ERROR:", err);
      return res.status(500).json({ ok: false, message: "寶箱系統暫時異常，請稍後再試。" });
    }
  });
};

async function pickReward(supabase) {
  const { data, error } = await supabase
    .from("zhouhe_box_settings")
    .select("key,value");

  if (error || !data || data.length === 0) {
    return "AI權限 1 天";
  }

  const map = {};
  data.forEach(row => {
    map[row.key] = Number(row.value);
  });

  const rand = Math.random() * 100;
  let current = 0;

  const rewards = [
    ["AI", "AI權限 1 天"],
    ["88", "88"],
    ["288", "288"],
    ["588", "588"],
    ["888", "888"],
    ["3888", "3888"],
  ];

  for (const [key, reward] of rewards) {
    current += map[key] || 0;
    if (rand < current) return reward;
  }

  return "AI權限 1 天";
}

function renderBoxPage(liffId) {
  return `
<!DOCTYPE html>
<html lang="zh-Hant">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>幸運寶箱</title>
<script src="https://static.line-scdn.net/liff/edge/2/sdk.js"></script>
<style>
*{box-sizing:border-box}
body{margin:0;min-height:100vh;background:radial-gradient(circle at top,rgba(255,205,80,.26),transparent 35%),linear-gradient(180deg,#050505,#160b24 60%,#050505);color:#fff;font-family:Arial,"Microsoft JhengHei",sans-serif;display:flex;justify-content:center;align-items:center;padding:24px}
.card{width:100%;max-width:420px;text-align:center;border:1px solid rgba(255,215,120,.35);border-radius:24px;padding:24px 20px 28px;background:rgba(10,10,18,.92);box-shadow:0 0 35px rgba(255,190,70,.25)}
.marquee-wrap{width:100%;overflow:hidden;margin-bottom:16px;border-radius:14px;background:rgba(255,255,255,.08);border:1px solid rgba(255,215,120,.25)}
.marquee{white-space:nowrap;padding:10px 0;color:#ffd15c;font-weight:bold;font-size:14px;animation:marquee 45s linear infinite}
@keyframes marquee{0%{transform:translateX(100%)}100%{transform:translateX(-100%)}}
h1{font-size:28px;margin:0 0 12px}
.desc{color:#ddd;line-height:1.7;font-size:15px}
.prize{margin:18px 0;padding:14px;border-radius:16px;background:linear-gradient(135deg,rgba(255,205,80,.2),rgba(255,255,255,.05));border:1px solid rgba(255,215,120,.3)}
.prize .top{color:#ffe29a;font-size:15px}
.prize .money{font-size:38px;font-weight:bold;color:#ffd15c;margin-top:4px}
.chest{font-size:100px;margin:25px 0 18px;filter:drop-shadow(0 0 18px rgba(255,205,80,.8))}
.shake{animation:shake .22s infinite}.opened{animation:pop .7s ease forwards}
@keyframes shake{0%{transform:rotate(-5deg) scale(1)}50%{transform:rotate(5deg) scale(1.05)}100%{transform:rotate(-5deg) scale(1)}}
@keyframes pop{0%{transform:scale(1)}50%{transform:scale(1.28)}100%{transform:scale(1)}}
button{width:100%;border:none;border-radius:999px;padding:15px 20px;font-size:18px;font-weight:bold;color:#2b1600;background:linear-gradient(135deg,#ffe29a,#ffb52e);box-shadow:0 0 22px rgba(255,196,70,.45);cursor:pointer;margin-top:10px}
button:disabled{opacity:.75}
.result{display:none;margin-top:22px;padding:20px 14px;border-radius:18px;background:rgba(255,255,255,.08);border:1px solid rgba(255,215,120,.28)}
.result h2{margin:0 0 12px;color:#ffd15c}.reward{font-size:26px;font-weight:bold;margin:14px 0;color:#fff1b8}
.notice{color:#ddd;line-height:1.8;font-size:15px}.loading{color:#ddd;margin:18px 0;font-size:15px}.error{color:#ff9f9f;margin-top:14px;line-height:1.6}
</style>
</head>
<body>
<div class="card">
  <div class="marquee-wrap"><div class="marquee" id="marquee">載入中...</div></div>
  <h1>🎁 幸運寶箱</h1>
  <div id="loading" class="loading">正在驗證 LINE 身分...</div>

  <div id="mainBox" style="display:none;">
    <div class="desc">儲值1000可獲得1把🔑鑰匙<br>累積2把🔑鑰匙可開啟一次寶箱</div>
    <div class="prize"><div class="top">🏆 最大獎</div><div class="money">3888</div></div>
    <div id="chest" class="chest">🎁</div>
    <button id="openBtn">立即開啟寶箱</button>

    <div id="result" class="result">
      <h2>🎉 恭喜抽中</h2>
      <div id="rewardText" class="reward">🔓 AI權限 1 天</div>
      <div id="leftText" class="notice"></div>
      <button id="againBtn">🔄 繼續開寶箱</button>
      <div class="notice">請截圖保存此畫面<br>並聯繫管理員領取</div>
    </div>
  </div>

  <div id="errorBox" class="error" style="display:none;"></div>
</div>

<script>
let currentUserId="";
const loading=document.getElementById("loading");
const mainBox=document.getElementById("mainBox");
const errorBox=document.getElementById("errorBox");
const btn=document.getElementById("openBtn");
const againBtn=document.getElementById("againBtn");
const chest=document.getElementById("chest");
const result=document.getElementById("result");
const rewardText=document.getElementById("rewardText");
const leftText=document.getElementById("leftText");

function maskAccount(account){
  if(!account) return "member***";
  account=String(account);
  if(account.length<=3) return account+"***";
  return account.slice(0, Math.min(5, account.length-1))+"***";
}

function fallbackMarquee(){
  const names=["zhu88","long66","king52","win88","boss77","abc168","ray520","alex88","tony77","mark168","dragon88","tiger66"];
  const prizes=["AI權限 1 天","88","88","88","288","588","888","3888"];
  const msg=[];
  for(let i=0;i<20;i++){
    const a=names[Math.floor(Math.random()*names.length)]+"***";
    const p=prizes[Math.floor(Math.random()*prizes.length)];
    msg.push("🎉 恭喜 "+a+" 抽中 "+p);
  }
  document.getElementById("marquee").innerText=msg.join("　　　");
}

async function setupMarquee(){
  try{
    const res=await fetch("/api/zhouhe/marquee");
    const data=await res.json();
    if(!data.ok || !data.logs || data.logs.length===0){
      fallbackMarquee();
      return;
    }
   let messages = data.logs.map(
  x => "🎉 恭喜 " + maskAccount(x.account_3a) + " 抽中 " + x.reward
);

messages = [...messages, ...messages, ...messages, ...messages];

document.getElementById("marquee").innerText = messages.join("　　　");
  }catch(e){
    fallbackMarquee();
  }
}

async function init(){
  try{
    await liff.init({liffId:"${liffId}"});
    if(!liff.isLoggedIn()){liff.login();return}
    const profile=await liff.getProfile();
    currentUserId=profile.userId;
    loading.style.display="none";
    mainBox.style.display="block";
  }catch(err){
    loading.style.display="none";
    errorBox.style.display="block";
    errorBox.innerText="LINE 身分驗證失敗，請從 LINE 內重新開啟寶箱。";
  }
}

function resetBox(){
  result.style.display="none";
  btn.style.display="block";
  btn.disabled=false;
  btn.innerText="立即開啟寶箱";
  chest.innerText="🎁";
  chest.classList.remove("opened");
  chest.classList.remove("shake");
  errorBox.style.display="none";
}

async function openBox(){
  btn.disabled=true;
  btn.innerText="🎁 開寶箱中...";
  chest.classList.add("shake");
  errorBox.style.display="none";

  try{
    const res=await fetch("/api/zhouhe/open-box",{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({lineUserId:currentUserId})
    });

    const data=await res.json();

    setTimeout(async ()=>{
      chest.classList.remove("shake");

      if(!data.ok){
        btn.disabled=false;
        btn.innerText="立即開啟寶箱";
        errorBox.style.display="block";
        errorBox.innerText=data.message || "寶箱系統異常，請稍後再試。";
        return;
      }

      rewardText.innerText=data.reward;
      leftText.innerText="剩餘🔑鑰匙：" + data.keysLeft + " 把，可再開 " + data.canOpenLeft + " 次";

      chest.classList.add("opened");
      chest.innerText="✨";
      btn.style.display="none";
      result.style.display="block";

      if(Number(data.canOpenLeft) <= 0){
        againBtn.style.display="none";
      }else{
        againBtn.style.display="block";
      }

      await setupMarquee();
    },2600);
  }catch(err){
    chest.classList.remove("shake");
    btn.disabled=false;
    btn.innerText="立即開啟寶箱";
    errorBox.style.display="block";
    errorBox.innerText="寶箱系統暫時異常，請稍後再試。";
  }
}

btn.addEventListener("click",openBox);
againBtn.addEventListener("click",()=>{resetBox();openBox();});
setupMarquee();
init();
</script>
</body>
</html>
`;
}
