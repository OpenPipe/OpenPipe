import {
  Card,
  CardBody,
  HStack,
  Icon,
  VStack,
  Text,
  CardHeader,
  Divider,
  Spinner,
  AspectRatio,
} from "@chakra-ui/react";
import { RiFlaskLine } from "react-icons/ri";
import { formatTimePast } from "~/utils/dayjs";
import Link from "next/link";
import { useRouter } from "next/router";
import { BsPlusSquare } from "react-icons/bs";
import { api } from "~/utils/api";
import { useHandledAsyncCallback } from "~/utils/hooks";

type ExperimentData = {
  testScenarioCount: number;
  promptVariantCount: number;
  id: string;
  label: string;
  sortIndex: number;
  createdAt: Date;
  updatedAt: Date;
};

export const ExperimentCard = ({ exp }: { exp: ExperimentData }) => {
  return (
    <Card
      as={Link}
      bg="gray.50"
      _hover={{ bg: "gray.100" }}
      transition="background 0.2s"
      cursor="pointer"
      href={{ pathname: "/experiments/[id]", query: { id: exp.id } }}
    >
      <CardHeader>
        <HStack w="full" color="gray.700" justify="center">
          <Icon as={RiFlaskLine} boxSize={4} />
          <Text fontWeight="bold">{exp.label}</Text>
        </HStack>
      </CardHeader>
      <CardBody>
        <HStack w="full" mb={8} spacing={4}>
          <CountLabel label="Variants" count={exp.promptVariantCount} />
          <Divider h={12} orientation="vertical" />
          <CountLabel label="Scenarios" count={exp.testScenarioCount} />
        </HStack>
        <HStack w="full" color="gray.500" fontSize="xs" textAlign="center">
          <Text flex={1}>Created {formatTimePast(exp.createdAt)}</Text>
          <Divider h={4} orientation="vertical" />
          <Text flex={1}>Updated {formatTimePast(exp.updatedAt)}</Text>
        </HStack>
      </CardBody>
    </Card>
  );
};

const CountLabel = ({ label, count }: { label: string; count: number }) => {
  return (
    <VStack alignItems="center" flex={1}>
      <Text color="gray.500" fontWeight="bold">
        {label}
      </Text>
      <Text fontSize="sm" color="gray.500">
        {count}
      </Text>
    </VStack>
  );
};

export const NewExperimentCard = () => {
  const router = useRouter();
  const utils = api.useContext();
  const createMutation = api.experiments.create.useMutation();
  const [createExperiment, isLoading] = useHandledAsyncCallback(async () => {
    const newExperiment = await createMutation.mutateAsync({ label: "New Experiment" });
    await router.push({ pathname: "/experiments/[id]", query: { id: newExperiment.id } });
  }, [createMutation, router]);

  return (
    <Card _hover={{ cursor: "pointer", bgColor: "gray.50" }} onClick={createExperiment}>
      <AspectRatio ratio={1} w="full">
        <VStack align="center" justify="center" h="100%" spacing={6}>
          <Icon as={isLoading ? Spinner : BsPlusSquare} boxSize={8} />
          <Text display={{ base: "none", md: "block" }} ml={2}>
            New Experiment
          </Text>
        </VStack>
      </AspectRatio>
    </Card>
  );
};
