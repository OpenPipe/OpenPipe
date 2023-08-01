import {
  Button,
  HStack,
  Icon,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Spinner,
  Text,
  VStack,
} from "@chakra-ui/react";
import { useEffect, useState } from "react";
import { BsFileTextFill } from "react-icons/bs";
import { isEqual } from "lodash-es";

import { api } from "~/utils/api";
import {
  useScenario,
  useHandledAsyncCallback,
  useExperiment,
  useExperimentAccess,
} from "~/utils/hooks";
import { FloatingLabelInput } from "./FloatingLabelInput";

export const ScenarioEditorModal = ({
  scenarioId,
  initialValues,
  onClose,
}: {
  scenarioId: string;
  initialValues: Record<string, string>;
  onClose: () => void;
}) => {
  const utils = api.useContext();
  const experiment = useExperiment();
  const { canModify } = useExperimentAccess();
  const scenario = useScenario(scenarioId);

  const savedValues = scenario.data?.variableValues as Record<string, string>;

  const [values, setValues] = useState<Record<string, string>>(initialValues);

  useEffect(() => {
    if (savedValues) setValues(savedValues);
  }, [savedValues]);


  const hasChanged = !isEqual(savedValues, values);

  const mutation = api.scenarios.replaceWithValues.useMutation();

  const [onSave, saving] = useHandledAsyncCallback(async () => {
    await mutation.mutateAsync({
      id: scenarioId,
      values,
    });
    await utils.scenarios.list.invalidate();
  }, [mutation, values]);

  console.log("scenario", scenario);

  const vars = api.templateVars.list.useQuery({ experimentId: experiment.data?.id ?? "" });
  const variableLabels = vars.data?.map((v) => v.label) ?? [];

  return (
    <Modal
      isOpen
      onClose={onClose}
      size={{ base: "xl", sm: "2xl", md: "3xl", lg: "5xl", xl: "7xl" }}
    >
      <ModalOverlay />
      <ModalContent w={1200}>
        <ModalHeader>
          <HStack>
            <Icon as={BsFileTextFill} />
            <Text>Scenario</Text>
          </HStack>
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody maxW="unset">
          <VStack spacing={8}>
            {values &&
              variableLabels.map((key) => {
                const value = values[key] ?? "";
                return (
                  <FloatingLabelInput
                    key={key}
                    label={key}
                    isDisabled={!canModify}
                    _disabled={{ opacity: 1 }}
                    style={{ width: "100%" }}
                    value={value}
                    onChange={(e) => {
                      setValues((prev) => ({ ...prev, [key]: e.target.value }));
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                        e.preventDefault();
                        e.currentTarget.blur();
                        onSave();
                      }
                    }}
                  />
                );
              })}
          </VStack>
        </ModalBody>

        <ModalFooter>
          {canModify && (
            <HStack>
              <Button
                colorScheme="gray"
                onClick={() => setValues(savedValues)}
                minW={24}
                isDisabled={!hasChanged}
              >
                <Text>Reset</Text>
              </Button>
              <Button colorScheme="blue" onClick={onSave} minW={24} isDisabled={!hasChanged}>
                {saving ? <Spinner boxSize={4} /> : <Text>Save</Text>}
              </Button>
            </HStack>
          )}
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
