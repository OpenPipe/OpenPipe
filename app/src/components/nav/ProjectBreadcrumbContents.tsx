import { HStack, Flex, Text } from "@chakra-ui/react";
import { useSelectedProject } from "~/utils/hooks";

// Have to export only contents here instead of full BreadcrumbItem because Chakra doesn't
// recognize a BreadcrumbItem exported with this component as a valid child of Breadcrumb.
export default function ProjectBreadcrumbContents({ projectName = "" }: { projectName?: string }) {
  const { data: selectedProject } = useSelectedProject();

  projectName = projectName || selectedProject?.name || "";

  return (
    <HStack w="full">
      <Flex
        p={1}
        borderRadius={4}
        backgroundColor="orange.100"
        boxSize={6}
        alignItems="center"
        justifyContent="center"
      >
        <Text>{projectName[0]?.toUpperCase()}</Text>
      </Flex>
      <Text display={{ base: "none", md: "block" }} py={1}>
        {projectName}
      </Text>
    </HStack>
  );
}
