import {
  Heading,
  VStack,
  Text,
  HStack,
  type StackProps,
  Icon,
  Button,
  GridItem,
  SimpleGrid,
} from "@chakra-ui/react";
import { BsChevronRight } from "react-icons/bs";
import { modelStats } from "~/server/modelStats";
import { type SupportedModel } from "~/server/types";

export const SelectedModelInfo = ({ model }: { model: SupportedModel }) => {
  const stats = modelStats[model];
  return (
    <VStack w="full" spacing={6} bgColor="gray.100" p={4} borderRadius={8}>
      <HStack w="full" justifyContent="space-between">
        <Text fontWeight="bold" fontSize="xs">
          SELECTED MODEL
        </Text>
        <Button variant="link" onClick={() => window.open(stats.learnMoreUrl, "_blank")}>
          <HStack alignItems="center" spacing={0} color="blue.500" fontWeight="bold">
            <Text fontSize="xs">Learn More</Text>
            <Icon as={BsChevronRight} boxSize={3} strokeWidth={1} />
          </HStack>
        </Button>
      </HStack>
      <HStack w="full" justifyContent="space-between">
        <Heading as="h3" size="md">
          {model}
        </Heading>
        <Text fontWeight="bold">{stats.provider}</Text>
      </HStack>
      <SimpleGrid w="full" justifyContent="space-between" alignItems="flex-start" fontSize="sm" columns={{base: 2, md: 4}}>
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
    <VStack alignItems="flex-start" flex={1} {...props}>
      <Text fontWeight="bold">{label}</Text>
      <Text>{info}</Text>
    </VStack>
  </GridItem>
);
