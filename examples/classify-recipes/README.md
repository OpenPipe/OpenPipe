# Tutorial: Fine-Tune your Own Llama 2

Hi there! This directory should give you a brief overview of how to fine-tune a Llama 2 model from start to finish. The example model we're training will classify recipes from [a large dataset scraped from the internet](https://www.kaggle.com/datasets/wilmerarltstrmberg/recipe-dataset-over-2m). We'll use GPT-4 to generate labels for our training and test set, then fine-tune a Llama 2 model using the [axolotl](https://github.com/OpenAccess-AI-Collective/axolotl) library. You should review the notebooks in this directory in the following order:

1. [./1-generate-data.ipynb](./1-generate-data.ipynb): Demonstrates how to generate a sample dataset of GPT-4 completions, store it using OpenPipe, and then export it in a format suitable for training a model.
2. [./2-train.ipynb](./2-train.ipynb): Trains a Llama 2 7B model on the dataset from step (1).
3. [./3-evaluate.ipynb](./3-evaluate.ipynb): Evaluates the model we trained using a special test set that we set aside in step (1).
4. [./4-benchmark.ipynb](./4-benchmark.ipynb): A script to compare costs and completion latencies between our fine-tuned model, GPT-3.5, and GPT-4.

If you want to follow along yourself, I recommend using [RunPod](https://www.runpod.io/). The training scripts we use will run on any of their GPUs with 24GB of vRAM or more.

## About OpenPipe

[OpenPipe](https://openpipe.ai) is an open-source company that makes it easy for product engineers to build and deploy their own fine-tuned models. OpenPipe actually takes care of a lot of the steps this repository covers for you automatically, but we still wanted to give back and explain how fine-tuning works under the hood.