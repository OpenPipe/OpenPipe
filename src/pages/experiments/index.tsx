import {
  SimpleGrid,
  HStack,
  Icon,
  VStack,
  Breadcrumb,
  BreadcrumbItem,
  Flex,
} from "@chakra-ui/react";
import { RiFlaskLine } from "react-icons/ri";
import AppShell from "~/components/nav/AppShell";
import { api } from "~/utils/api";
import { NewExperimentButton } from "~/components/experiments/NewExperimentButton";
import { ExperimentCard } from "~/components/experiments/ExperimentCard";

export default function ExperimentsPage() {
  const experiments = api.experiments.list.useQuery();

  return (
    <AppShell>
      <VStack alignItems={"flex-start"} m={4} mt={1}>
        <HStack w="full" justifyContent="space-between" mb={4}>
          <Breadcrumb flex={1}>
            <BreadcrumbItem>
              <Flex alignItems="center">
                <Icon as={RiFlaskLine} boxSize={4} mr={2} /> Experiments
              </Flex>
            </BreadcrumbItem>
          </Breadcrumb>
          <NewExperimentButton mr={4} borderRadius={8} />
        </HStack>
        <SimpleGrid w="full" columns={{ base: 1, md: 2, lg: 3, xl: 4 }} spacing={8} p="4">
          {experiments?.data?.map((exp) => <ExperimentCard key={exp.id} exp={exp} />)}
        </SimpleGrid>
      </VStack>
    </AppShell>
  );
}
