// ui/flex/flexBaccarat.js

module.exports = function flexBaccarat() {

    return {

        type: "flex",

        altText: "百家樂 AI",

        contents: {

            type: "carousel",

            contents: [

                // =============================
                // DG
                // =============================

                {

                    type: "bubble",

                    hero: {

                        type: "image",

                        url: process.env.IMG_DG,

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

                                text: "DG 真人百家樂",

                                weight: "bold",

                                size: "xl"

                            },

                            {

                                type: "text",

                                text: "AI 即時分析 / AI配注 / 天門",

                                wrap: true,

                                color: "#888888",

                                size: "sm"

                            }

                        ]

                    },

                    footer: {

                        type: "box",

                        layout: "vertical",

                        spacing: "sm",

                        contents: [

                            {

                                type: "button",

                                style: "primary",

                                height: "md",

                                action: {

                                    type: "message",

                                    label: "立即開始",

                                    text: "DG"

                                }

                            }

                        ]

                    }

                },

                // =============================
                // MT
                // =============================

                {

                    type: "bubble",

                    hero: {

                        type: "image",

                        url: process.env.IMG_MT,

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

                                text: "MT 真人百家樂",

                                weight: "bold",

                                size: "xl"

                            },

                            {

                                type: "text",

                                text: "AI 即時分析 / AI配注 / 天門",

                                wrap: true,

                                color: "#888888",

                                size: "sm"

                            }

                        ]

                    },

                    footer: {

                        type: "box",

                        layout: "vertical",

                        spacing: "sm",

                        contents: [

                            {

                                type: "button",

                                style: "primary",

                                height: "md",

                                action: {

                                    type: "message",

                                    label: "立即開始",

                                    text: "MT"

                                }

                            }

                        ]

                    }

                }

            ]

        }

    };

};
