import {
  HStack,
  VStack,
  Text,
  Popover,
  PopoverTrigger,
  PopoverContent,
  Flex,
  Icon,
  Divider,
  Button,
  useDisclosure,
  Spinner,
  Link as ChakraLink,
  Image,
  Box,
} from "@chakra-ui/react";
import Link from "next/link";
import { BsPlus, BsPersonCircle } from "react-icons/bs";
import { type Project } from "@prisma/client";

import { api } from "~/utils/api";
import NavSidebarOption from "./NavSidebarOption";
import { useHandledAsyncCallback, useProjectList, useSelectedProject } from "~/utils/hooks";
import { useRouter } from "next/router";
import { useSession, signOut } from "next-auth/react";

export default function ProjectMenu({ displayProjectName }: { displayProjectName: boolean }) {
  const router = useRouter();
  const utils = api.useContext();

  const projectList = useProjectList().data;

  const selectedProject = useSelectedProject().data;

  const popover = useDisclosure();

  const updateMutation = api.users.updateLastViewedProject.useMutation();
  const [updateLastViewedProject] = useHandledAsyncCallback(
    async (projectId: string) => {
      await updateMutation.mutateAsync({ projectId });
    },
    [updateMutation],
  );

  const createMutation = api.projects.create.useMutation();
  const [createProject, isLoading] = useHandledAsyncCallback(async () => {
    const newProj = await createMutation.mutateAsync({ name: "Untitled Project" });
    await utils.projects.list.invalidate();
    await router.push({
      pathname: "/p/[projectSlug]/settings",
      query: { projectSlug: newProj.slug },
    });
    popover.onClose();
  }, [createMutation, router]);

  const user = useSession().data;

  const profileImage = user?.user.image ? (
    <Image src={user.user.image} alt="profile picture" boxSize={6} borderRadius="50%" />
  ) : (
    <Icon as={BsPersonCircle} boxSize={6} />
  );

  return (
    <VStack w="full" alignItems="flex-start" spacing={0} py={1}>
      <Popover
        placement="bottom-end"
        isOpen={popover.isOpen}
        onOpen={popover.onOpen}
        onClose={popover.onClose}
        closeOnBlur
      >
        <PopoverTrigger>
          {/* https://github.com/chakra-ui/chakra-ui/issues/7647#issuecomment-1836555897 */}
          <NavSidebarOption tabIndex={0}>
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
                <Text>{selectedProject?.name[0]?.toUpperCase()}</Text>
              </Flex>
              {displayProjectName && (
                <Text
                  fontSize="sm"
                  display={{ base: "none", md: "block" }}
                  py={1}
                  flex={1}
                  fontWeight="bold"
                >
                  {selectedProject?.name}
                </Text>
              )}
              <Box mr={2}>{profileImage}</Box>
            </HStack>
          </NavSidebarOption>
        </PopoverTrigger>
        <PopoverContent
          _focusVisible={{ outline: "unset" }}
          w={220}
          minW="fit-content"
          ml={{ base: 2, md: 0 }}
          boxShadow="0 0 40px 4px rgba(0, 0, 0, 0.1);"
          fontSize="sm"
        >
          <VStack alignItems="flex-start" spacing={1} py={1}>
            <Text px={3} py={2}>
              {user?.user.email}
            </Text>
            <Divider />
            <Text alignSelf="flex-start" fontWeight="bold" px={3} pt={2}>
              Your Projects
            </Text>
            <VStack spacing={0} w="full" px={1} maxH="50vh" overflow="auto">
              {projectList?.projects?.map((proj) => (
                <ProjectOption
                  key={proj.id}
                  proj={proj}
                  isActive={proj.id === selectedProject?.id}
                  onClick={() => {
                    updateLastViewedProject(proj.id);
                    popover.onClose();
                  }}
                />
              ))}
              <HStack
                as={Button}
                variant="ghost"
                colorScheme="blue"
                color="blue.400"
                fontSize="sm"
                justifyContent="flex-start"
                onClick={createProject}
                w="full"
                borderRadius={4}
                spacing={0}
                minH={10}
              >
                <Text>Add project</Text>
                <Icon as={isLoading ? Spinner : BsPlus} boxSize={4} strokeWidth={0.5} />
              </HStack>
            </VStack>

            <Divider />
            <VStack w="full" px={1}>
              <ChakraLink
                onClick={() => {
                  signOut().catch(console.error);
                }}
                _hover={{ bgColor: "gray.200", textDecoration: "none" }}
                w="full"
                py={2}
                px={2}
                borderRadius={4}
              >
                <Text
                  onClick={() => {
                    signOut().catch(console.error);
                  }}
                >
                  Sign out
                </Text>
              </ChakraLink>
            </VStack>
          </VStack>
        </PopoverContent>
      </Popover>
    </VStack>
  );
}

const ProjectOption = ({
  proj,
  isActive,
  onClick,
}: {
  proj: Pick<Project, "name" | "slug">;
  isActive: boolean;
  onClick: () => void;
}) => {
  return (
    <HStack
      as={Link}
      href={{ pathname: "/p/[projectSlug]/request-logs", query: { projectSlug: proj.slug } }}
      onClick={onClick}
      w="full"
      justifyContent="space-between"
      _hover={{ bgColor: "gray.200", textDecoration: "none" }}
      bgColor={isActive ? "gray.100" : undefined}
      py={2}
      px={4}
      borderRadius={4}
      spacing={4}
    >
      <Text>{proj.name}</Text>
    </HStack>
  );
};
