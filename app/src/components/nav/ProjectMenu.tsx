import {
  HStack,
  VStack,
  Text,
  Popover,
  PopoverTrigger,
  PopoverContent,
  Flex,
} from "@chakra-ui/react";
import { useEffect } from "react";
import Link from "next/link";

import { useAppStore } from "~/state/store";
import { api } from "~/utils/api";
import NavSidebarOption from "./NavSidebarOption";
import { useSelectedOrg } from "~/utils/hooks";

export default function ProjectMenu() {
  const selectedOrgId = useAppStore((s) => s.selectedOrgId);
  const setSelectedOrgId = useAppStore((s) => s.setSelectedOrgId);

  const { data } = api.organizations.list.useQuery();

  useEffect(() => {
    if (data && data[0] && (!selectedOrgId || !data.find((org) => org.id === selectedOrgId))) {
      setSelectedOrgId(data[0].id);
    }
  }, [selectedOrgId, setSelectedOrgId, data]);

  const { data: selectedOrg } = useSelectedOrg();

  return (
    <>
      <Popover placement="right">
        <PopoverTrigger>
          <VStack w="full" alignItems="flex-start" spacing={0}>
            <Text
              pl={2}
              pb={2}
              fontSize="xs"
              fontWeight="bold"
              color="gray.500"
              display={{ base: "none", md: "flex" }}
            >
              PROJECT
            </Text>
            <NavSidebarOption activeHrefPattern="/home">
              <Link href="/home">
                <HStack w="full">
                  <Flex
                    p={1}
                    borderRadius={4}
                    backgroundColor="orange.100"
                    minW={{ base: 10, md: 8 }}
                    minH={{ base: 10, md: 8 }}
                    m={{ base: 0, md: 1 }}
                    alignItems="center"
                    justifyContent="center"
                  >
                    <Text>{selectedOrg?.name[0]?.toUpperCase()}</Text>
                  </Flex>
                  <Text fontSize="sm" display={{ base: "none", md: "block" }} py={1}>
                    {selectedOrg?.name}
                  </Text>
                </HStack>
              </Link>
            </NavSidebarOption>
          </VStack>
        </PopoverTrigger>
        <PopoverContent _focusVisible={{ boxShadow: "unset", outline: "unset" }}></PopoverContent>
      </Popover>
    </>
  );
}
