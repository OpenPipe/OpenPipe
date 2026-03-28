const frontendModelProvider = {
  name: "MiniMax ChatCompletion",

  models: {
    "MiniMax-M2.7": {
      name: "MiniMax-M2.7",
      contextWindow: 1000000,
      promptTokenPrice: 0.000001,
      completionTokenPrice: 0.000005,
      speed: "medium",
      provider: "minimax/ChatCompletion",
      learnMoreUrl: "https://platform.minimaxi.com",
    },
    "MiniMax-M2.7-highspeed": {
      name: "MiniMax-M2.7 Highspeed",
      contextWindow: 1000000,
      promptTokenPrice: 0.000001,
      completionTokenPrice: 0.000005,
      speed: "fast",
      provider: "minimax/ChatCompletion",
      learnMoreUrl: "https://platform.minimaxi.com",
    },
    "MiniMax-M2.5": {
      name: "MiniMax-M2.5",
      contextWindow: 204800,
      promptTokenPrice: 0.000001,
      completionTokenPrice: 0.000005,
      speed: "medium",
      provider: "minimax/ChatCompletion",
      learnMoreUrl: "https://platform.minimaxi.com",
    },
    "MiniMax-M2.5-highspeed": {
      name: "MiniMax-M2.5 Highspeed",
      contextWindow: 204800,
      promptTokenPrice: 0.000001,
      completionTokenPrice: 0.000005,
      speed: "fast",
      provider: "minimax/ChatCompletion",
      learnMoreUrl: "https://platform.minimaxi.com",
    },
  },
};

export default frontendModelProvider;
