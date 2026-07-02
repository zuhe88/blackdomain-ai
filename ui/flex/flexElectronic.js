module.exports = function flexElectronic() {

    return {

        type: "flex",

        altText: "電子AI",

        contents: {

            type: "carousel",

            contents: [

                // ==========================
                // 戰神賽特1
                // ==========================

                {

                    type: "bubble",

                    hero: {

                        type: "image",

                        url: process.env.IMG_SET1,

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

                                text: "🎰 戰神賽特1",

                                weight: "bold",

                                size: "xl"

                            },

                            {

                                type: "text",

                                text: "房號：1 ~ 2500",

                                color: "#888888",

                                wrap: true

                            },

                            {

                                type: "text",

                                text: "AI推薦房｜熱門房｜自選分析",

                                size: "sm",

                                color: "#AAAAAA",

                                wrap: true

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

                                    text: "戰神賽特1"

                                }

                            }

                        ]

                    }

                },

                // ==========================
                // 戰神賽特2
                // ==========================

                {

                    type: "bubble",

                    hero: {

                        type: "image",

                        url: process.env.IMG_SET2,

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

                                text: "🎰 戰神賽特2",

                                weight: "bold",

                                size: "xl"

                            },

                            {

                                type: "text",

                                text: "房號：1 ~ 3500",

                                color: "#888888",

                                wrap: true

                            },

                            {

                                type: "text",

                                text: "AI推薦房｜熱門房｜自選分析",

                                size: "sm",

                                color: "#AAAAAA",

                                wrap: true

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

                                    text: "戰神賽特2"

                                }

                            }

                        ]

                    }

                },

                // ==========================
                // 古神巴風特
                // ==========================

                {

                    type: "bubble",

                    hero: {

                        type: "image",

                        url: process.env.IMG_BAPHOMET,

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

                                text: "👹 古神巴風特",

                                weight: "bold",

                                size: "xl"

                            },

                            {

                                type: "text",

                                text: "房號：1 ~ 1500",

                                color: "#888888",

                                wrap: true

                            },

                            {

                                type: "text",

                                text: "AI推薦房｜熱門房｜自選分析",

                                size: "sm",

                                color: "#AAAAAA",

                                wrap: true

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

                                    text: "古神巴風特"

                                }

                            }

                        ]

                    }

                }

            ]

        }

    };

};
