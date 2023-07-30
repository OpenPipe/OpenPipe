import "dotenv/config";
import { Configuration, OpenPipeApi } from "../index";

const config = new Configuration({
  opOptions: {
    apiKey: "mock-key",
    basePath: "http://localhost:3000/api",
  },
});

const client = new OpenPipeApi(config);

async function main() {
  const prompt = client.capturePrompt(
    "123",
    "openai/ChatCompletion",
    () => ({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "count to 3 in french",
        },
      ],
    }),
    {}
  );

  const response = await client.createChatCompletion({
    model: "gpt-3.5-turbo",
    messages: [
      {
        role: "system",
        content: "count to 3 in french",
      },
    ],
  });

  console.log("got response", response.data);
}

main().catch((err) => {
  console.log("exited with error");
  // console.error(err);
});
