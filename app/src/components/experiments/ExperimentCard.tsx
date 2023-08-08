import {
  HStack,
  Icon,
  VStack,
  Text,
  Divider,
  Spinner,
  AspectRatio,
  SkeletonText,
} from "@chakra-ui/react";
import { RiFlaskLine } from "react-icons/ri";
import { formatTimePast } from "~/utils/dayjs";
import Link from "next/link";
import { useRouter } from "next/router";
import { BsPlusSquare } from "react-icons/bs";
import { api } from "~/utils/api";
import { useHandledAsyncCallback } from "~/utils/hooks";
import { useAppStore } from "~/state/store";

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
    <AspectRatio ratio={1.2} w="full">
      <VStack
        as={Link}
        href={{ pathname: "/experiments/[id]", query: { id: exp.id } }}
        bg="gray.50"
        _hover={{ bg: "gray.100" }}
        transition="background 0.2s"
        cursor="pointer"
        borderColor="gray.200"
        borderWidth={1}
        p={4}
        justify="space-between"
      >
        <HStack w="full" color="gray.700" justify="center">
          <Icon as={RiFlaskLine} boxSize={4} />
          <Text fontWeight="bold">{exp.label}</Text>
        </HStack>
        <HStack h="full" spacing={4} flex={1} align="center">
          <CountLabel label="Variants" count={exp.promptVariantCount} />
          <Divider h={12} orientation="vertical" />
          <CountLabel label="Scenarios" count={exp.testScenarioCount} />
        </HStack>
        <HStack w="full" color="gray.500" fontSize="xs" textAlign="center">
          <Text flex={1}>Created {formatTimePast(exp.createdAt)}</Text>
          <Divider h={4} orientation="vertical" />
          <Text flex={1}>Updated {formatTimePast(exp.updatedAt)}</Text>
        </HStack>
      </VStack>
    </AspectRatio>
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
  const selectedOrgId = useAppStore((s) => s.selectedOrgId);
  const createMutation = api.experiments.create.useMutation();
  const [createExperiment, isLoading] = useHandledAsyncCallback(async () => {
    const newExperiment = await createMutation.mutateAsync({
      organizationId: selectedOrgId ?? "",
    });
    await router.push({
      pathname: "/experiments/[id]",
      query: { id: newExperiment.id },
    });
  }, [createMutation, router, selectedOrgId]);

  return (
    <AspectRatio ratio={1.2} w="full">
      <VStack
        align="center"
        justify="center"
        _hover={{ cursor: "pointer", bg: "gray.50" }}
        transition="background 0.2s"
        cursor="pointer"
        borderColor="gray.200"
        borderWidth={1}
        p={4}
        onClick={createExperiment}
      >
        <Icon as={isLoading ? Spinner : BsPlusSquare} boxSize={8} />
        <Text display={{ base: "none", md: "block" }} ml={2}>
          New Experiment
        </Text>
      </VStack>
    </AspectRatio>
  );
};

export const ExperimentCardSkeleton = () => (
  <AspectRatio ratio={1.2} w="full">
    <VStack align="center" borderColor="gray.200" borderWidth={1} p={4} bg="gray.50">
      <SkeletonText noOfLines={1} w="80%" />
      <SkeletonText noOfLines={2} w="60%" />
      <SkeletonText noOfLines={1} w="80%" />
    </VStack>
  </AspectRatio>
);
