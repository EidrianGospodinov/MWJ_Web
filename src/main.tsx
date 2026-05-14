import React from "react";
import "./amplifyConfig";
import ReactDOM from "react-dom/client";
import {Authenticator, ThemeProvider} from "@aws-amplify/ui-react";
import App from "./App.tsx";
import "./index.css";
import '@aws-amplify/ui-react/styles.css';

const theme = {
    name: "westminster-theme",

    tokens: {
        colors: {
            primary: {
                10: { value: "#f4f0ff" }, 
                20: { value: "#e7dcff" },
                40: { value: "#c084fc" }, 
                60: { value: "#a855f7" }, 
                80: { value: "#6b21a8" }, 
                90: { value: "#581c87" },
                100:{ value: "#2e1065" }, 
            },

            background: {
                primary: { value: "#ffffff" },
                secondary: { value: "#f5f3ff" },
                tertiary: { value: "#eef4ff" },
            },

            font: {
                primary: { value: "#1f1037" },
                secondary: { value: "#6b21a8" },
                interactive: { value: "{colors.primary.80}" },
                hover: { value: "{colors.primary.100}" },
            },

            border: {
                primary: { value: "#d8c7ff" },
                focus: { value: "{colors.primary.60}" },
            },
        },

        components: {
            authenticator: {
                router: {
                    backgroundColor: { value: "rgba(255,255,255,0.92)" },

                    boxShadow: {
                        value: "0 10px 30px rgba(91, 33, 168, 0.18)",
                    },

                    borderColor: {
                        value: "{colors.primary.20}",
                    },
                },
            },

            button: {
                primary: {
                    backgroundColor: {
                        value: "{colors.primary.80}",
                    },

                    color: {
                        value: "#ffffff",
                    },

                    _hover: {
                        backgroundColor: {
                            value: "{colors.primary.100}",
                        },
                    },

                    _focus: {
                        boxShadow: {
                            value: "0 0 0 3px rgba(168,85,247,0.35)",
                        },
                    },
                },
            },

            tabs: {
                item: {
                    color: {
                        value: "{colors.primary.40}",
                    },

                    _hover: {
                        color: {
                            value: "{colors.primary.80}",
                        },
                    },

                    _active: {
                        color: {
                            value: "{colors.primary.100}",
                        },

                        borderColor: {
                            value: "{colors.primary.60}",
                        },
                    },
                },
            },
        },
    },
};
ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
        <ThemeProvider theme={theme}>
        <Authenticator>
            <App />
        </Authenticator>
        </ThemeProvider>
    </React.StrictMode>
);



