# OpenPipe

OpenPipe is a flexible playground for comparing and optimizing LLM prompts. It lets you quickly generate, test and compare candidate prompts, and can automatically [translate](#-translate-between-model-apis) those prompts between models.

<img src="https://github.com/openpipe/openpipe/assets/41524992/66bb1843-cb72-4130-a369-eec2df3b8201" alt="demo">

You can use our hosted version of OpenPipe at https://openpipe.ai. You can also clone this repository and [run it locally](#running-locally).

## Sample Experiments

These are simple experiments users have created that show how OpenPipe works. Feel free to fork them and start experimenting yourself.

- [Twitter Sentiment Analysis](https://app.openpipe.ai/experiments/62c20a73-2012-4a64-973c-4b665ad46a57)
- [Reddit User Needs](https://app.openpipe.ai/experiments/22222222-2222-2222-2222-222222222222)
- [OpenAI Function Calls](https://app.openpipe.ai/experiments/2ebbdcb3-ed51-456e-87dc-91f72eaf3e2b)
- [Activity Classification](https://app.openpipe.ai/experiments/3950940f-ab6b-4b74-841d-7e9dbc4e4ff8)

## Supported Models

#### OpenAI
  - [GPT 3.5 Turbo](https://platform.openai.com/docs/guides/gpt/chat-completions-api)
  - [GPT 3.5 Turbo 16k](https://platform.openai.com/docs/guides/gpt/chat-completions-api)
  - [GPT 4](https://openai.com/gpt-4)
#### Llama2
  - [7b chat](https://replicate.com/a16z-infra/llama7b-v2-chat)
  - [13b chat](https://replicate.com/a16z-infra/llama13b-v2-chat)
  - [70b chat](https://replicate.com/replicate/llama70b-v2-chat)
#### Llama2 fine-tunes
  - [Open-Orca/OpenOrcaxOpenChat-Preview2-13B](https://huggingface.co/Open-Orca/OpenOrcaxOpenChat-Preview2-13B)
  - [Open-Orca/OpenOrca-Platypus2-13B](https://huggingface.co/Open-Orca/OpenOrca-Platypus2-13B)
  - [NousResearch/Nous-Hermes-Llama2-13b](https://huggingface.co/NousResearch/Nous-Hermes-Llama2-13b)
  - [jondurbin/airoboros-l2-13b-gpt4-2.0](https://huggingface.co/jondurbin/airoboros-l2-13b-gpt4-2.0)
  - [lmsys/vicuna-13b-v1.5](https://huggingface.co/lmsys/vicuna-13b-v1.5)
  - [Gryphe/MythoMax-L2-13b](https://huggingface.co/Gryphe/MythoMax-L2-13b)
  - [NousResearch/Nous-Hermes-llama-2-7b](https://huggingface.co/NousResearch/Nous-Hermes-llama-2-7b)
#### Anthropic
  - [Claude 1 Instant](https://www.anthropic.com/index/introducing-claude)
  - [Claude 2](https://www.anthropic.com/index/claude-2)

## Features

### 🔍 Visualize Responses

Inspect prompt completions side-by-side.

### 🧪 Bulk-Test

OpenPipe lets you _template_ a prompt. Use the templating feature to run the prompts you're testing against many potential inputs for broad coverage of your problem space.

### 📟 Translate between Model APIs

Write your prompt in one format and automatically convert it to work with any other model.

<!-- <img width="480" alt="Screenshot 2023-08-01 at 11 55 38 PM" src="https://github.com/OpenPipe/OpenPipe/assets/41524992/1e19ccf2-96b6-4e93-a3a5-1449710d1b5b" alt="translate between models"> -->

### 🛠️ Refine Your Prompts Automatically

Use a growing database of best-practice refinements to improve your prompts automatically.

<!-- <img width="480" alt="Screenshot 2023-08-01 at 11 55 38 PM" src="https://github.com/OpenPipe/OpenPipe/assets/41524992/87a27fe7-daef-445c-a5e2-1c82b23f9f99" alt="add function call"> -->

### 🪄 Auto-generate Test Scenarios

OpenPipe includes a tool to generate new test scenarios based on your existing prompts and scenarios. Just click "Autogenerate Scenario" to try it out!

<!-- <img width="600" src="https://github.com/openpipe/openpipe/assets/41524992/219a844e-3f4e-4f6b-8066-41348b42977b" alt="auto-generate"> -->

## Running Locally

1. Install [Postgresql](https://www.postgresql.org/download/).
2. Install [NodeJS 20](https://nodejs.org/en/download/current) (earlier versions will very likely work but aren't tested).
3. Install `pnpm`: `npm i -g pnpm`
4. Clone this repository: `git clone https://github.com/openpipe/openpipe`
5. Install the dependencies: `cd openpipe && pnpm install`
6. Create a `.env` file (`cp .env.example .env`) and enter your `OPENAI_API_KEY`.
7. Update `DATABASE_URL` if necessary to point to your Postgres instance and run `pnpm prisma migrate dev` to create the database.
8. Create a [GitHub OAuth App](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/creating-an-oauth-app) and update the `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` values. (Note: a PR to make auth optional when running locally would be a great contribution!)
9. Start the app: `pnpm dev`.
10. Navigate to [http://localhost:3000](http://localhost:3000)

## Testing Locally

1. Copy your `.env` file to `.env.test`.
2. Update the `DATABASE_URL` to have a different database name than your development one
3. Run `DATABASE_URL=[your new datatase url] pnpm prisma migrate dev --skip-seed --skip-generate`
4. Run `pnpm test`
