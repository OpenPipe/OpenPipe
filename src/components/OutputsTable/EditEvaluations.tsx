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
import { type Evaluation, EvalType } from "@prisma/client";
import { useCallback, useState } from "react";
import { BsPencil, BsX } from "react-icons/bs";
import { api } from "~/utils/api";
import { useExperiment, useHandledAsyncCallback } from "~/utils/hooks";

type EvalValues = Pick<Evaluation, "label" | "value" | "evalType">;

export function EvaluationEditor(props: {
  evaluation: Evaluation | null;
  defaultName?: string;
  onSave: (id: string | undefined, vals: EvalValues) => void;
  onCancel: () => void;
}) {
  const [values, setValues] = useState<EvalValues>({
    label: props.evaluation?.label ?? props.defaultName ?? "",
    value: props.evaluation?.value ?? "",
    evalType: props.evaluation?.evalType ?? "CONTAINS",
  });

  return (
    <VStack borderTopWidth={1} borderColor="gray.200" py={4}>
      <HStack w="100%">
        <FormControl flex={1}>
          <FormLabel fontSize="sm">Evaluation Name</FormLabel>
          <Input
            size="sm"
            value={values.label}
            onChange={(e) => setValues((values) => ({ ...values, name: e.target.value }))}
          />
        </FormControl>
        <FormControl flex={1}>
          <FormLabel fontSize="sm">Match Type</FormLabel>
          <Select
            size="sm"
            value={values.evalType}
            onChange={(e) =>
              setValues((values) => ({
                ...values,
                evalType: e.target.value as EvalType,
              }))
            }
          >
            {Object.values(EvalType).map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </Select>
        </FormControl>
      </HStack>
      <FormControl>
        <FormLabel fontSize="sm">Match String</FormLabel>
        <Input
          size="sm"
          value={values.value}
          onChange={(e) => setValues((values) => ({ ...values, value: e.target.value }))}
        />
        <FormHelperText>
          This string will be interpreted as a regex and checked against each model output.
        </FormHelperText>
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
                <Text fontWeight="bold">{evaluation.label}</Text>
                <Text flex={1}>
                  {evaluation.evalType}: &quot;{evaluation.value}&quot;
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
            ),
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
