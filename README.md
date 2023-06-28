# 🧪 Prompt Lab 

Prompt Lab is a flexible playground for comparing and optimizing LLM prompts. It lets you quickly generate, test and compare candidate prompts with realistic sample data.

[]

Currently there's a public playground available at [https://promptlab.corbt.com/](https://promptlab.corbt.com/), but the recommended approach is to but the recommended approach is to [run locally](#running-locally).

## High-Level Features

**Configure Multiple Prompts**
Set up multiple prompt configurations and compare their output side-by-side. Each configuration can be configured independently.

**Visualize Responses**
Inspect prompt completions side-by-side.

**Test Many Inputs**
Prompt Lab lets you *template* a prompt. Use the templating feature to run the prompts you're testing against many potential inputs for broader coverage of your problem space than you'd get with manual testing.

**🪄 Auto-generate Test Scenarios**
Prompt Lab includes a tool to generate new test scenarios based on your existing prompts and scenarios. Just click "Autogenerate Scenario" to try it out!

**Prompt Validation and Typeahead**
We use OpenAI's OpenAPI spec to automatically provide typeahead and validate prompts.

[]

**Function Call Support**
Natively supports [OpenAI function calls](https://openai.com/blog/function-calling-and-other-api-updates) on supported models.

[]

## Supported Models
Prompt Lab currently supports GPT-3.5 and GPT-4. Wider model support is planned.

## Running Locally

1. Install [Postgresql](https://www.postgresql.org/download/).
2. Install [NodeJS 20](https://nodejs.org/en/download/current) (earlier versions will very likely work but aren't tested).
3. Install `pnpm`: `npm i -g pnpm`
4. Clone this repository: `git clone https://github.com/prompt-lab/prompt-lab`
5. Install the dependencies: `cd prompt-lab && pnpm install`
6. Create a `.env` file (`cp .env.example .env`) and enter your `OPENAI_API_KEY`.
7. Start the app: `pnpm dev`
8. Navigate to [http://localhost:3000](http://localhost:3000)