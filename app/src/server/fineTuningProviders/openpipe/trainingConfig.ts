import { kysely, prisma } from "~/server/db";
import { type TypedFineTune } from "~/types/dbColumns.types";

import { cloneDeep } from "lodash-es";
import { type AxolotlConfig, axolotlConfig } from "./axolotlConfig";
import { type PartialDeep } from "type-fest";
import { sql } from "kysely";

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
  logging_steps: 1,
  save_safetensors: true,
  val_set_size: 0,
  // eval_steps: 0.1,
  strict: true,
  save_strategy: "no",
};

export async function trainingConfig(fineTune: TypedFineTune): Promise<AxolotlConfig> {
  const project = await prisma.project.findUniqueOrThrow({
    where: { id: fineTune.projectId },
  });

  const trainingEntries = await kysely
    .selectFrom("FineTuneTrainingEntry as ftte")
    .where("ftte.fineTuneId", "=", fineTune.id)
    .select(({ fn }) => [
      fn.count<string>("ftte.id").as("count"),
      fn.sum<string>("ftte.prunedInputTokens").as("inputTokens"),
      fn.sum<string>("ftte.outputTokens").as("outputTokens"),
      sql<string>`max(ftte."prunedInputTokens" + ftte."outputTokens")`.as("maxTokens"),
    ])
    .executeTakeFirstOrThrow();

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
      "mistralai/Mistral-7B-Instruct-v0.2": "MistralForCausalLM",
      "mistralai/Mixtral-8x7B-Instruct-v0.1": "MixtralForCausalLM",
    } as const
  )[fineTune.baseModel];

  const archConfig: PartialDeep<AxolotlConfig> & { sequence_len: number } =
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
      : modelType === "MixtralForCausalLM"
      ? {
          load_in_8bit: false,
          load_in_4bit: true,
          adapter: "qlora",
          optimizer: "paged_adamw_8bit",
          model_config: {
            output_router_logits: true,
          },
          sequence_len: 16384,
          lora_target_modules: ["q_proj", "v_proj", "k_proj", "o_proj"],
          gradient_accumulation_steps: 2,
          micro_batch_size: 1,
          // deepspeed: "/axolotl/deepspeed_configs/zero3_bf16.json",
        }
      : (() => {
          throw new Error(`Unsupported architecture`);
        })();

  const numEpochs = calculateNumEpochs(Number(trainingEntries.count));

  const enableSamplePacking =
    Number(trainingEntries.inputTokens) + Number(trainingEntries.outputTokens) > 100000;

  const sequenceLen = enableSamplePacking
    ? archConfig.sequence_len
    : Number(trainingEntries.maxTokens) + 100;

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
    sample_packing: enableSamplePacking,
    pad_to_sequence_len: enableSamplePacking,
    sequence_len: sequenceLen,
  });
}

export const calculateNumEpochs = (trainingEntries: number) => {
  if (trainingEntries === 0) throw new Error("No training entries");
  // Target 10,000 training entries, but don't go under 1 or over 10 epochs.
  return Math.min(Math.max(1, Math.round(10000 / trainingEntries)), 10);
};

export const getNumEpochsFromConfig = (fineTune: TypedFineTune) => {
  const config = fineTune?.trainingConfigOverrides;
  if (config && typeof config === "object" && "num_epochs" in config) {
    return Number(config.num_epochs);
  }
};
