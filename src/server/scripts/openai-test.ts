import "dotenv/config";
import { openai } from "../utils/openai";

const resp = await openai.chat.completions.create({
  model: "gpt-3.5-turbo-0613",
  stream: true,
  messages: [
    {
      role: "user",
      content: "count to 20",
    },
  ],
});

for await (const part of resp) {
  console.log("part", part);
}

console.log("final resp", resp);
