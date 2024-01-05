import { prisma } from "~/server/db";
import { type TypedFineTune } from "~/types/dbColumns.types";

import { cloneDeep } from "lodash-es";
import { type AxolotlConfig, axolotlConfig } from "./axolotlConfig";

const baseConfig: Partial<AxolotlConfig> = {
  datasets: [{ path: "__placeholder__", type: "alpaca_instruct.load_no_prompt" }],
  tokenizer_type: "LlamaTokenizer",
  load_in_8bit: true,
  adapter: "lora",
  lora_r: 8,
  lora_alpha: 16,
  lora_dropout: 0.05,
  lora_target_linear: true,
  gradient_accumulation_steps: 4,
  micro_batch_size: 2,
  pad_to_sequence_len: true,
  sample_packing: true,
  bf16: true,
  fp16: false,
  tf32: false,
  flash_attention: true,
  special_tokens: { bos_token: "<s>", eos_token: "</s>", unk_token: "<unk>" },
  lr_scheduler: "cosine",
  learning_rate: 0.0002,
  train_on_inputs: false,
  group_by_length: false,
  gradient_checkpointing: true,
  warmup_steps: 10,
  weight_decay: 0.0,
  optimizer: "adamw_bnb_8bit",
  output_dir: "__placeholder__",
  dataset_processes: 8,
  val_set_size: 0.05,
  logging_steps: 1,
  save_safetensors: true,
  eval_steps: 0.1,
  strict: true,
  save_strategy: "no",
};

export async function trainingConfig(fineTune: TypedFineTune): Promise<AxolotlConfig> {
  const project = await prisma.project.findUniqueOrThrow({
    where: { id: fineTune.projectId },
  });

  const trainingEntries = await prisma.fineTuneTrainingEntry.count({
    where: { fineTuneId: fineTune.id },
  });
  if (fineTune.provider !== "openpipe") {
    throw new Error(`Unsupported provider ${fineTune.provider}`);
  }

  const modelType = (
    {
      "mistralai/Mistral-7B-v0.1": "MistralForCausalLM",
      "meta-llama/Llama-2-13b-hf": "LlamaForCausalLM",
      "meta-llama/Llama-2-7b-hf": "LlamaForCausalLM",
      "OpenPipe/mistral-ft-optimized-1218": "MistralForCausalLM",
      "OpenPipe/mistral-ft-optimized-1227": "MistralForCausalLM",
    } as const
  )[fineTune.baseModel];

  const archConfig =
    modelType === "MistralForCausalLM"
      ? { is_mistral_derived_model: true, sequence_len: 8192 }
      : modelType === "LlamaForCausalLM"
      ? {
          is_llama_derived_model: true,
          sequence_len: 4096,
          lora_target_modules: [
            "gate_proj",
            "down_proj",
            "up_proj",
            "q_proj",
            "v_proj",
            "k_proj",
            "o_proj",
          ],
        }
      : (() => {
          throw new Error(`Unsupported architecture`);
        })();

  const numEpochs = calculateNumEpochs(trainingEntries);

  return axolotlConfig.parse({
    ...cloneDeep(baseConfig),
    ...archConfig,
    model_type: modelType,
    base_model: fineTune.baseModel,
    base_model_config: fineTune.baseModel,
    wandb_project: `OP ${project.name}`,
    wandb_run_id: fineTune.slug,
    num_epochs: numEpochs,
    ...fineTune.trainingConfigOverrides,
  });
}

export const calculateNumEpochs = (trainingEntries: number) => {
  if (trainingEntries === 0) throw new Error("No training entries");
  // Target 10,000 training entries, but don't go under 1 or over 10 epochs.
  return Math.min(Math.max(1, Math.round(10000 / trainingEntries)), 10);
};
