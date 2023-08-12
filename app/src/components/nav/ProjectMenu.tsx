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
  IconButton,
  Image,
  Box,
} from "@chakra-ui/react";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { BsGear, BsPlus, BsPersonCircle } from "react-icons/bs";
import { type Project } from "@prisma/client";

import { useAppStore } from "~/state/store";
import { api } from "~/utils/api";
import NavSidebarOption from "./NavSidebarOption";
import { useHandledAsyncCallback, useSelectedProject } from "~/utils/hooks";
import { useRouter } from "next/router";
import { useSession, signOut } from "next-auth/react";

export default function ProjectMenu() {
  const router = useRouter();
  const utils = api.useContext();

  const selectedProjectId = useAppStore((s) => s.selectedProjectId);
  const setselectedProjectId = useAppStore((s) => s.setselectedProjectId);

  const { data: projects } = api.projects.list.useQuery();

  useEffect(() => {
    if (
      projects &&
      projects[0] &&
      (!selectedProjectId || !projects.find((proj) => proj.id === selectedProjectId))
    ) {
      setselectedProjectId(projects[0].id);
    }
  }, [selectedProjectId, setselectedProjectId, projects]);

  const { data: selectedProject } = useSelectedProject();

  const popover = useDisclosure();

  const createMutation = api.projects.create.useMutation();
  const [createProject, isLoading] = useHandledAsyncCallback(async () => {
    const newProj = await createMutation.mutateAsync({ name: "Untitled Project" });
    await utils.projects.list.invalidate();
    setselectedProjectId(newProj.id);
    await router.push({ pathname: "/project/settings" });
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
        placement="bottom"
        isOpen={popover.isOpen}
        onOpen={popover.onOpen}
        onClose={popover.onClose}
        closeOnBlur
      >
        <PopoverTrigger>
          <NavSidebarOption>
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
              <Text
                fontSize="sm"
                display={{ base: "none", md: "block" }}
                py={1}
                flex={1}
                fontWeight="bold"
              >
                {selectedProject?.name}
              </Text>
              <Box mr={2}>{profileImage}</Box>
            </HStack>
          </NavSidebarOption>
        </PopoverTrigger>
        <PopoverContent
          _focusVisible={{ outline: "unset" }}
          ml={-1}
          w={224}
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
            <VStack spacing={0} w="full" px={1}>
              {projects?.map((proj) => (
                <ProjectOption
                  key={proj.id}
                  proj={proj}
                  isActive={proj.id === selectedProjectId}
                  onClose={popover.onClose}
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
                <Text>Sign out</Text>
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
  onClose,
}: {
  proj: Project;
  isActive: boolean;
  onClose: () => void;
}) => {
  const setselectedProjectId = useAppStore((s) => s.setselectedProjectId);
  const [gearHovered, setGearHovered] = useState(false);

  return (
    <HStack
      as={Link}
      href="/experiments"
      onClick={() => {
        setselectedProjectId(proj.id);
        onClose();
      }}
      w="full"
      justifyContent="space-between"
      _hover={gearHovered ? undefined : { bgColor: "gray.200", textDecoration: "none" }}
      color={isActive ? "blue.400" : undefined}
      py={2}
      px={4}
      borderRadius={4}
      spacing={4}
    >
      <Text>{proj.name}</Text>
      <IconButton
        as={Link}
        href="/project/settings"
        aria-label={`Open ${proj.name} settings`}
        icon={
          <Icon
            as={BsGear}
            boxSize={5}
            strokeWidth={0.5}
            color={isActive ? "blue.400" : "gray.500"}
          />
        }
        variant="ghost"
        size="xs"
        p={0}
        onMouseEnter={() => setGearHovered(true)}
        onMouseLeave={() => setGearHovered(false)}
        _hover={{ bgColor: isActive ? "gray.300" : "gray.100", transitionDelay: 0 }}
        borderRadius={4}
      />
    </HStack>
  );
};
