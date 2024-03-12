import { type DatasetEntryOutput } from "@prisma/client";
import { VStack, Text } from "@chakra-ui/react";

import { chatCompletionMessage } from "~/types/shared.types";
import { FormattedJson } from "../FormattedJson";
import FormattedMessage from "./FormattedMessage";

export const PotentiallyPendingFormattedOutput = ({
  output,
  preferJson,
  includeField,
}: {
  output: DatasetEntryOutput["output"];
  preferJson: boolean;
  includeField?: boolean;
}) => {
  if (output) {
    return <FormattedOutput output={output} preferJson={preferJson} includeField={includeField} />;
  }
  return <Text color="gray.500">Pending</Text>;
};

const FormattedOutput = ({
  output,
  preferJson,
  includeField,
}: {
  output: DatasetEntryOutput["output"];
  preferJson: boolean;
  includeField?: boolean;
}) => {
  const parsed = chatCompletionMessage.safeParse(output);

  if (!parsed.success) {
    return (
      <VStack>
        <Text color="red.500">Unable to parse output</Text>
        <FormattedJson json={output} />
      </VStack>
    );
  }

  return (
    <FormattedMessage message={parsed.data} preferJson={preferJson} includeField={includeField} />
  );
};

export default FormattedOutput;
