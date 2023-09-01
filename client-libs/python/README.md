# OpenPipe Python Client

This client allows you automatically report your OpenAI calls to [OpenPipe](https://openpipe.ai/). OpenPipe

## Installation

`pip install openpipe`

## Usage

1. Create a project at https://app.openpipe.ai
2. Find your project's API key at https://app.openpipe.ai/project/settings
3. Configure the OpenPipe client as shown below.

```python
from openpipe import openai, configure_openpipe
import os

# Set the OpenPipe API key you got in step (2) above.
# If you have the `OPENPIPE_API_KEY` environment variable set we'll read from it by default.
configure_openpipe(api_key=os.getenv("OPENPIPE_API_KEY"))

# Configure OpenAI the same way you would normally
openai.api_key = os.getenv("OPENAI_API_KEY")
```

You can now use your new OpenAI client, which functions identically to the generic OpenAI client while also reporting calls to your OpenPipe instance.

## Special Features

### Tagging

OpenPipe has a concept of "tagging." This is very useful for grouping a certain set of completions together. When you're using a dataset for fine-tuning, you can select all the prompts that match a certain set of tags. Here's how you can use the tagging feature:

```python
completion = openai.ChatCompletion.create(
    model="gpt-3.5-turbo",
    messages=[{"role": "system", "content": "count to 10"}],
    openpipe={"tags": {"prompt_id": "counting"}},
)
```
