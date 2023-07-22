import { type Model } from "~/modelProviders/types";

export const truthyFilter = <T>(x: T | null | undefined): x is T => Boolean(x);

export const keyForModel = (model: Model) => `${model.provider}/${model.name}`
