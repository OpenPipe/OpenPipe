import { type RouterOutputs } from "~/utils/api";

export type PromptVariant = NonNullable<RouterOutputs["promptVariants"]["list"]>[0];

export type Scenario = NonNullable<RouterOutputs["scenarios"]["list"]>[0];
