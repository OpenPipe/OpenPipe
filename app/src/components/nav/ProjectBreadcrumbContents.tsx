import { HStack, Flex, Text } from "@chakra-ui/react";
import Link from "next/link";

import { useSelectedOrg } from "~/utils/hooks";

// Have to export only contents here instead of full BreadcrumbItem because Chakra doesn't
// recognize a BreadcrumbItem exported with this component as a valid child of Breadcrumb.

export default function ProjectBreadcrumbContents() {
  const { data: selectedOrg } = useSelectedOrg();

  return (
    <Link href="/home">
      <HStack w="full">
        <Flex
          p={1}
          borderRadius={4}
          backgroundColor="orange.100"
          minW={6}
          maxW={6}
          minH={6}
          maxH={6}
          alignItems="center"
          justifyContent="center"
        >
          <Text>{selectedOrg?.name[0]?.toUpperCase()}</Text>
        </Flex>
        <Text display={{ base: "none", md: "block" }} py={1}>
          {selectedOrg?.name}
        </Text>
      </HStack>
    </Link>
  );
}
