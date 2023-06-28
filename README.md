# 🧪 Prompt Lab 

Prompt Lab is a flexible playground for comparing and optimizing LLM prompts. It lets you quickly generate, test and compare candidate prompts with realistic sample data.

![main](https://github.com/corbt/prompt-lab/assets/176426/bc5ceb5d-b898-4710-8d62-af622c0d2d19)

Currently there's a public playground available at [https://promptlab.corbt.com/](https://promptlab.corbt.com/), but the recommended approach is to [run locally](#running-locally).

## High-Level Features

 - **Configure Multiple Prompts** - Set up multiple prompt configurations and compare their output side-by-side. Each configuration can be configured independently.

 - **Visualize Responses** - Inspect prompt completions side-by-side.

 - **Test Many Inputs** - Prompt Lab lets you *template* a prompt. Use the templating feature to run the prompts you're testing against many potential inputs for broader coverage of your problem space than you'd get with manual testing.

 - **🪄 Auto-generate Test Scenarios** - Prompt Lab includes a tool to generate new test scenarios based on your existing prompts and scenarios. Just click "Autogenerate Scenario" to try it out!

 - **Prompt Validation and Typeahead** - We use OpenAI's OpenAPI spec to automatically provide typeahead and validate prompts.

![typeahead](https://github.com/corbt/prompt-lab/assets/176426/d475d88e-473a-4e7d-b20a-a1e7ed097c3e)

 - **Function Call Support** - Natively supports [OpenAI function calls](https://openai.com/blog/function-calling-and-other-api-updates) on supported models.

<img width="811" alt="function calls" src="https://github.com/corbt/prompt-lab/assets/176426/48ad13fe-af2f-4294-bf32-62015597fd9b">

## Supported Models
Prompt Lab currently supports GPT-3.5 and GPT-4. Wider model support is planned.

## Running Locally

1. Install [Postgresql](https://www.postgresql.org/download/).
2. Install [NodeJS 20](https://nodejs.org/en/download/current) (earlier versions will very likely work but aren't tested).
3. Install `pnpm`: `npm i -g pnpm`
4. Clone this repository: `git clone https://github.com/prompt-lab/prompt-lab`
5. Install the dependencies: `cd prompt-lab && pnpm install`
6. Create a `.env` file (`cp .env.example .env`) and enter your `OPENAI_API_KEY`.
7. Update `DATABASE_URL` and run `pnpm prisma db push` to create the database.
8. Start the app: `pnpm dev`
9. Navigate to [http://localhost:3000](http://localhost:3000)
