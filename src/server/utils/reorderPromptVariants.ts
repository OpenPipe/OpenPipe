import { prisma } from "~/server/db";

export const reorderPromptVariants = async (
  movedId: string,
  stationaryTargetId: string,
  alwaysInsertRight?: boolean,
) => {
  const moved = await prisma.promptVariant.findUnique({
    where: {
      id: movedId,
    },
  });

  const target = await prisma.promptVariant.findUnique({
    where: {
      id: stationaryTargetId,
    },
  });

  if (!moved || !target || moved.experimentId !== target.experimentId) {
    throw new Error(`Prompt Variant with id ${movedId} or ${stationaryTargetId} does not exist`);
  }

  const visibleItems = await prisma.promptVariant.findMany({
    where: {
      experimentId: moved.experimentId,
      visible: true,
    },
    orderBy: {
      sortIndex: "asc",
    },
  });

  // Remove the moved item from its current position
  const orderedItems = visibleItems.filter((item) => item.id !== moved.id);

  // Find the index of the moved item and the target item
  const movedIndex = visibleItems.findIndex((item) => item.id === moved.id);
  const targetIndex = visibleItems.findIndex((item) => item.id === target.id);

  // Determine the new index for the moved item
  let newIndex;
  if (movedIndex < targetIndex || alwaysInsertRight) {
    newIndex = targetIndex + 1; // Insert after the target item
  } else {
    newIndex = targetIndex; // Insert before the target item
  }

  // Insert the moved item at the new position
  orderedItems.splice(newIndex, 0, moved);

  // Now, we need to update all the items with their new sortIndex
  await prisma.$transaction(
    orderedItems.map((item, index) => {
      return prisma.promptVariant.update({
        where: {
          id: item.id,
        },
        data: {
          sortIndex: index,
        },
      });
    }),
  );
};
