import {
  Text,
  Button,
  HStack,
  Heading,
  Icon,
  Input,
  Stack,
  VStack,
  FormControl,
  FormLabel,
  Select,
  FormHelperText,
} from "@chakra-ui/react";
import { type Evaluation, EvaluationMatchType } from "@prisma/client";
import { useCallback, useState } from "react";
import { BsPencil, BsX } from "react-icons/bs";
import { api } from "~/utils/api";
import { useExperiment, useHandledAsyncCallback } from "~/utils/hooks";

type EvalValues = Pick<Evaluation, "name" | "matchString" | "matchType">;

export function EvaluationEditor(props: {
  evaluation: Evaluation | null;
  defaultName?: string;
  onSave: (id: string | undefined, vals: EvalValues) => void;
  onCancel: () => void;
}) {
  const [values, setValues] = useState<EvalValues>({
    name: props.evaluation?.name ?? props.defaultName ?? "",
    matchString: props.evaluation?.matchString ?? "",
    matchType: props.evaluation?.matchType ?? "CONTAINS",
  });

  return (
    <VStack borderTopWidth={1} borderColor="gray.200" py={4}>
      <HStack w="100%">
        <FormControl flex={1}>
          <FormLabel fontSize="sm">Evaluation Name</FormLabel>
          <Input
            size="sm"
            value={values.name}
            onChange={(e) => setValues((values) => ({ ...values, name: e.target.value }))}
          />
        </FormControl>
        <FormControl flex={1}>
          <FormLabel fontSize="sm">Match Type</FormLabel>
          <Select
            size="sm"
            value={values.matchType}
            onChange={(e) =>
              setValues((values) => ({
                ...values,
                matchType: e.target.value as EvaluationMatchType,
              }))
            }
          >
            {Object.values(EvaluationMatchType).map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </Select>
        </FormControl>
      </HStack>
      <FormControl>
        <FormLabel fontSize="sm">Match String</FormLabel>
        <FormHelperText>
          This string will be interpreted as a regex and checked against each model output.
        </FormHelperText>
        <Input
          size="sm"
          value={values.matchString}
          onChange={(e) => setValues((values) => ({ ...values, matchString: e.target.value }))}
        />
      </FormControl>
      <HStack alignSelf="flex-end">
        <Button size="sm" onClick={props.onCancel} colorScheme="gray">
          Cancel
        </Button>
        <Button
          size="sm"
          onClick={() => props.onSave(props.evaluation?.id, values)}
          colorScheme="blue"
        >
          Save
        </Button>
      </HStack>
    </VStack>
  );
}

export default function EditEvaluations() {
  const experiment = useExperiment();
  const evaluations =
    api.evaluations.list.useQuery({ experimentId: experiment.data?.id ?? "" }).data ?? [];

  const [editingId, setEditingId] = useState<string | null>(null);

  const utils = api.useContext();
  const createMutation = api.evaluations.create.useMutation();
  const updateMutation = api.evaluations.update.useMutation();

  const deleteMutation = api.evaluations.delete.useMutation();
  const [onDelete] = useHandledAsyncCallback(async (id: string) => {
    await deleteMutation.mutateAsync({ id });
    await utils.evaluations.list.invalidate();
    await utils.promptVariants.stats.invalidate();
  }, []);

  const [onSave] = useHandledAsyncCallback(async (id: string | undefined, vals: EvalValues) => {
    setEditingId(null);
    if (!experiment.data?.id) return;

    if (id) {
      await updateMutation.mutateAsync({
        id,
        updates: vals,
      });
    } else {
      await createMutation.mutateAsync({
        experimentId: experiment.data.id,
        ...vals,
      });
    }
    await utils.evaluations.list.invalidate();
    await utils.promptVariants.stats.invalidate();
  }, []);

  const onCancel = useCallback(() => {
    setEditingId(null);
  }, []);

  return (
    <Stack>
      <Heading size="sm">Evaluations</Heading>
      <Stack spacing={4}>
        <Text fontSize="sm">
          Evaluations allow you to compare prompt performance in an automated way.
        </Text>
        <Stack spacing={2}>
          {evaluations.map((evaluation) =>
            editingId == evaluation.id ? (
              <EvaluationEditor
                evaluation={evaluation}
                onSave={onSave}
                onCancel={onCancel}
                key={evaluation.id}
              />
            ) : (
              <HStack
                fontSize="sm"
                borderTopWidth={1}
                borderColor="gray.200"
                py={4}
                align="center"
                key={evaluation.id}
              >
                <Text fontWeight="bold">{evaluation.name}</Text>
                <Text flex={1}>
                  {evaluation.matchType}: &quot;{evaluation.matchString}&quot;
                </Text>
                <Button
                  variant="unstyled"
                  color="gray.400"
                  height="unset"
                  width="unset"
                  minW="unset"
                  onClick={() => setEditingId(evaluation.id)}
                  _hover={{
                    color: "gray.800",
                    cursor: "pointer",
                  }}
                >
                  <Icon as={BsPencil} boxSize={4} />
                </Button>
                <Button
                  variant="unstyled"
                  color="gray.400"
                  height="unset"
                  width="unset"
                  minW="unset"
                  onClick={() => onDelete(evaluation.id)}
                  _hover={{
                    color: "gray.800",
                    cursor: "pointer",
                  }}
                >
                  <Icon as={BsX} boxSize={6} />
                </Button>
              </HStack>
            )
          )}
          {editingId == null && (
            <Button
              onClick={() => setEditingId("new")}
              alignSelf="flex-start"
              size="sm"
              mt={4}
              colorScheme="blue"
            >
              Add Evaluation
            </Button>
          )}
          {editingId == "new" && (
            <EvaluationEditor
              evaluation={null}
              defaultName={`Eval${evaluations.length + 1}`}
              onSave={onSave}
              onCancel={onCancel}
            />
          )}
        </Stack>
      </Stack>
    </Stack>
  );
}
