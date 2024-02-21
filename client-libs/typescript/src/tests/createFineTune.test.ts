import { test, expect } from "vitest";
import { OPENPIPE_BASE_URL, OPENPIPE_API_KEY } from "../testConfig";

import OpenPipe from "../client";

test.skip("creates a fine tune", async () => {
  const client = new OpenPipe({ apiKey: OPENPIPE_API_KEY, baseUrl: OPENPIPE_BASE_URL });

  const dataset = await client.unstableDatasetCreate({
    name: "Test Dataset",
  });

  const entry = {
    messages: [
      {
        role: "user",
        content: "Count to 7",
      },
      {
        role: "assistant",
        content: "1, 2, 3, 4, 5, 6, 7",
      },
    ],
    split: "TRAIN",
  };

  const entries = Array(10).fill(entry);
  await client.unstableDatasetEntryCreate({
    datasetId: dataset.id,
    entries,
  });
  const fineTune = await client.unstableFinetuneCreate({
    datasetId: dataset.id,
    slug: "test-fine-tune3",
    baseModel: "OpenPipe/mistral-ft-optimized-1227",
  });

  const createdFineTune = await client.unstableFinetuneGet(fineTune.id);

  console.log(`Status: ${createdFineTune.status}`);
});
