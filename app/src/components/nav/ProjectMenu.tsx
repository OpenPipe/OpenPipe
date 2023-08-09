import {
  HStack,
  VStack,
  Text,
  Popover,
  PopoverTrigger,
  PopoverContent,
  Flex,
  IconButton,
  Icon,
  Divider,
  Button,
  useDisclosure,
  Spinner,
} from "@chakra-ui/react";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { BsChevronRight, BsGear, BsPlus } from "react-icons/bs";
import { type Project } from "@prisma/client";

import { useAppStore } from "~/state/store";
import { api } from "~/utils/api";
import NavSidebarOption from "./NavSidebarOption";
import { useHandledAsyncCallback, useSelectedProject } from "~/utils/hooks";
import { useRouter } from "next/router";

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
    const newProj = await createMutation.mutateAsync({ name: "New Project" });
    await utils.projects.list.invalidate();
    setselectedProjectId(newProj.id);
    await router.push({ pathname: "/project/settings" });
  }, [createMutation, router]);

  return (
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
      <Popover placement="right" isOpen={popover.isOpen} onClose={popover.onClose} closeOnBlur>
        <PopoverTrigger>
          <NavSidebarOption>
            <HStack w="full" onClick={popover.onToggle}>
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
              <Text fontSize="sm" display={{ base: "none", md: "block" }} py={1} flex={1}>
                {selectedProject?.name}
              </Text>
              <Icon as={BsChevronRight} boxSize={4} color="gray.500" />
            </HStack>
          </NavSidebarOption>
        </PopoverTrigger>
        <PopoverContent _focusVisible={{ outline: "unset" }} ml={-1}>
          <VStack alignItems="flex-start" spacing={2} py={4} px={2}>
            <Text color="gray.500" fontSize="xs" fontWeight="bold" pb={1}>
              PROJECTS
            </Text>
            <Divider />
            <VStack spacing={0} w="full">
              {projects?.map((proj) => (
                <ProjectOption
                  key={proj.id}
                  proj={proj}
                  isActive={proj.id === selectedProjectId}
                  onClose={popover.onClose}
                />
              ))}
            </VStack>
            <HStack
              as={Button}
              variant="ghost"
              colorScheme="blue"
              color="blue.400"
              pr={8}
              w="full"
              onClick={createProject}
            >
              <Icon as={isLoading ? Spinner : BsPlus} boxSize={6} />
              <Text>New project</Text>
            </HStack>
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
      bgColor={isActive ? "gray.100" : "transparent"}
      _hover={gearHovered ? undefined : { bgColor: "gray.200", textDecoration: "none" }}
      p={2}
    >
      <Text>{proj.name}</Text>
      <IconButton
        as={Link}
        href="/project/settings"
        aria-label={`Open ${proj.name} settings`}
        icon={<Icon as={BsGear} boxSize={5} strokeWidth={0.5} color="gray.500" />}
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
