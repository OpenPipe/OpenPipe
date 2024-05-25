## **Note:** we’ve temporarily stopped development on the open-source version of OpenPipe to integrate some proprietary third-party code. We hope to make the non-proprietary parts of the repository open again under an open core model once we have the bandwidth to do so!

 <p align="center">
  <a href="https://openpipe.ai">
    <img height="70" src="https://github.com/openpipe/openpipe/assets/41524992/70af25fb-1f90-42d9-8a20-3606e3b5aaba" alt="logo">
  </a>
</p>
<h1 align="center">
  OpenPipe
</h1>

<p align="center">
  <i>Open-source fine-tuning and model-hosting platform.</i>
</p>

<p align="center">
  <a href="/LICENSE"><img alt="License Apache-2.0" src="https://img.shields.io/github/license/openpipe/openpipe?style=flat-square"></a>
  <a href='http://makeapullrequest.com'><img alt='PRs Welcome' src='https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square'/></a>
  <a href="https://github.com/openpipe/openpipe/graphs/commit-activity"><img alt="GitHub commit activity" src="https://img.shields.io/github/commit-activity/m/openpipe/openpipe?style=flat-square"/></a>
  <a href="https://github.com/openpipe/openpipe/issues"><img alt="GitHub closed issues" src="https://img.shields.io/github/issues-closed/openpipe/openpipe?style=flat-square"/></a>
 <img src="https://img.shields.io/badge/Y%20Combinator-S23-orange?style=flat-square" alt="Y Combinator S23">
</p>

<p align="center">
  <a href="https://app.openpipe.ai/p/BRZFEx50Pf/request-logs">Demo</a> - <a href="#running-locally">Running Locally</a> - <a href="https://docs.openpipe.ai">Docs</a>
</p>

<br>
Use powerful but expensive LLMs to fine-tune smaller and cheaper models suited to your exact needs. Query your past requests and evaluate models against one another. Switch between OpenAI and fine-tuned models with one line of code.
<br>

## Features

- Easy integration with OpenAI's SDK in both Python and TypeScript.
  - [Python SDK](https://pypi.org/project/openpipe/)
  - [TypeScript SDK](https://www.npmjs.com/package/openpipe)
- OpenAI-compatible chat completions endpoint.
- Fine-tune GPT 3.5, Mistral, and Llama 2 models. Host on-platform or download the weights.
  - Model output is OpenAI-compatible.
  - Switching from GPT 4 to a fine-tuned Mistral model only requires changing the model name.
- Query logs using powerful built-in filters.
- Import datasets in OpenAI-compatible JSONL files.
- Prune large chunks of duplicate text like system prompts.
- Compare output accuracy against base models like gpt-3.5-turbo.

## Supported Base Models

- [mistralai/Mixtral-8x7B-Instruct-v0.1](https://huggingface.co/mistralai/Mixtral-8x7B-Instruct-v0.1)
- [OpenPipe/mistral-ft-optimized-1227](https://huggingface.co/OpenPipe/mistral-ft-optimized-1227)
- [meta-llama/Llama-3-8B](https://huggingface.co/meta-llama/Meta-Llama-3-8B)
- [meta-llama/Llama-3-70B](https://huggingface.co/meta-llama/Meta-Llama-3-70B)
- [gpt-3.5-turbo-0613](https://openai.com/blog/gpt-3-5-turbo-fine-tuning-and-api-updates)
- [gpt-3.5-turbo-1106](https://openai.com/blog/gpt-3-5-turbo-fine-tuning-and-api-updates)
- [gpt-3.5-turbo-0125](https://openai.com/blog/gpt-3-5-turbo-fine-tuning-and-api-updates)

## Documentation

- See [docs](https://docs.openpipe.ai/introduction)

## Running Locally

1. Install [Postgresql](https://www.postgresql.org/download/).
2. Install [NodeJS 20](https://nodejs.org/en/download/current) (earlier versions will very likely work but aren't tested).
3. Install `pnpm`: `npm i -g pnpm`
4. Clone this repository: `git clone https://github.com/openpipe/openpipe`
5. Install the dependencies: `cd openpipe && pnpm install`
6. Create a `.env` file (`cd app && cp .env.example .env`) and enter your `OPENAI_API_KEY`.
7. If you just installed postgres and wish to use the default `DATABASE_URL` run the following commands:

```sh
psql postgres
CREATE ROLE postgres WITH LOGIN PASSWORD 'postgres';
ALTER ROLE postgres SUPERUSER;
```

8. Update `DATABASE_URL` if necessary to point to your Postgres instance and run `pnpm prisma migrate dev` in the `app` directory to create the database.
9. Create a [GitHub OAuth App](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/creating-an-oauth-app), set the callback URL to `<your local instance>/api/auth/callback/github`, e.g. `http://localhost:3000/api/auth/callback/github`.
10. Update the `GITHUB_CLIENT_ID` and `GITHUB_CLIENT_SECRET` values from the Github OAuth app (Note: a PR to make auth optional when running locally would be a great contribution!).
11. To start the app run `pnpm dev` in the `app` directory.
12. Navigate to [http://localhost:3000](http://localhost:3000)

## Using Locally

```sh
import os
from openpipe import OpenAI

client = OpenAI(
    api_key="Your API Key",
    openpipe={
        "api_key": "Your OpenPipe API Key",
        "base_url": "http://localhost:3000/api/v1", # Local OpenPipe instance
    }
)

completion = client.chat.completions.create(
    model="gpt-3.5-turbo",
    messages=[{"role": "system", "content": "count to 10"}],
    openpipe={
        "tags": {"prompt_id": "counting"},
        "log_request": True
    },
)
```

## Testing Locally

1. Copy your `.env` file to `.env.test`.
2. Update the `DATABASE_URL` to have a different database name than your development one
3. Run `DATABASE_URL=[your new datatase url] pnpm prisma migrate dev --skip-seed --skip-generate`
4. Run `pnpm test`
