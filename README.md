
# <img src="https://github.com/open-pipe/openpipe/assets/41524992/3fec1f7f-f55d-43e9-bfb9-fa709a618b49" width="36" height="36"> OpenPipe 

OpenPipe is a flexible playground for comparing and optimizing LLM prompts. It lets you quickly generate, test and compare candidate prompts with realistic sample data.

<img src="https://github.com/open-pipe/openpipe/assets/176426/fc7624c6-5b65-4d4d-82b7-4a816f3e5678" alt="demo" height="400px">

Currently there's a public playground available at [https://openpipe.ai/](https://openpipe.ai/), but the recommended approach is to [run locally](#running-locally).

## High-Level Features

**Configure Multiple Prompts**  
Set up multiple prompt configurations and compare their output side-by-side. Each configuration can be configured independently.

**Visualize Responses**  
Inspect prompt completions side-by-side.

**Test Many Inputs**  
OpenPipe lets you *template* a prompt. Use the templating feature to run the prompts you're testing against many potential inputs for broader coverage of your problem space than you'd get with manual testing.

**🪄 Auto-generate Test Scenarios**  
OpenPipe includes a tool to generate new test scenarios based on your existing prompts and scenarios. Just click "Autogenerate Scenario" to try it out!

**Prompt Validation and Typeahead**  
We use OpenAI's OpenAPI spec to automatically provide typeahead and validate prompts.

<img alt="typeahead" src="https://github.com/open-pipe/openpipe/assets/176426/acc638f8-d851-4742-8d01-fe6f98890840" height="300px">

**Function Call Support**  
Natively supports [OpenAI function calls](https://openai.com/blog/function-calling-and-other-api-updates) on supported models.

<img height="300px" alt="function calls" src="https://github.com/open-pipe/openpipe/assets/176426/48ad13fe-af2f-4294-bf32-62015597fd9b">

## Supported Models
OpenPipe currently supports GPT-3.5 and GPT-4. Wider model support is planned.

## Running Locally

1. Install [Postgresql](https://www.postgresql.org/download/).
2. Install [NodeJS 20](https://nodejs.org/en/download/current) (earlier versions will very likely work but aren't tested).
3. Install `pnpm`: `npm i -g pnpm`
4. Clone this repository: `git clone https://github.com/open-pipe/openpipe`
5. Install the dependencies: `cd openpipe && pnpm install`
6. Create a `.env` file (`cp .env.example .env`) and enter your `OPENAI_API_KEY`.
7. Update `DATABASE_URL` if necessary to point to your Postgres instance and run `pnpm prisma db push` to create the database.
8. Start the app: `pnpm dev`.
9. Navigate to [http://localhost:3000](http://localhost:3000)
