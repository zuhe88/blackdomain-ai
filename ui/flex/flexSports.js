module.exports = function flexSports() {

    return {

        type: "flex",

        altText: "體育AI",

        contents: {

            type: "carousel",

            contents: [

                // ==========================
                // 世界盃
                // ==========================

                {

                    type: "bubble",

                    hero: {

                        type: "image",

                        url: process.env.IMG_WORLDCUP,

                        size: "full",

                        aspectMode: "cover",

                        aspectRatio: "20:13"

                    },

                    body: {

                        type: "box",

                        layout: "vertical",

                        spacing: "md",

                        contents: [

                            {

                                type: "text",

                                text: "⚽ 世界盃 AI",

                                weight: "bold",

                                size: "xl"

                            },

                            {

                                type: "text",

                                text: "GPT 智能分析｜勝負｜大小分｜比分",

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

                                    text: "世界盃"

                                }

                            }

                        ]

                    }

                },

                // ==========================
                // MLB
                // ==========================

                {

                    type: "bubble",

                    hero: {

                        type: "image",

                        url: process.env.IMG_MLB,

                        size: "full",

                        aspectMode: "cover",

                        aspectRatio: "20:13"

                    },

                    body: {

                        type: "box",

                        layout: "vertical",

                        spacing: "md",

                        contents: [

                            {

                                type: "text",

                                text: "⚾ MLB AI",

                                weight: "bold",

                                size: "xl"

                            },

                            {

                                type: "text",

                                text: "GPT 智能分析｜勝負｜大小分",

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

                                    text: "MLB"

                                }

                            }

                        ]

                    }

                },

                // ==========================
                // NBA
                // ==========================

                {

                    type: "bubble",

                    hero: {

                        type: "image",

                        url: process.env.IMG_NBA,

                        size: "full",

                        aspectMode: "cover",

                        aspectRatio: "20:13"

                    },

                    body: {

                        type: "box",

                        layout: "vertical",

                        spacing: "md",

                        contents: [

                            {

                                type: "text",

                                text: "🏀 NBA AI",

                                weight: "bold",

                                size: "xl"

                            },

                            {

                                type: "text",

                                text: "GPT 智能分析｜讓分｜大小分",

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

                                    text: "NBA"

                                }

                            }

                        ]

                    }

                }

            ]

        }

    };

}
