# OpenPipe Node API Library

[![NPM version](https://img.shields.io/npm/v/openpipe.svg)](https://npmjs.org/package/openpipe)

This library wraps TypeScript or Javascript OpenAI API calls and logs additional data to the configured `OPENPIPE_BASE_URL` for further processing.

It is fully compatible with OpenAI's sdk and logs both streaming and non-streaming requests and responses.

<!-- To learn more about using OpenPipe, check out our [Documentation](https://docs.openpipe.ai/docs/api). -->

## Installation

```sh
npm install --save openpipe
# or
yarn add openpipe
```

## Import

### ESM

```js
// import OpenAI from "openai"
import OpenAI from "openpipe/openai";
```

### CJS

```js
// const OpenAI = require("openai")
const OpenAI = require("openpipe/openai").default;
```

## Usage

1. Create a project at https://app.openpipe.ai
2. Find your project's API key at https://app.openpipe.ai/settings
3. Configure the OpenPipe client as shown below.

```js
// import OpenAI from "openai"
import OpenAI from "openpipe/openai";

// Fully compatible with original OpenAI initialization
const openai = new OpenAI({
  apiKey: "my api key", // defaults to process.env["OPENAI_API_KEY"]
  // openpipe key is optional
  openpipe: {
    apiKey: "my api key", // defaults to process.env["OPENPIPE_API_KEY"]
    baseUrl: "my url", // defaults to process.env["OPENPIPE_BASE_URL"] or https://app.openpipe.ai/api/v1 if not set
  },
});

async function main() {
  // Allows optional openpipe object
  const completion = await openai.chat.completions.create({
    messages: [{ role: "user", content: "Say this is a test" }],
    model: "gpt-3.5-turbo",
    // optional
    openpipe: {
      // Add custom searchable tags
      tags: {
        prompt_id: "extract_user_intent",
        any_key: "any_value",
      },
      logRequest: true, // Enable/disable data collection. Defaults to true.
    },
  });

  console.log(completion.choices);
}

main();
```

## FAQ

<b><i>How do I report calls to my self-hosted instance?</i></b>

Start an instance by following the instructions on [Running Locally](https://github.com/OpenPipe/OpenPipe#running-locally). Once it's running, point your `OPENPIPE_BASE_URL` to your self-hosted instance.

<b><i>What if my `OPENPIPE_BASE_URL` is misconfigured or my instance goes down? Will my OpenAI calls stop working?</i></b>

Your OpenAI calls will continue to function as expected no matter what. The sdk handles logging errors gracefully without affecting OpenAI inference.

See the [GitHub repo](https://github.com/OpenPipe/OpenPipe) for more details.
