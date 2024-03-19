import { useMemo } from "react";

import { type RouterOutputs } from "~/utils/api";
import { useFineTune, useSelectedProject, useTrainingEntries } from "~/utils/hooks";
import CopiableCodeTabs, { type CodeTab } from "./CopiableCodeTabs";
import { env } from "~/env.mjs";

const baseTabs: CodeTab[] = [
  {
    title: "cURL",
    language: "bash",
    code: `curl --request POST \\
--url ${env.NEXT_PUBLIC_HOST}/api/v1/chat/completions \\
--header 'Authorization: Bearer {{TEMPLATED_OPENPIPE_API_KEY}}' \\
--header 'Content-Type: application/json' \\
--header 'op-log-request: true' \\
--data '{
"model": "openpipe:{{FINE_TUNE_MODEL_SLUG}}",
"messages": {{TEMPLATED_MESSAGES}},
"tool_choice": {{TEMPLATED_TOOL_CHOICE}},
"tools": {{TEMPLATED_TOOLS}},
"temperature": 0
}'`,
  },
  {
    title: "Python",
    language: "python",
    code: `# pip install openpipe

from openpipe import OpenAI

client = OpenAI(
  openpipe={"api_key": "{{TEMPLATED_OPENPIPE_API_KEY}}"}
)

completion = client.chat.completions.create(
    model="openpipe:{{FINE_TUNE_MODEL_SLUG}}",
    messages={{TEMPLATED_MESSAGES}},
    tool_choice={{TEMPLATED_TOOL_CHOICE}},
    tools={{TEMPLATED_TOOLS}},
    temperature=0,
    openpipe={
        "tags": {
            "prompt_id": "counting",
            "any_key": "any_value"
        }
    },
)

print(completion.choices[0].message)`,
  },
  {
    title: "JavaScript",
    language: "javascript",
    code: `// npm install openpipe

import OpenAI from "openpipe/openai";

const client = new OpenAI({
    openpipe: {
        apiKey: "{{TEMPLATED_OPENPIPE_API_KEY}}",
    }
});

const completion = await client.chat.completions.create({
    model: "openpipe:{{FINE_TUNE_MODEL_SLUG}}",
    messages: {{TEMPLATED_MESSAGES}},
    tool_choice: {{TEMPLATED_TOOL_CHOICE}},
    tools: {{TEMPLATED_TOOLS}},
    temperature: 0,
});

console.log(completion?.choices[0]?.message);
`,
  },
];

const templateTabs = (
  apiKey: string,
  modelSlug: string,
  entry?: RouterOutputs["fineTunes"]["listTrainingEntries"]["entries"][number],
): CodeTab[] => {
  let formattedMessages = "";

  if (entry?.messages) {
    const messages = entry.messages || [
      {
        role: "system",
        content: "Count to 10",
      },
    ];
    // add a tab to all but the first line
    formattedMessages = JSON.stringify(messages, null, 4);
  }

  const formattedToolChoice = JSON.stringify(entry?.tool_choice ?? "auto", null, 4);

  const formattedTools = JSON.stringify(entry?.tools ?? []);

  return baseTabs.map((tab) => {
    let templatedCode = tab.code;

    // if tools is empty, remove the tools line
    if (!entry?.tools?.length) {
      templatedCode = templatedCode.replace(/.*{{TEMPLATED_TOOL_CHOICE}}.*\n/g, "");
      templatedCode = templatedCode.replace(/.*{{TEMPLATED_TOOLS}}.*\n/g, "");
    }

    const tabFormattedMessages =
      tab.language === "bash"
        ? formattedMessages.replace(/'/g, `'"'"'`)
        : formattedMessages.replace(/\n/g, "\n    ");
    const tabFormattedToolChoice =
      tab.language === "bash"
        ? formattedToolChoice.replace(/'/g, `'"'"'`)
        : formattedToolChoice.replace(/\n/g, "\n    ");
    const tabFormattedTools =
      tab.language === "bash" ? formattedTools.replace(/'/g, `'"'"'`) : formattedTools;

    return {
      ...tab,
      code: templatedCode
        .replace("{{TEMPLATED_OPENPIPE_API_KEY}}", apiKey)
        .replace("{{FINE_TUNE_MODEL_SLUG}}", modelSlug)
        .replace("{{TEMPLATED_TOOL_CHOICE}}", tabFormattedToolChoice)
        .replace("{{TEMPLATED_TOOLS}}", tabFormattedTools)
        .replace("{{TEMPLATED_MESSAGES}}", tabFormattedMessages),
    };
  });
};

const InferenceCodeTabs = () => {
  const project = useSelectedProject().data;
  const fineTune = useFineTune().data;
  const datasetEntries = useTrainingEntries().data;

  const apiKey = project?.openpipeFullAccessKey ?? project?.openpipeReadOnlyKey ?? "";

  const templatedTabs = useMemo(() => {
    const entry = datasetEntries?.entries[0];

    return templateTabs(apiKey, fineTune?.slug || "", entry);
  }, [apiKey, fineTune?.slug, datasetEntries?.entries]);

  return <CopiableCodeTabs tabs={templatedTabs} />;
};

export default InferenceCodeTabs;
