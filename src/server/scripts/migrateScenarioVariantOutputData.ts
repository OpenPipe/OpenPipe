import { type Prisma } from "@prisma/client";
import { prisma } from "../db";

async function migrateScenarioVariantOutputData() {
  // Get all ScenarioVariantCells
  const cells = await prisma.scenarioVariantCell.findMany({ include: { modelOutput: true } });
  console.log(`Found ${cells.length} records`);

  let updatedCount = 0;

  // Loop through all scenarioVariants
  for (const cell of cells) {
    // Create a new ModelOutput for each ScenarioVariant with an existing output
    if (cell.output && !cell.modelOutput) {
      updatedCount++;
      await prisma.modelOutput.create({
        data: {
          scenarioVariantCellId: cell.id,
          output: cell.output as Prisma.InputJsonValue,
          timeToComplete: cell.timeToComplete ?? undefined,
          promptTokens: cell.promptTokens,
          completionTokens: cell.completionTokens,
          promptVariantId: cell.promptVariantId,
          testScenarioId: cell.testScenarioId,
          createdAt: cell.createdAt,
          updatedAt: cell.updatedAt,
        },
      });
    } else if (cell.errorMessage && cell.retrievalStatus === "COMPLETE") {
      updatedCount++;
      await prisma.scenarioVariantCell.update({
        where: { id: cell.id },
        data: {
          retrievalStatus: "ERROR",
        },
      });
    }
  }

  console.log("Data migration completed");
  console.log(`Updated ${updatedCount} records`);
}

// Execute the function
migrateScenarioVariantOutputData().catch((error) => {
  console.error("An error occurred while migrating data: ", error);
  process.exit(1);
});
