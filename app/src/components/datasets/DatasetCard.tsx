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
import { RiDatabase2Line } from "react-icons/ri";
import { formatTimePast } from "~/utils/dayjs";
import Link from "next/link";
import { useRouter } from "next/router";
import { BsPlusSquare } from "react-icons/bs";
import { api } from "~/utils/api";
import { useHandledAsyncCallback } from "~/utils/hooks";
import { useAppStore } from "~/state/store";

type DatasetData = {
  name: string;
  numEntries: number;
  id: string;
  createdAt: Date;
  updatedAt: Date;
};

export const DatasetCard = ({ dataset }: { dataset: DatasetData }) => {
  return (
    <AspectRatio ratio={1.2} w="full">
      <VStack
        as={Link}
        href={{ pathname: "/data/[id]", query: { id: dataset.id } }}
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
          <Icon as={RiDatabase2Line} boxSize={4} />
          <Text fontWeight="bold">{dataset.name}</Text>
        </HStack>
        <HStack h="full" spacing={4} flex={1} align="center">
          <CountLabel label="Rows" count={dataset.numEntries} />
        </HStack>
        <HStack w="full" color="gray.500" fontSize="xs" textAlign="center">
          <Text flex={1}>Created {formatTimePast(dataset.createdAt)}</Text>
          <Divider h={4} orientation="vertical" />
          <Text flex={1}>Updated {formatTimePast(dataset.updatedAt)}</Text>
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

export const NewDatasetCard = () => {
  const router = useRouter();
  const selectedOrgId = useAppStore((s) => s.selectedOrgId);
  const createMutation = api.datasets.create.useMutation();
  const [createDataset, isLoading] = useHandledAsyncCallback(async () => {
    const newDataset = await createMutation.mutateAsync({ organizationId: selectedOrgId ?? "" });
    await router.push({ pathname: "/data/[id]", query: { id: newDataset.id } });
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
        onClick={createDataset}
      >
        <Icon as={isLoading ? Spinner : BsPlusSquare} boxSize={8} />
        <Text display={{ base: "none", md: "block" }} ml={2}>
          New Dataset
        </Text>
      </VStack>
    </AspectRatio>
  );
};

export const DatasetCardSkeleton = () => (
  <AspectRatio ratio={1.2} w="full">
    <VStack align="center" borderColor="gray.200" borderWidth={1} p={4} bg="gray.50">
      <SkeletonText noOfLines={1} w="80%" />
      <SkeletonText noOfLines={2} w="60%" />
      <SkeletonText noOfLines={1} w="80%" />
    </VStack>
  </AspectRatio>
);
