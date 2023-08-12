import { Box, Flex, Icon, Spinner } from "@chakra-ui/react";
import { BsPlus } from "react-icons/bs";
import { Text } from "@chakra-ui/react";
import { api } from "~/utils/api";
import {
  useExperiment,
  useExperimentAccess,
  useHandledAsyncCallback,
  useVisibleScenarioIds,
} from "~/utils/hooks";
import { cellPadding } from "../constants";
import { ActionButton } from "./ScenariosHeader";

export default function AddVariantButton() {
  const experiment = useExperiment();
  const mutation = api.promptVariants.create.useMutation();
  const utils = api.useContext();
  const visibleScenarios = useVisibleScenarioIds();

  const [onClick, loading] = useHandledAsyncCallback(async () => {
    if (!experiment.data) return;
    await mutation.mutateAsync({
      experimentId: experiment.data.id,
      streamScenarios: visibleScenarios,
    });
    await utils.promptVariants.list.invalidate();
  }, [mutation]);

  const { canModify } = useExperimentAccess();
  if (!canModify) return <Box w={cellPadding.x} />;

  return (
    <Flex w="100%" justifyContent="flex-end">
      <ActionButton
        onClick={onClick}
        py={7}
        leftIcon={<Icon as={loading ? Spinner : BsPlus} boxSize={6} mr={loading ? 1 : 0} />}
      >
        <Text display={{ base: "none", md: "flex" }}>Add Variant</Text>
      </ActionButton>
    </Flex>
  );
}
