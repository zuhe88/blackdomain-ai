const { client } = require("../../services/line");

const userSessions = new Map();

/*
session

mode

DG
MT

本金

模式

AI
天門
自由

紀錄
*/

function startDG(event) {

    const userId = event.source.userId;

    userSessions.set(userId, {

        platform: "DG",

        step: "capital"

    });

    return client.replyMessage({

        replyToken: event.replyToken,

        messages: [

            {

                type: "text",

                text:
`🤖 DG 真人百家樂

請輸入本金

例如：

3000`

            }

        ]

    });

}

function startMT(event) {

    const userId = event.source.userId;

    userSessions.set(userId, {

        platform: "MT",

        step: "capital"

    });

    return client.replyMessage({

        replyToken: event.replyToken,

        messages: [

            {

                type: "text",

                text:
`🤖 MT 真人百家樂

請輸入本金

例如：

3000`

            }

        ]

    });

}

async function handle(event){

    const userId = event.source.userId;

    const text = event.message.text.trim();

    if(!userSessions.has(userId)){

        return false;

    }

    const session = userSessions.get(userId);

    /*
    STEP 1
    本金
    */

    if(session.step==="capital"){

        const money=parseInt(text);

        if(isNaN(money)){

            return client.replyMessage({

                replyToken:event.replyToken,

                messages:[

                    {

                        type:"text",

                        text:"請輸入正確本金"

                    }

                ]

            });

        }

        session.capital=money;

        session.step="mode";

        userSessions.set(userId,session);

        return client.replyMessage({

            replyToken:event.replyToken,

            messages:[

                {

                    type:"text",

                    text:
`本金：

${money}

請選擇模式

AI配注
天門
自由配注`

                }

            ]

        });

    }

    /*
    STEP2

    模式
    */

    if(session.step==="mode"){

        if(

            text!=="AI配注"

            &&

            text!=="天門"

            &&

            text!=="自由配注"

        ){

            return;

        }

        session.mode=text;

        session.step="play";

        session.history=[];

        userSessions.set(userId,session);

        return client.replyMessage({

            replyToken:event.replyToken,

            messages:[

                {

                    type:"text",

                    text:
`開始紀錄

請輸入：

莊

閒

和`

                }

            ]

        });

    }

  /*
STEP3

AI分析
*/

if(session.step==="play"){

    if(

        text!=="莊"

        &&

        text!=="閒"

        &&

        text!=="和"

    ){

        return;

    }

    session.history.push(text);

    const ai = calculateAI(session);

    userSessions.set(userId,session);

    return client.replyMessage({

        replyToken:event.replyToken,

        messages:[

            {

                type:"text",

                text:

`━━━━━━━━━━━━━━

🤖 BLACKDOMAIN AI

平台：${session.platform}

模式：${session.mode}

本金：${session.capital}

━━━━━━━━━━━━━━

目前牌路

${session.history.join(" ")}

━━━━━━━━━━━━━━

AI推薦：

${ai.bet}

建議下注：

${ai.unit}

信心：

${ai.confidence}%

━━━━━━━━━━━━━━`

            }

        ]

    });

}

    function calculateAI(session){

    const history=session.history;

    const last=history[history.length-1];

    const countZ=history.filter(x=>x==="莊").length;

    const countX=history.filter(x=>x==="閒").length;

    const countH=history.filter(x=>x==="和").length;

    let bet="莊";

    if(countX>countZ){

        bet="閒";

    }

    if(last==="和"){

        bet=countZ>=countX?"莊":"閒";

    }

    let unit=Math.floor(session.capital*0.03);

    if(unit<50){

        unit=50;

    }

    if(unit>5000){

        unit=5000;

    }

    let confidence=70;

    const diff=Math.abs(countZ-countX);

    confidence+=diff*3;

    if(confidence>96){

        confidence=96;

    }

    return{

        bet,

        unit,

        confidence

    };

}
    
    module.exports={

    startDG,

    startMT,

    handle

};
