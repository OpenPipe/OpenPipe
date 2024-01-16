import { useMemo, useState } from "react";
import {
  Icon,
  Popover,
  PopoverTrigger,
  PopoverContent,
  VStack,
  HStack,
  Button,
  Text,
  useDisclosure,
  Box,
  Switch,
} from "@chakra-ui/react";
import { FiEdit2 } from "react-icons/fi";
import { BsPlusSquare } from "react-icons/bs";
import { FaBalanceScale } from "react-icons/fa";
import { useRouter } from "next/router";

import { useDataset, useIsClientInitialized, useSelectedProject } from "~/utils/hooks";
import ActionButton from "~/components/ActionButton";
import { useVisibleEvalIds } from "./useVisibleEvalIds";
import AddEvalModal from "./AddEvalModal";

type Option = {
  key: string;
  label: string;
};

const EvalVisibilityDropdown = () => {
  const { visibleEvalIds, toggleEvalVisiblity } = useVisibleEvalIds();
  const dataset = useDataset().data;

  const popover = useDisclosure();
  const addEvalModal = useDisclosure();

  const editableEvalOptions = useMemo(
    () =>
      dataset?.datasetEvals
        .filter((datasetEval) => datasetEval.type !== "FIELD_COMPARISON")
        .map((datasetEval) => ({
          key: datasetEval.id,
          label: datasetEval.name,
        })) || [],
    [dataset?.datasetEvals],
  );

  const toggleableEvalOptions = useMemo(
    () =>
      dataset?.datasetEvals
        .filter((datasetEval) => datasetEval.type === "FIELD_COMPARISON")
        .map((datasetEval) => ({
          key: datasetEval.id,
          label: datasetEval.name,
        })) || [],
    [dataset?.datasetEvals],
  );

  const numAvailableEvals = editableEvalOptions.length + toggleableEvalOptions.length;

  const isClientInitialized = useIsClientInitialized();
  if (!isClientInitialized) return null;

  return (
    <>
      <Popover
        placement="bottom-start"
        isOpen={popover.isOpen}
        onOpen={popover.onOpen}
        onClose={popover.onClose}
      >
        <PopoverTrigger>
          <Box>
            <ActionButton
              label={
                "Evals" +
                (numAvailableEvals > 0 ? ` (${visibleEvalIds.length}/${numAvailableEvals})` : "")
              }
              icon={FaBalanceScale}
            />
          </Box>
        </PopoverTrigger>
        <PopoverContent boxShadow="0 0 40px 4px rgba(0, 0, 0, 0.1);" minW={0} w="auto">
          <VStack spacing={0} maxH={400} overflowY="auto">
            {editableEvalOptions?.map((option, index) => (
              <EditableEvalOption key={index} option={option} />
            ))}
            {toggleableEvalOptions?.map((option, index) => (
              <HStack
                key={index}
                as={Button}
                onClick={() => toggleEvalVisiblity(option.key)}
                w="full"
                minH={10}
                variant="ghost"
                justifyContent="space-between"
                fontWeight="semibold"
                borderRadius={0}
                colorScheme="blue"
                color="black"
                fontSize="sm"
                borderBottomWidth={1}
              >
                <Text mr={16}>{option.label}</Text>
                <Switch isChecked={visibleEvalIds.includes(option.key)} size="sm" />
              </HStack>
            ))}
            <HStack
              as={Button}
              w="full"
              minH={10}
              variant="ghost"
              justifyContent="space-between"
              fontWeight="semibold"
              borderRadius={0}
              colorScheme="orange"
              color="black"
              fontSize="sm"
              borderBottomWidth={1}
              onClick={addEvalModal.onOpen}
            >
              <Text mr={4}>Add new head-to-head eval</Text>
              <Icon as={BsPlusSquare} color="orange.400" boxSize={5} />
            </HStack>
          </VStack>
        </PopoverContent>
      </Popover>
      <AddEvalModal disclosure={addEvalModal} />
    </>
  );
};

const EditableEvalOption = ({ option }: { option: Option }) => {
  const { visibleEvalIds, toggleEvalVisiblity } = useVisibleEvalIds();

  const router = useRouter();

  const selectedProject = useSelectedProject().data;

  const [toggleHovered, setToggleHovered] = useState(false);
  return (
    <HStack
      as={Button}
      onClick={() => {
        if (!toggleHovered)
          void router.push({
            pathname: "/p/[projectSlug]/evals/[id]",
            query: { projectSlug: selectedProject?.slug || "", id: option.key },
          });
      }}
      w="full"
      minH={10}
      variant="ghost"
      justifyContent="space-between"
      fontWeight="semibold"
      borderRadius={0}
      colorScheme={toggleHovered ? "blue" : "gray"}
      color="black"
      fontSize="sm"
      borderBottomWidth={1}
    >
      <Text mr={16}>{option.label}</Text>
      <HStack>
        <Icon as={FiEdit2} color="gray.500" />
        <Switch
          isChecked={visibleEvalIds.includes(option.key)}
          onChange={() => toggleEvalVisiblity(option.key)}
          size="sm"
          onMouseEnter={() => setToggleHovered(true)}
          onMouseLeave={() => setToggleHovered(false)}
        />
      </HStack>
    </HStack>
  );
};

export default EvalVisibilityDropdown;
