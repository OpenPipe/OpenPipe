import { type DatasetEntryOutput } from "@prisma/client";
import { VStack, Text } from "@chakra-ui/react";

import { chatCompletionMessage } from "~/types/shared.types";
import { FormattedJson } from "../FormattedJson";
import FormattedMessage from "./FormattedMessage";

const FormattedOutput = ({
  output,
  preferJson,
}: {
  output: DatasetEntryOutput["output"];
  preferJson: boolean;
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

  return <FormattedMessage message={parsed.data} preferJson={preferJson} />;
};

export default FormattedOutput;
