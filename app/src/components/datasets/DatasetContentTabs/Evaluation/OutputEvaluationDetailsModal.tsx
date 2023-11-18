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
  Text,
  VStack,
} from "@chakra-ui/react";
import { FaBalanceScale } from "react-icons/fa";
import ColoredPercent from "~/components/ColoredPercent";

import { api } from "~/utils/api";
import { useAppStore } from "~/state/store";

const OutputEvaluationDetailsModal = () => {
  const comparisonCriteria = useAppStore((state) => state.evaluationsSlice.comparisonCriteria);
  const setComparisonCriteria = useAppStore(
    (state) => state.evaluationsSlice.setComparisonCriteria,
  );
  const datasetEvalIdToEdit = useAppStore((state) => state.evaluationsSlice.datasetEvalIdToEdit);
  const setDatasetEvalIdToEdit = useAppStore(
    (state) => state.evaluationsSlice.setDatasetEvalIdToEdit,
  );

  const { data } = api.datasetEvals.getComparisonDetails.useQuery(
    {
      datasetEvalId: comparisonCriteria?.datasetEvalId ?? "",
      modelId: comparisonCriteria?.modelId ?? "",
      datasetEntryId: comparisonCriteria?.datasetEntryId ?? "",
    },
    {
      enabled: !!comparisonCriteria,
    },
  );

  const isOpen = !!comparisonCriteria && !datasetEvalIdToEdit;
  const onClose = () => {
    setComparisonCriteria(null);
  };

  if (!data) {
    return null;
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl">
      <ModalOverlay />
      <ModalContent w={1200}>
        <ModalHeader>
          <HStack>
            <Icon as={FaBalanceScale} />
            <Text>Head-To-Head Comparison</Text>
          </HStack>
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody maxW="unset">
          <VStack align="flex-start" spacing={4}>
            <Text>{data.datasetEval.name}</Text>
            <Text>{data.datasetEval.instructions}</Text>
            {data.comparisons.map((comparison) => (
              <VStack key={comparison.comparisonModelId} align="flex-start" spacing={2}>
                <Text>{comparison.comparisonModelId}</Text>
                <HStack>
                  <Text>Our Score</Text>
                  <ColoredPercent value={comparison.score} />
                </HStack>
                <HStack>
                  <Text>Their Score</Text>
                  <ColoredPercent value={comparison.comparisonScore} />
                </HStack>
              </VStack>
            ))}
          </VStack>
        </ModalBody>

        <ModalFooter>
          <HStack>
            <Button
              colorScheme="blue"
              onClick={() => setDatasetEvalIdToEdit(data.datasetEval.id)}
              minW={24}
            >
              Edit Eval
            </Button>
            <Button colorScheme="orange" onClick={onClose}>
              Done
            </Button>
          </HStack>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default OutputEvaluationDetailsModal;
