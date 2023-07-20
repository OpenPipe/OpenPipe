import * as recast from "recast";
import { type ASTNode } from "ast-types";
import { prisma } from "../db";
import { fileURLToPath } from "url";
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

export default async function migrateConstructFns() {
  const v1Prompts = await prisma.promptVariant.findMany({
    where: {
      constructFnVersion: 1,
    },
  });
  console.log(`Migrating ${v1Prompts.length} prompts 1->2`);
  await Promise.all(
    v1Prompts.map(async (variant) => {
      try {
        await prisma.promptVariant.update({
          where: {
            id: variant.id,
          },
          data: {
            constructFn: migrate1to2(variant.constructFn),
            constructFnVersion: 2,
          },
        });
      } catch (e) {
        console.error("Error migrating constructFn for variant", variant.id, e);
      }
    }),
  );
}

// If we're running this file directly, run the migration
if (process.argv.at(-1) === fileURLToPath(import.meta.url)) {
  console.log("Running migration");
  await migrateConstructFns();
  console.log("Done");
}
