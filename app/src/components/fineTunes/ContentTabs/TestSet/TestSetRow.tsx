import { Th, Td, Thead, Tr, Text, VStack } from "@chakra-ui/react";
import { type ChatCompletionMessage } from "openai/resources/chat";
import SyntaxHighlighter from "react-syntax-highlighter";
import DiffViewer, { DiffMethod } from "react-diff-viewer";
import Prism from "prismjs";
import "prismjs/components/prism-javascript";
import "prismjs/themes/prism.css"; // choose a theme you like

import { type RouterOutputs } from "~/utils/api";

export const TableHeader = () => {
  return (
    <Thead>
      <Tr>
        <Th w="30%">Input</Th>
        <Th w="35%">Original Output</Th>
        <Th>Fine-Tuned Model Output</Th>
      </Tr>
    </Thead>
  );
};

type TestingEntry = RouterOutputs["datasetEntries"]["listTestingEntries"]["entries"][number];

const highlightSyntax = (str: string) => {
  let highlighted;
  try {
    highlighted = Prism.highlight(str, Prism.languages.json as Prism.Grammar, "json");
  } catch (e) {
    console.error("Error highlighting:", e);
    highlighted = str;
  }
  return <pre style={{ display: "inline" }} dangerouslySetInnerHTML={{ __html: highlighted }} />;
};

const TestSetRow = ({
  prunedInput,
  output,
  datasetEntry: { output: originalOutput },
  errorMessage,
  viewAsDiff = true,
}: {
  prunedInput: TestingEntry["prunedInput"];
  output: TestingEntry["output"];
  outputTokens: number | null;
  datasetEntry: TestingEntry["datasetEntry"];
  errorMessage?: string;
  viewAsDiff?: boolean;
}) => {
  let outputIsJson = false;
  let parsedOutput = null;
  try {
    parsedOutput = JSON.parse(output) as unknown as ChatCompletionMessage;
    outputIsJson = true;
  } catch (e) {
    // ignore
  }

  return (
    <Tr
      alignItems="flex-start"
      sx={{
        td: { verticalAlign: "top" },
      }}
    >
      <Td borderRight="1px solid">
        <FormattedInput prunedInput={prunedInput} />
      </Td>
      {viewAsDiff ? (
        <Td colSpan={2}>
          <DiffViewer
            oldValue={JSON.stringify(originalOutput, null, 2)}
            newValue={JSON.stringify(output, null, 2)}
            splitView={true} // You can make this responsive as per your need
            hideLineNumbers
            disableWordDiff={true}
            compareMethod={DiffMethod.CHARS}
            renderContent={highlightSyntax}
            showDiffOnly={false}
          />
        </Td>
      ) : (
        <>
          <Td borderRight="1px solid">
            <FormattedOutput output={originalOutput} />
          </Td>
          <Td>
            <FormattedOutput output={output} errorMessage={errorMessage} />
          </Td>
        </>
      )}
    </Tr>
  );
};

const FormattedInput = ({ prunedInput }: { prunedInput: TestingEntry["prunedInput"] }) => {
  let parsedInput = null;
  try {
    parsedInput = JSON.parse(prunedInput) as unknown as ChatCompletionMessage[];
  } catch (e) {}

  if (!parsedInput) return <Text>{prunedInput}</Text>;

  return (
    <VStack alignItems="flex-start" spacing={8}>
      {parsedInput.map((message, index) => (
        <VStack key={index} alignItems="flex-start" w="full">
          <Text fontWeight="bold" color="gray.500">
            {message.role}
          </Text>
          <FormattedMessage message={message} />
        </VStack>
      ))}
    </VStack>
  );
};

const FormattedOutput = ({
  output,
  errorMessage,
}: {
  output: TestingEntry["output"];
  errorMessage?: string | null;
}) => {
  if (errorMessage) {
    return <Text color="red.500">{errorMessage}</Text>;
  }

  if (!output) return <Text color="gray.500">Pending</Text>;

  const message = output as unknown as ChatCompletionMessage;
  return <FormattedMessage message={message} />;
};

const stringifyMsg = (message: ChatCompletionMessage, sortKeys: boolean) => {
  if (message.function_call) {
    const { name, arguments: args } = message.function_call;
    try {
      const parsedArgs: object = args ? JSON.parse(args) : {};

      return `${name}\n${JSON.stringify(
        parsedArgs,
        sortKeys ? Object.keys(parsedArgs).sort() : null,
        4,
      )}`;
    } catch (e) {
      return `${name}\n${args}`;
    }
  }
};

const FormattedMessage = ({ message }: { message: ChatCompletionMessage }) => {
  if (message.function_call) {
    return (
      <VStack alignItems="flex-start" whiteSpace="pre-wrap">
        <SyntaxHighlighter
          customStyle={{
            overflowX: "unset",
            width: "100%",
            flex: 1,
            backgroundColor: "transparent",
          }}
          language="json"
          lineProps={{
            style: { wordBreak: "break-all", whiteSpace: "pre-wrap" },
          }}
          wrapLines
        >
          {stringifyMsg(message.function_call, false)}
        </SyntaxHighlighter>
      </VStack>
    );
  }
  return <Text>{message.content}</Text>;
};

export default TestSetRow;
