import "dotenv/config";
import { Configuration, OpenAIApi } from 'openai'
import { Configuration as OPConfiguration, OpenPipeApi } from "..";


export const openAIConfig = new Configuration({ apiKey: process.env.OPENAI_API_KEY });

const openai = new OpenAIApi(openAIConfig);

const config = new OPConfiguration({
  opOptions: {
    apiKey: "mock-key",
    basePath: "http://localhost:3000/api",
  },
});

const client = new OpenPipeApi(config);

async function main() {
  const prompt = await client.capturePrompt(
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

  const response = await openai.createChatCompletion(prompt.prompt);

  console.log("got response", response.data.choices[0].message);
}

main().catch((err) => {
  console.log("exited with error");
  // console.error(err);
});
