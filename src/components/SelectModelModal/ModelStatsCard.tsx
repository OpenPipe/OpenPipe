import {
  VStack,
  Text,
  HStack,
  type StackProps,
  GridItem,
  SimpleGrid,
  Link,
} from "@chakra-ui/react";
import { modelStats } from "~/modelProviders/modelStats";
import { type SupportedModel } from "~/server/types";

export const ModelStatsCard = ({ label, model }: { label: string; model: SupportedModel }) => {
  const stats = modelStats[model];
  return (
    <VStack w="full" align="start">
      <Text fontWeight="bold" fontSize="sm" textTransform="uppercase">
        {label}
      </Text>

      <VStack w="full" spacing={6} bgColor="gray.100" p={4} borderRadius={4}>
        <HStack w="full" align="flex-start">
          <Text flex={1} fontSize="lg">
            <Text as="span" color="gray.600">
              {stats.provider} /{" "}
            </Text>
            <Text as="span" fontWeight="bold" color="gray.900">
              {model}
            </Text>
          </Text>
          <Link
            href={stats.learnMoreUrl}
            isExternal
            color="blue.500"
            fontWeight="bold"
            fontSize="sm"
            ml={2}
          >
            Learn More
          </Link>
        </HStack>
        <SimpleGrid
          w="full"
          justifyContent="space-between"
          alignItems="flex-start"
          fontSize="sm"
          columns={{ base: 2, md: 4 }}
        >
          <SelectedModelLabeledInfo label="Context" info={stats.contextLength} />
          <SelectedModelLabeledInfo
            label="Input"
            info={
              <Text>
                ${(stats.promptTokenPrice * 1000).toFixed(3)}
                <Text color="gray.500"> / 1K tokens</Text>
              </Text>
            }
          />
          <SelectedModelLabeledInfo
            label="Output"
            info={
              <Text>
                ${(stats.promptTokenPrice * 1000).toFixed(3)}
                <Text color="gray.500"> / 1K tokens</Text>
              </Text>
            }
          />
          <SelectedModelLabeledInfo label="Speed" info={<Text>{stats.speed}</Text>} />
        </SimpleGrid>
      </VStack>
    </VStack>
  );
};

const SelectedModelLabeledInfo = ({
  label,
  info,
  ...props
}: {
  label: string;
  info: string | number | React.ReactElement;
} & StackProps) => (
  <GridItem>
    <VStack alignItems="flex-start" {...props}>
      <Text fontWeight="bold">{label}</Text>
      <Text>{info}</Text>
    </VStack>
  </GridItem>
);
