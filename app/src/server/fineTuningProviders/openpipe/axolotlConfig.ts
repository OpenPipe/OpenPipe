import { z } from "zod";

export const axolotlConfig = z.object({
  model_type: z.enum(["LlamaForCausalLM", "MistralForCausalLM", "MixtralForCausalLM"]),
  tokenizer_type: z.string(),
  is_llama_derived_model: z.boolean().optional(),
  is_mistral_derived_model: z.boolean().optional(),
  load_in_8bit: z.boolean(),
  load_in_4bit: z.boolean().optional(),
  adapter: z.enum(["lora", "qlora"]),
  model_config: z
    .object({
      output_router_logits: z.boolean().optional(),
    })
    .optional(),
  sequence_len: z.number(),
  sample_packing: z.boolean(),
  eval_sample_packing: z.boolean().optional(),
  pad_to_sequence_len: z.boolean().optional(),
  lora_r: z.number(),
  lora_alpha: z.number(),
  lora_dropout: z.number(),
  lora_target_linear: z.boolean(),
  lora_target_modules: z.array(z.string()).optional(),
  gradient_accumulation_steps: z.number(),
  micro_batch_size: z.number(),
  optimizer: z.string(),
  lr_scheduler: z.string(),
  learning_rate: z.number(),
  train_on_inputs: z.boolean(),
  group_by_length: z.boolean(),
  bf16: z.boolean(),
  fp16: z.boolean(),
  tf32: z.boolean(),
  gradient_checkpointing: z.boolean(),
  flash_attention: z.boolean(),
  warmup_steps: z.number(),
  weight_decay: z.number(),
  special_tokens: z.object({
    bos_token: z.string(),
    eos_token: z.string(),
    unk_token: z.string(),
  }),
  base_model: z.string(),
  base_model_config: z.string().optional(),
  datasets: z
    .array(
      z.object({
        path: z.string(),
        type: z.string(),
      }),
    )
    .nonempty(),
  dataset_processes: z.number().optional(),
  val_set_size: z.number(),
  output_dir: z.string().optional(),
  wandb_project: z.string().optional(),
  wandb_run_id: z.string().optional(),
  num_epochs: z.number(),
  logging_steps: z.number().optional(),
  save_safetensors: z.boolean().optional(),
  eval_steps: z.number().optional(),
  strict: z.boolean().optional(),
  save_strategy: z.string().optional(),
  deepspeed: z.string().optional(),
});

export type AxolotlConfig = z.infer<typeof axolotlConfig>;
