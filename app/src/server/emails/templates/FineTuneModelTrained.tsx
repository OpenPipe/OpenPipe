import * as React from "react";
import { Button, EmailLayout, Header, Highlight, Text } from "./layout";

interface Props {
  fineTuneModelName: string;
  baseModel: string;
  fineTuneModelLink: string;
}

const FineTuneModelTrained = ({ fineTuneModelName, baseModel, fineTuneModelLink }: Props) => {
  const previewText = `Fine-tune model has been successfully trained!`;

  return (
    <EmailLayout previewText={previewText}>
      <Header>{previewText}</Header>
      <Highlight>
        <Text>
          Fine-tune ID: <strong>{fineTuneModelName}</strong>
        </Text>
        <Text>
          Base model: <strong>{baseModel}</strong>
        </Text>
      </Highlight>
      <Text>You can start using the new fine-tuned model now.</Text>

      <Button href={fineTuneModelLink}>Details</Button>
    </EmailLayout>
  );
};

FineTuneModelTrained.PreviewProps = {
  fineTuneModelName: "openpipe:mix8",
  baseModel: "MIXTRAL 8X7B INSTRUCT",
  fineTuneModelLink: "#modelLink",
} as Props;

export default FineTuneModelTrained;
