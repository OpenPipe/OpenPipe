import "dotenv/config";
import * as recast from "recast";
import { type ASTNode } from "ast-types";
import { fileURLToPath } from "url";
import parsePromptConstructor from "./parse";
import { prisma } from "~/server/db";
import { promptConstructorVersion } from "./version";
const { builders: b } = recast.types;

export const migrate1to2 = (fnBody: string): string => {
  const ast: ASTNode = recast.parse(fnBody);

  recast.visit(ast, {
    visitAssignmentExpression(path) {
      const node = path.node;
      if ("name" in node.left && node.left.name === "prompt") {
        const functionCall = b.callExpression(b.identifier("definePrompt"), [
          b.literal("openai/ChatCompletion"),
          node.right,
        ]);
        path.replace(functionCall);
      }
      return false;
    },
  });

  return recast.print(ast).code;
};

export const migrate2to3 = (fnBody: string): string => {
  const ast: ASTNode = recast.parse(fnBody);

  recast.visit(ast, {
    visitCallExpression(path) {
      const node = path.node;

      // Check if the function being called is 'definePrompt'
      if (
        recast.types.namedTypes.Identifier.check(node.callee) &&
        node.callee.name === "definePrompt" &&
        node.arguments.length > 0 &&
        recast.types.namedTypes.Literal.check(node.arguments[0]) &&
        node.arguments[0].value === "anthropic"
      ) {
        node.arguments[0].value = "anthropic/completion";
      }

      return false;
    },
  });

  return recast.print(ast).code;
};

const migrations: Record<number, (fnBody: string) => string> = {
  2: migrate1to2,
  3: migrate2to3,
};

const applyMigrations = (
  promptConstructor: string,
  currentVersion: number,
  targetVersion: number,
) => {
  let migratedFn = promptConstructor;

  for (let v = currentVersion + 1; v <= targetVersion; v++) {
    const migrationFn = migrations[v];
    if (migrationFn) {
      migratedFn = migrationFn(migratedFn);
    }
  }

  return migratedFn;
};

export default async function migrateConstructFns(targetVersion: number) {
  const prompts = await prisma.promptVariant.findMany({
    where: { promptConstructorVersion: { lt: targetVersion } },
  });
  console.log(`Migrating ${prompts.length} prompts to version ${targetVersion}`);
  await Promise.all(
    prompts.map(async (variant) => {
      const currentVersion = variant.promptConstructorVersion;

      try {
        const migratedFn = applyMigrations(
          variant.promptConstructor,
          currentVersion,
          targetVersion,
        );

        const parsedFn = await parsePromptConstructor(migratedFn);
        if ("error" in parsedFn) {
          throw new Error(parsedFn.error);
        }
        await prisma.promptVariant.update({
          where: {
            id: variant.id,
          },
          data: {
            promptConstructor: migratedFn,
            promptConstructorVersion: targetVersion,
            modelProvider: parsedFn.modelProvider,
            model: parsedFn.model,
          },
        });
      } catch (e) {
        console.error("Error migrating promptConstructor for variant", variant.id, e);
      }
    }),
  );
}

// If we're running this file directly, run the migration to the latest version
if (process.argv.at(-1) === fileURLToPath(import.meta.url)) {
  const latestVersion = Math.max(...Object.keys(migrations).map(Number));
  if (latestVersion !== promptConstructorVersion) {
    throw new Error(
      `The latest migration is ${latestVersion}, but the promptConstructorVersion is ${promptConstructorVersion}`,
    );
  }
  await migrateConstructFns(promptConstructorVersion);
  console.log("Done");
}
