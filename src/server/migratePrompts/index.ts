import * as recast from "recast";
import { type ASTNode } from "ast-types";
import { prisma } from "../db";
import { fileURLToPath } from "url";
import parseConstructFn from "../utils/parseConstructFn";
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
        console.log('Migrating "anthropic" to "anthropic/completion"');
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

const applyMigrations = (constructFn: string, currentVersion: number, targetVersion: number) => {
  let migratedFn = constructFn;

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
    where: { constructFnVersion: { lt: targetVersion } },
  });
  await Promise.all(
    prompts.map(async (variant) => {
      const currentVersion = variant.constructFnVersion;

      try {
        const migratedFn = applyMigrations(variant.constructFn, currentVersion, targetVersion);

        const parsedFn = await parseConstructFn(migratedFn);
        if ("error" in parsedFn) {
          throw new Error(parsedFn.error);
        }
        await prisma.promptVariant.update({
          where: {
            id: variant.id,
          },
          data: {
            constructFn: migratedFn,
            constructFnVersion: targetVersion,
            modelProvider: parsedFn.modelProvider,
            model: parsedFn.model,
          },
        });
      } catch (e) {
        console.error("Error migrating constructFn for variant", variant.id, e);
      }
    }),
  );
}

// If we're running this file directly, run the migration to the latest version
if (process.argv.at(-1) === fileURLToPath(import.meta.url)) {
  console.log("Running migration");
  const latestVersion = Math.max(...Object.keys(migrations).map(Number));
  await migrateConstructFns(latestVersion);
  console.log("Done");
}
