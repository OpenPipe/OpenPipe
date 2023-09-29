import "./loadEnv";
import { $ } from "execa";

// await $({ stdio: "inherit" })`pnpm prisma migrate reset --force`;

// https://vitest.dev/config/#globalsetup

export const setup = async () => {
  await $({ stdio: "inherit" })`pnpm prisma migrate reset --force --skip-generate --skip-seed`;
};
