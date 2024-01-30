import fs from "fs";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { $ } from "execa";
import { PartialDeep } from "type-fest";
import { cloneDeep } from "lodash-es";
import yaml from "js-yaml";

import { z } from "zod";

const LoraModelSchema = z.object({
  deployment_config: z.object({
    autoscaling_config: z.object({
      min_replicas: z.number().default(1),
      initial_replicas: z.number().default(1),
      max_replicas: z.number(),
      target_num_ongoing_requests_per_replica: z.number(),
      metrics_interval_s: z.number().default(10),
      look_back_period_s: z.number().default(30),
      downscale_delay_s: z.number().default(300),
      upscale_delay_s: z.number().default(0),
    }),
    max_concurrent_queries: z.number(),
    ray_actor_options: z.object({
      resources: z.union([
        z.object({ accelerator_type_a10: z.number() }),
        z.object({ accelerator_type_a100_40g: z.number() }),
      ]),
    }),
  }),
  engine_config: z.object({
    model_id: z.string(),
    hf_model_id: z.string().optional(),
    type: z.string().default("VLLMEngine"),
    engine_kwargs: z.object({
      trust_remote_code: z.boolean().default(true),
      max_num_seqs: z.number(),
      gpu_memory_utilization: z.number().default(0.95),
      enable_cuda_graph: z.boolean().default(true),
      num_tokenizer_actors: z.number().default(2),
      enable_lora: z.boolean().default(true),
      max_lora_rank: z.number().default(8),
      max_loras: z.number(),
    }),
    max_total_tokens: z.number(),
    generation: z
      .object({
        prompt_format: z
          .object({
            system: z.string().default("{instruction}"),
            assistant: z.string().default("{instruction}"),
            user: z.string().default("{instruction}"),
            trailing_assistant: z.string().default(""),
          })
          .default({}),
        stopping_sequences: z.array(z.string()).default(["<unk>", "</s>"]),
      })
      .default({}),
  }),
  scaling_config: z.object({
    num_workers: z.number().default(1),
    num_gpus_per_worker: z.number().default(1),
    num_cpus_per_worker: z.number().default(8),
    placement_strategy: z.string().default("STRICT_PACK"),
    resources_per_worker: z.union([
      z.object({ accelerator_type_a10: z.number() }),
      z.object({ accelerator_type_a100_40g: z.number() }),
    ]),
  }),
  multiplex_config: z.object({
    max_num_models_per_replica: z.number(),
  }),
});

type LoraModel = z.infer<typeof LoraModelSchema>;

const ServeAppSchema = z.object({
  name: z.string(),
  route_prefix: z.string(),
  import_path: z.string().default("aviary_private_endpoints.backend.server.run:router_application"),
  args: z.object({
    models: z.array(z.unknown()),
    multiplex_models: z.array(LoraModelSchema),
    dynamic_lora_loading_path: z.string(),
  }),
});

type Config = {
  name: string;
  compute_config: string;
  cluster_env: string;
  ray_serve_config: {
    applications: z.infer<typeof ServeAppSchema>[];
  };
};

const $$ = $({ stdio: "inherit", shell: true });

const buckets = {
  stage: "user-models-pl-stage-4c769c7",
  prod: "user-models-pl-prod-5e7392e",
};

const setDefaults = (
  baseConfig: PartialDeep<LoraModel>,
  options: { env: "stage" | "prod"; gpuType: "a10" | "a100_40g" },
): LoraModel => {
  const maxRequests = baseConfig.engine_config?.engine_kwargs?.max_num_seqs;

  if (maxRequests === undefined) {
    throw new Error("max_num_seqs is required");
  }

  const withDefaults = cloneDeep(baseConfig);

  withDefaults.multiplex_config ??= { max_num_models_per_replica: maxRequests };

  withDefaults.engine_config = {
    ...withDefaults.engine_config,
    hf_model_id: withDefaults.engine_config?.hf_model_id ?? withDefaults.engine_config?.model_id,
  };

  const acceleratorConfig = {
    [`accelerator_type_${options.gpuType}`]: 0.01,
  };
  withDefaults.scaling_config = withDefaults.scaling_config ??= {
    resources_per_worker: acceleratorConfig,
    ...(withDefaults?.scaling_config ?? {}),
  };

  withDefaults.deployment_config = {
    ...withDefaults.deployment_config,

    max_concurrent_queries: withDefaults.deployment_config?.max_concurrent_queries ?? maxRequests,
    ray_actor_options: { resources: acceleratorConfig },
  };

  withDefaults.engine_config = {
    ...withDefaults.engine_config,
    engine_kwargs: {
      ...withDefaults.engine_config?.engine_kwargs,
      max_loras: maxRequests,
    },
  };

  return LoraModelSchema.parse(withDefaults);
};

const argv = await yargs(hideBin(process.argv))
  .options({
    env: {
      type: "string",
      description: "Environment to deploy to",
      default: "stage" as const,
      choices: ["stage", "prod"] as const,
    },
    apply: {
      type: "boolean",
      description: "Apply the generated config",
      default: false,
    },
  })
  .parse();

const stagingConfig: Config = {
  name: `inference-stage`,
  compute_config: "openpipe5",
  cluster_env: "llm-env:5",

  ray_serve_config: {
    applications: [
      {
        name: "base",
        route_prefix: "/",
        import_path: "aviary_private_endpoints.backend.server.run:router_application",
        args: {
          models: [],
          multiplex_models: [
            setDefaults(
              {
                deployment_config: {
                  autoscaling_config: {
                    max_replicas: 8,
                    target_num_ongoing_requests_per_replica: 16,
                  },
                  max_concurrent_queries: 48,
                },
                engine_config: {
                  model_id: "OpenPipe/mistral-ft-optimized-1227",
                  max_total_tokens: 16384,
                  engine_kwargs: { max_num_seqs: 24 },
                },
              },
              { env: "stage", gpuType: "a100_40g" },
            ),
          ],
          dynamic_lora_loading_path: `s3://${buckets.stage}/models/`,
        },
      },
      {
        name: "a10",
        route_prefix: "/a10-v1",
        import_path: "aviary_private_endpoints.backend.server.run:router_application",
        args: {
          models: [],
          multiplex_models: [
            setDefaults(
              {
                deployment_config: {
                  autoscaling_config: {
                    max_replicas: 30,
                    target_num_ongoing_requests_per_replica: 8,
                  },
                  max_concurrent_queries: 30,
                },
                engine_config: {
                  model_id: "OpenPipe/mistral-ft-optimized-1227",
                  max_total_tokens: 16384,
                  engine_kwargs: { max_num_seqs: 12 },
                },
              },
              { env: "stage", gpuType: "a10" },
            ),
          ],
          dynamic_lora_loading_path: `s3://${buckets.stage}/models/`,
        },
      },
    ],
  },
};

const prodConfig = cloneDeep(stagingConfig);
prodConfig.name = "inference-prod";
prodConfig.ray_serve_config.applications.forEach((app) => {
  app.args.dynamic_lora_loading_path = `s3://${buckets.prod}/models/`;
});

fs.writeFileSync("./generated/stage.yml", yaml.dump(stagingConfig));
fs.writeFileSync("./generated/prod.yml", yaml.dump(prodConfig));

console.log(`Generated config files in ./generated/stage.yml and ./generated/prod.yml`);

if (argv.apply) {
  console.log(`Applying config for ${argv.env}`);
  await $$`poetry run anyscale service rollout --in-place -f ./generated/${argv.env}.yml`;
} else {
  console.log("Use --apply to deploy the generated config");
}

console.log("Done");
