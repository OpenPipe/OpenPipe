import {
  Card,
  CardBody,
  HStack,
  Icon,
  VStack,
  Text,
  CardHeader,
  Divider,
  Box,
} from "@chakra-ui/react";
import { RiFlaskLine } from "react-icons/ri";
import { formatTimePast } from "~/utils/dayjs";
import { useRouter } from "next/router";

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
  const router = useRouter();
  return (
    <Box
      as={Card}
      variant="elevated"
      bg="gray.50"
      _hover={{ bg: "gray.100" }}
      transition="background 0.2s"
      cursor="pointer"
      onClick={(e) => {
        e.preventDefault();
        void router.push({ pathname: "/experiments/[id]", query: { id: exp.id } }, undefined, {
          shallow: true,
        });
      }}
    >
      <CardHeader>
        <HStack w="full">
          <Icon as={RiFlaskLine} boxSize={4} mr={2} />
          <Text>{exp.label}</Text>
        </HStack>
      </CardHeader>
      <CardBody>
        <HStack w="full" mb={8} spacing={4}>
          <CountLabel label="Variants" count={exp.promptVariantCount} />
          <Divider h={12} orientation="vertical" />
          <CountLabel label="Scenarios" count={exp.testScenarioCount} />
        </HStack>
        <HStack w="full" color="gray.500" fontSize="xs">
          <Text>Created {formatTimePast(exp.createdAt)}</Text>
          <Divider h={4} orientation="vertical" />
          <Text>Updated {formatTimePast(exp.updatedAt)}</Text>
        </HStack>
      </CardBody>
    </Box>
  );
};

const CountLabel = ({ label, count }: { label: string; count: number }) => {
  return (
    <VStack alignItems="flex-start">
      <Text color="gray.500" fontWeight="bold">
        {label}
      </Text>
      <Text fontSize="sm" color="gray.500">
        {count}
      </Text>
    </VStack>
  );
};
