require("dotenv").config();

const express = require("express");

const {
  line,
  config,
  client
} = require("./services/line");

const logger = require("./services/logger");

const app = express();

const PORT = process.env.PORT || 3000;
app.get("/", (req, res) => {

    res.json({
        success: true,
        project: "BLACKDOMAIN AI V3",
        status: "ONLINE",
        version: "3.0.0"
    });

});
app.post(

    "/webhook",

    line.middleware(config),

    async (req, res) => {

        try {

            const events = req.body.events;

            await Promise.all(

                events.map(handleEvent)

            );

            res.sendStatus(200);

        }

        catch (err) {

            logger.error(err);

            res.sendStatus(500);

        }

    }

);
app.listen(

    PORT,

    () => {

        logger.info(

            `BLACKDOMAIN AI 已啟動 ${PORT}`

        );

    }

);
async function handleEvent(event){

    if(event.type !== "message") return;

    if(event.message.type !== "text") return;

    const userId = event.source.userId;

    const text = event.message.text.trim();



}
// ===============================
// handleEvent()
// ===============================

async function handleEvent(event) {

    if (event.type !== "message") return;

    if (event.message.type !== "text") return;

    const userId = event.source.userId;
    const replyToken = event.replyToken;

    const text = event.message.text.trim();

    logger.info(`${userId} -> ${text}`);

    // ========= 首頁 =========

    if (
        text === "黑域AI" ||
        text === "首頁" ||
        text === "menu"
    ) {

        const flex = require("./ui/flex/flexMain");

        return client.replyMessage({
            replyToken,
            messages: [flex()]
        });

    }

    // ========= 百家樂 =========

    if (text === "百家樂") {

        const flex = require("./ui/flex/flexBaccarat");

        return client.replyMessage({
            replyToken,
            messages: [flex()]
        });

    }

    // ========= 電子 =========

    if (text === "電子") {

        const flex = require("./ui/flex/flexElectronic");

        return client.replyMessage({
            replyToken,
            messages: [flex()]
        });

    }

    // ========= 體育 =========

    if (text === "體育") {

        const flex = require("./ui/flex/flexSports");

        return client.replyMessage({
            replyToken,
            messages: [flex()]
        });

    }

    // ========= 539 =========

    if (text === "539") {

        const lotto = require("./modules/lotto539");

        return lotto(event);

    }

    // ========= VIP =========

    if (text === "VIP查詢") {

        const vip = require("./modules/vip");

        return vip(event);

    }

    // ========= DG =========

    if (text === "DG") {

        const baccarat = require("./modules/baccarat");

        return baccarat.startDG(event);

    }

    // ========= MT =========

    if (text === "MT") {

        const baccarat = require("./modules/baccarat");

        return baccarat.startMT(event);

    }

    // ========= 戰神賽特1 =========

    if (text === "戰神賽特1") {

        const electronic = require("./modules/electronic");

        return electronic.slot1(event);

    }

    // ========= 戰神賽特2 =========

    if (text === "戰神賽特2") {

        const electronic = require("./modules/electronic");

        return electronic.slot2(event);

    }

    // ========= 古神巴風特 =========

    if (text === "古神巴風特") {

        const electronic = require("./modules/electronic");

        return electronic.baphomet(event);

    }

    // ========= 世界盃 =========

    if (text === "世界盃") {

        const sports = require("./modules/sports");

        return sports.worldCup(event);

    }

    // ========= MLB =========

    if (text === "MLB") {

        const sports = require("./modules/sports");

        return sports.mlb(event);

    }

    // ========= NBA =========

    if (text === "NBA") {

        const sports = require("./modules/sports");

        return sports.nba(event);

    }

}
