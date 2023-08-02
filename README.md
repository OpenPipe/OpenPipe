<img src="https://github.com/openpipe/openpipe/assets/41524992/ca59596e-eb80-40f9-921f-6d67f6e6d8fa" width="72px" />

# OpenPipe

OpenPipe is a flexible playground for comparing and optimizing LLM prompts. It lets you quickly generate, test and compare candidate prompts with realistic sample data.

## Sample Experiments

These are simple experiments users have created that show how OpenPipe works. Feel free to fork them and start experimenting yourself.

- [Twitter Sentiment Analysis](https://app.openpipe.ai/experiments/62c20a73-2012-4a64-973c-4b665ad46a57)
- [Reddit User Needs](https://app.openpipe.ai/experiments/22222222-2222-2222-2222-222222222222)
- [OpenAI Function Calls](https://app.openpipe.ai/experiments/2ebbdcb3-ed51-456e-87dc-91f72eaf3e2b)
- [Activity Classification](https://app.openpipe.ai/experiments/3950940f-ab6b-4b74-841d-7e9dbc4e4ff8)

<img src="https://github.com/openpipe/openpipe/assets/41524992/219a844e-3f4e-4f6b-8066-41348b42977b" alt="demo">



You can use our hosted version of OpenPipe at https://openpipe.ai. You can also clone this repository and [run it locally](#running-locally).

## High-Level Features

**Visualize Responses**  
Inspect prompt completions side-by-side.

<br>

**Test Many Inputs**  
OpenPipe lets you _template_ a prompt. Use the templating feature to run the prompts you're testing against many potential inputs for broader coverage of your problem space than you'd get with manual testing.

<br>

**Translate between Model APIs**  
Write your prompt in one format and automatically convert it to work with any other model.

<img width="480" alt="Screenshot 2023-08-01 at 11 55 38 PM" src="https://github.com/OpenPipe/OpenPipe/assets/41524992/1e19ccf2-96b6-4e93-a3a5-1449710d1b5b" alt="translate between models">

<br><br>
**Refine your prompts automatically**  
Use a growing database of existing best-practice refinements or provide custom instructions to improve your prompts automatically.

<img width="480" alt="Screenshot 2023-08-01 at 11 55 38 PM" src="https://github.com/OpenPipe/OpenPipe/assets/41524992/87a27fe7-daef-445c-a5e2-1c82b23f9f99" alt="add function call">

<br><br>
**🪄 Auto-generate Test Scenarios**  
OpenPipe includes a tool to generate new test scenarios based on your existing prompts and scenarios. Just click "Autogenerate Scenario" to try it out!

<img width="600" src="https://github.com/openpipe/openpipe/assets/41524992/219a844e-3f4e-4f6b-8066-41348b42977b" alt="auto-generate">

<br><br>
## Supported Models

- All models available through the OpenAI [chat completion API](https://platform.openai.com/docs/guides/gpt/chat-completions-api)
- Llama2 [7b chat](https://replicate.com/a16z-infra/llama7b-v2-chat), [13b chat](https://replicate.com/a16z-infra/llama13b-v2-chat), [70b chat](https://replicate.com/replicate/llama70b-v2-chat).
- Anthropic's [Claude 1 Instant](https://www.anthropic.com/index/introducing-claude) and [Claude 2](https://www.anthropic.com/index/claude-2)

## Running Locally

1. Install [Postgresql](https://www.postgresql.org/download/).
2. Install [NodeJS 20](https://nodejs.org/en/download/current) (earlier versions will very likely work but aren't tested).
3. Install `pnpm`: `npm i -g pnpm`
4. Clone this repository: `git clone https://github.com/openpipe/openpipe`
5. Install the dependencies: `cd openpipe && pnpm install`
6. Create a `.env` file (`cp .env.example .env`) and enter your `OPENAI_API_KEY`.
7. Update `DATABASE_URL` if necessary to point to your Postgres instance and run `pnpm prisma db push` to create the database.
8. Create a [GitHub OAuth App](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/creating-an-oauth-app) and update the `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` values. (Note: a PR to make auth optional when running locally would be a great contribution!)
9. Start the app: `pnpm dev`.
10. Navigate to [http://localhost:3000](http://localhost:3000)
