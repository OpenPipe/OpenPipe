# OpenPipe Python Client

This client allows you automatically report your OpenAI calls to [OpenPipe](https://openpipe.ai/).

## Installation

`pip install openpipe`

## Usage

1. Create a project at https://app.openpipe.ai
2. Find your project's API key at https://app.openpipe.ai/settings
3. Configure the OpenPipe client as shown below.

```python
from openpipe import OpenAI
import os

client = OpenAI(
    # defaults to os.environ.get("OPENAI_API_KEY")
    api_key="My API Key",
    openpipe={
        # Set the OpenPipe API key you got in step (2) above.
        # If you have the `OPENPIPE_API_KEY` environment variable set we'll read from it by default
        "api_key": "My OpenPipe API Key",
    }
)
```

You can now use your new OpenAI client, which functions identically to the generic OpenAI client while also reporting calls to your OpenPipe instance.

## Special Features

### Tagging

OpenPipe has a concept of "tagging." This is very useful for grouping a certain set of completions together. When you're using a dataset for fine-tuning, you can select all the prompts that match a certain set of tags. Here's how you can use the tagging feature:

```python
completion = client.chat.completions.create(
    model="gpt-3.5-turbo",
    messages=[{"role": "system", "content": "count to 10"}],
    openpipe={
        "tags": {"prompt_id": "counting"},
        "log_request": True, # Enable/disable data collection. Defaults to True.
    },
)
```

#### Should I Wait to Enable Logging?

We recommend keeping request logging turned on from the beginning. If you change your prompt you can just set a new `prompt_id` tag so you can select just the latest version when you're ready to create a dataset.

## Usage with langchain

> Assuming you have created a project and have the openpipe key.

```python
from openpipe.langchain_llm import ChatOpenAI
from langchain.prompts import ChatPromptTemplate
from langchain.schema.runnable import RunnableSequence

prompt = ChatPromptTemplate.from_messages(
    [
        (
            "system",
            "Classify user query into positive, negative or neutral.",
        ),
        ("human", "{query}"),
    ]
)
llm = ChatOpenAI(model="gpt-3.5-turbo")\
    .with_tags(chain_name="classify", any_key="some")

# To provide the openpipe key explicitly
# llm = ChatOpenAI(model="gpt-3.5-turbo", openpipe_kwargs={"api_key": "My OpenPipe API Key"})\
#     .with_tags(chain_name="classify", any_key="some")

chain: RunnableSequence = prompt | llm
res = chain.invoke(
    {"query": "this is good"}
)
```
