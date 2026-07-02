// ui/flex/flexMain.js

module.exports = function flexMain() {

    return {

        type: "flex",

        altText: "BLACKDOMAIN AI",

        contents: {

            type: "carousel",

            contents: [

                // ===========================
                // 百家樂
                // ===========================

                {

                    type: "bubble",

                    hero: {

                        type: "image",

                        url: process.env.IMG_DG,

                        size: "full",

                        aspectRatio: "20:13",

                        aspectMode: "cover"

                    },

                    body: {

                        type: "box",

                        layout: "vertical",

                        contents: [

                            {

                                type: "text",

                                text: "🤖 百家樂AI",

                                weight: "bold",

                                size: "xl"

                            },

                            {

                                type: "text",

                                text: "DG / MT 真人百家樂 AI 分析",

                                wrap: true,

                                color: "#888888"

                            }

                        ]

                    },

                    footer: {

                        type: "box",

                        layout: "vertical",

                        contents: [

                            {

                                type: "button",

                                style: "primary",

                                action: {

                                    type: "message",

                                    label: "立即進入",

                                    text: "百家樂"

                                }

                            }

                        ]

                    }

                },

                // ===========================
                // 電子
                // ===========================

                {

                    type: "bubble",

                    hero: {

                        type: "image",

                        url: process.env.IMG_SET2,

                        size: "full",

                        aspectRatio: "20:13",

                        aspectMode: "cover"

                    },

                    body: {

                        type: "box",

                        layout: "vertical",

                        contents: [

                            {

                                type: "text",

                                text: "🎰 電子AI",

                                weight: "bold",

                                size: "xl"

                            },

                            {

                                type: "text",

                                text: "戰神賽特 / 古神巴風特",

                                wrap: true,

                                color: "#888888"

                            }

                        ]

                    },

                    footer: {

                        type: "box",

                        layout: "vertical",

                        contents: [

                            {

                                type: "button",

                                style: "primary",

                                action: {

                                    type: "message",

                                    label: "立即進入",

                                    text: "電子"

                                }

                            }

                        ]

                    }

                },

                // ===========================
                // 體育
                // ===========================

                {

                    type: "bubble",

                    hero: {

                        type: "image",

                        url: process.env.IMG_WORLDCUP,

                        size: "full",

                        aspectRatio: "20:13",

                        aspectMode: "cover"

                    },

                    body: {

                        type: "box",

                        layout: "vertical",

                        contents: [

                            {

                                type: "text",

                                text: "⚽ 體育AI",

                                weight: "bold",

                                size: "xl"

                            },

                            {

                                type: "text",

                                text: "世界盃 / MLB / NBA GPT 分析",

                                wrap: true,

                                color: "#888888"

                            }

                        ]

                    },

                    footer: {

                        type: "box",

                        layout: "vertical",

                        contents: [

                            {

                                type: "button",

                                style: "primary",

                                action: {

                                    type: "message",

                                    label: "立即進入",

                                    text: "體育"

                                }

                            }

                        ]

                    }

                },

                // ===========================
                // 539
                // ===========================

                {

                    type: "bubble",

                    body: {

                        type: "box",

                        layout: "vertical",

                        contents: [

                            {

                                type: "text",

                                text: "🎯 539 AI",

                                weight: "bold",

                                size: "xl"

                            },

                            {

                                type: "text",

                                text: "AI 穩定號 / 熱號 / 冷號",

                                wrap: true,

                                color: "#888888"

                            }

                        ]

                    },

                    footer: {

                        type: "box",

                        layout: "vertical",

                        contents: [

                            {

                                type: "button",

                                style: "primary",

                                action: {

                                    type: "message",

                                    label: "立即分析",

                                    text: "539"

                                }

                            }

                        ]

                    }

                },

                // ===========================
                // VIP
                // ===========================

                {

                    type: "bubble",

                    body: {

                        type: "box",

                        layout: "vertical",

                        contents: [

                            {

                                type: "text",

                                text: "👑 VIP中心",

                                weight: "bold",

                                size: "xl"

                            },

                            {

                                type: "text",

                                text: "查詢 / 開通 / 到期時間",

                                wrap: true,

                                color: "#888888"

                            }

                        ]

                    },

                    footer: {

                        type: "box",

                        layout: "vertical",

                        contents: [

                            {

                                type: "button",

                                style: "primary",

                                action: {

                                    type: "message",

                                    label: "VIP查詢",

                                    text: "VIP查詢"

                                }

                            }

                        ]

                    }

                }

            ]

        }

    };

};
