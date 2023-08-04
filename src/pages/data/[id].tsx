import {
  Box,
  Breadcrumb,
  BreadcrumbItem,
  Center,
  Flex,
  HStack,
  Icon,
  Input,
  VStack,
  Button,
} from "@chakra-ui/react";
import Link from "next/link";

import { useRouter } from "next/router";
import { useState, useEffect } from "react";
import { RiDatabase2Line } from "react-icons/ri";
import { BiImport } from "react-icons/bi";
import AppShell from "~/components/nav/AppShell";
import { api } from "~/utils/api";
import { useDataset, useHandledAsyncCallback } from "~/utils/hooks";
import DatasetEntriesTable from "~/components/datasets/DatasetEntriesTable";
import { BsStars } from "react-icons/bs";

export default function Dataset() {
  const router = useRouter();
  const utils = api.useContext();

  const dataset = useDataset();
  const datasetId = router.query.id as string;

  const [name, setName] = useState(dataset.data?.name || "");
  useEffect(() => {
    setName(dataset.data?.name || "");
  }, [dataset.data?.name]);

  const updateMutation = api.datasets.update.useMutation();
  const [onSaveName] = useHandledAsyncCallback(async () => {
    if (name && name !== dataset.data?.name && dataset.data?.id) {
      await updateMutation.mutateAsync({
        id: dataset.data.id,
        updates: { name: name },
      });
      await Promise.all([utils.datasets.list.invalidate(), utils.datasets.get.invalidate()]);
    }
  }, [updateMutation, dataset.data?.id, dataset.data?.name, name]);

  if (!dataset.isLoading && !dataset.data) {
    return (
      <AppShell title="Dataset not found">
        <Center h="100%">
          <div>Dataset not found 😕</div>
        </Center>
      </AppShell>
    );
  }

  return (
    <>
      <AppShell title={dataset.data?.name}>
        <VStack h="full">
          <Flex
            pl={4}
            pr={8}
            py={2}
            w="full"
            direction={{ base: "column", sm: "row" }}
            alignItems={{ base: "flex-start", sm: "center" }}
          >
            <Breadcrumb flex={1} mt={1}>
              <BreadcrumbItem>
                <Link href="/data">
                  <Flex alignItems="center" _hover={{ textDecoration: "underline" }}>
                    <Icon as={RiDatabase2Line} boxSize={4} mr={2} /> Datasets
                  </Flex>
                </Link>
              </BreadcrumbItem>
              <BreadcrumbItem isCurrentPage>
                <Input
                  size="sm"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onBlur={onSaveName}
                  borderWidth={1}
                  borderColor="transparent"
                  fontSize={16}
                  px={0}
                  minW={{ base: 100, lg: 300 }}
                  flex={1}
                  _hover={{ borderColor: "gray.300" }}
                  _focus={{ borderColor: "blue.500", outline: "none" }}
                />
              </BreadcrumbItem>
            </Breadcrumb>
            <HStack>
              <Button leftIcon={<BiImport />} colorScheme="blue" variant="ghost">
                Import Data
              </Button>
              <Button leftIcon={<BsStars />} colorScheme="blue">
                Generate Data
              </Button>
            </HStack>
          </Flex>
          <Box w="full" overflowX="auto" flex={1} pl={4} pr={8} pt={8}>
            {datasetId && <DatasetEntriesTable />}
          </Box>
        </VStack>
      </AppShell>
    </>
  );
}
