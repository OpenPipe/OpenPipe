import type { ChatCompletionMessageParam } from "openai/resources/chat";

import { kysely } from "../db";
import { typedDatasetEntry } from "~/types/dbColumns.types";
import {
  convertFunctionCall,
  convertFunctions,
  convertMessages,
  convertFunctionMessageToToolCall,
} from "../utils/convertFunctionCalls";

await kysely.transaction().execute(async (trx) => {
  // Select entries that need updating
  const entriesToUpdate = await trx
    .selectFrom("DatasetEntry as de")
    .select([
      "de.id as id",
      "de.messages as messages",
      "de.output as output",
      "de.function_call as function_call",
      "de.functions as functions",
    ])
    .execute();

  console.log(`found ${entriesToUpdate.length} entries to update`);

  let numMalformedEntries = 0;
  // Update each entry
  for (const entry of entriesToUpdate) {
    let typedEntry;
    try {
      typedEntry = typedDatasetEntry(entry);
    } catch (e) {
      console.log("entry is", entry);
      numMalformedEntries++;
      continue;
    }

    const tool_choice = convertFunctionCall(typedEntry.function_call);

    const tools = convertFunctions(typedEntry.functions);

    const messages = convertMessages(typedEntry.messages);
    const output = typedEntry.output ? convertFunctionMessageToToolCall(typedEntry.output) : null;

    await trx
      .updateTable("DatasetEntry")
      .set({
        tool_choice: JSON.stringify(tool_choice),
        tools: JSON.stringify(tools),
        messages: JSON.stringify(messages),
        output: JSON.stringify(output),
      })
      .where("id", "=", entry.id)
      .execute();
  }

  console.log(`found ${numMalformedEntries} malformed entries`);

  console.log("updated entries");

  const testEntriesToUpdate = await trx
    .selectFrom("FineTuneTestingEntry as ftte")
    .select(["ftte.id as id", "ftte.output as output"])
    .where("output", "is not", null)
    .execute();

  console.log(`found ${testEntriesToUpdate.length} test entries to update`);

  for (const testingEntry of testEntriesToUpdate) {
    const testingEntryOutput = testingEntry.output
      ? convertFunctionMessageToToolCall(
          testingEntry.output as unknown as ChatCompletionMessageParam,
        )
      : undefined;

    await trx
      .updateTable("FineTuneTestingEntry")
      .set({
        output: JSON.stringify(testingEntryOutput),
      })
      .where("id", "=", testingEntry.id)
      .execute();
  }

  console.log("updated test entries");

  console.log("done");
});
