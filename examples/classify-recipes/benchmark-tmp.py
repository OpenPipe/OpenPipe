# %% [markdown]
# I'm pretty happy with my model's accuracy relative to GPT-4. How does it compare cost-wise?
#
# I'll really push this to its limits -- let's see how quickly our poor model can classify the [full 2-million-recipe dataset](https://huggingface.co/datasets/corbt/all-recipes) 😈.

# %%

# %%
from datasets import load_dataset

all_recipes = load_dataset("corbt/all-recipes")["train"]["input"]

print(f"Number of recipes: {len(all_recipes):,}")


# %%
from vllm import LLM, SamplingParams

llm = LLM(model="./models/run1/merged", max_num_batched_tokens=4096)

sampling_params = SamplingParams(
    # 120 should be fine for the work we're doing here.
    max_tokens=120,
    # This is a deterministic task so temperature=0 is best.
    temperature=0,
)


# %%
import os
import time
import json

BATCH_SIZE = 10000
start_time = time.time()
print(f"Start time: {start_time}")

for i in range(0, len(all_recipes), BATCH_SIZE):
    # File name for the current batch
    file_name = f"./data/benchmark_batch_{int(i/BATCH_SIZE)}.txt"

    # Check if the file already exists; if so, skip to the next batch
    if os.path.exists(file_name):
        print(f"File {file_name} exists, skipping recipes {i:,} to {i+BATCH_SIZE:,}...")
        continue

    print(f"Processing recipes {i:,} to {i+BATCH_SIZE:,}...")
    outputs = llm.generate(
        all_recipes[i : i + BATCH_SIZE], sampling_params=sampling_params
    )

    outputs = [o.outputs[0].text for o in outputs]

    # Write the generated outputs to the file as a JSON list
    json.dump(outputs, open(file_name, "w"))

end_time = time.time()
print(f"End time: {end_time}")
print(f"Total hours: {((end_time - start_time) / 3600):.2f}")


# %% [markdown]
# Nice! I've processed all 2,147,248 recipes in under 17 hours. Let's do a cost comparison with GPT-3.5 and GPT-4. I'll use the GPT-4 latency/cost numbers based on the 5000 samples used to generate our model's training data.

# %%
import pandas as pd

# I used an on-demand Nvidia L40 on RunPod for this, at an hourly cost of $1.14.
finetuned_hourly_cost = 1.14

finetuned_total_hours = 17

finetuned_avg_cost = finetuned_hourly_cost * finetuned_total_hours / len(all_recipes)

# The average input and output tokens calculated by OpenAI, based on the 5000 recipes I sent them
avg_input_tokens = 276
avg_output_tokens = 42

# Token pricing from https://openai.com/pricing
gpt_4_avg_cost = avg_input_tokens * 0.03 / 1000 + avg_output_tokens * 0.06 / 1000

gpt_35_avg_cost = avg_input_tokens * 0.0015 / 1000 + avg_output_tokens * 0.0016 / 1000

gpt_35_finetuned_avg_cost = (
    avg_input_tokens * 0.012 / 1000 + avg_output_tokens * 0.016 / 1000 + 0.06 / 1000
)

# Multiply the number of recipes
# gpt_4_cost = len(all_recipes) * gpt_4_avg_cost
# gpt_35_cost = len(all_recipes) * gpt_35_avg_cost
# gpt_35_finetuned_cost = len(all_recipes) * gpt_35_finetuned_avg_cost

# Let's put this in a dataframe for easier comparison.

costs = pd.DataFrame(
    {
        "Model": [
            "Llama 2 7B (finetuned)",
            "GPT-3.5",
            "GPT-3.5 (finetuned)",
            "GPT-4",
        ],
        "Cost to Classify One Recipe": [
            finetuned_avg_cost,
            gpt_35_avg_cost,
            gpt_35_finetuned_avg_cost,
            gpt_4_avg_cost,
        ],
    }
)

costs["Cost to Classify Entire Dataset"] = (
    costs["Cost to Classify One Recipe"] * len(all_recipes)
).map(lambda x: f"{x:,.2f}")


costs


# %% [markdown]
# ...and just for fun, let's figure out how many recipes my pescatarian basement-dwelling brother can make! 😂

# %%
