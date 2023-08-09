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
import { AiFillCaretDown } from "react-icons/ai";
import { BsGear, BsPlus } from "react-icons/bs";
import { type Organization } from "@prisma/client";

import { useAppStore } from "~/state/store";
import { api } from "~/utils/api";
import NavSidebarOption from "./NavSidebarOption";
import { useHandledAsyncCallback, useSelectedOrg } from "~/utils/hooks";
import { useRouter } from "next/router";

export default function ProjectMenu() {
  const router = useRouter();
  const isActive = router.pathname.startsWith("/home");
  const utils = api.useContext();

  const selectedOrgId = useAppStore((s) => s.selectedOrgId);
  const setSelectedOrgId = useAppStore((s) => s.setSelectedOrgId);

  const { data: orgs } = api.organizations.list.useQuery();

  useEffect(() => {
    if (orgs && orgs[0] && (!selectedOrgId || !orgs.find((org) => org.id === selectedOrgId))) {
      setSelectedOrgId(orgs[0].id);
    }
  }, [selectedOrgId, setSelectedOrgId, orgs]);

  const { data: selectedOrg } = useSelectedOrg();

  const popover = useDisclosure();

  const createMutation = api.organizations.create.useMutation();
  const [createProject, isLoading] = useHandledAsyncCallback(async () => {
    const newOrg = await createMutation.mutateAsync({ name: "New Project" });
    await utils.organizations.list.invalidate();
    setSelectedOrgId(newOrg.id);
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
      <NavSidebarOption>
        <Popover
          placement="bottom-start"
          isOpen={popover.isOpen}
          onClose={popover.onClose}
          closeOnBlur
        >
          <PopoverTrigger>
            <HStack w="full" justifyContent="space-between" onClick={popover.onToggle}>
              <Flex
                p={1}
                borderRadius={4}
                backgroundColor="orange.100"
                minW={{ base: 10, md: 8 }}
                minH={{ base: 10, md: 8 }}
                m={{ base: 0, md: 1 }}
                alignItems="center"
                justifyContent="center"
                // onClick={sidebarExpanded ? undefined : openMenu}
              >
                <Text>{selectedOrg?.name[0]?.toUpperCase()}</Text>
              </Flex>
              <Text fontSize="sm" display={{ base: "none", md: "block" }} py={1}>
                {selectedOrg?.name}
              </Text>
              <Icon as={AiFillCaretDown} boxSize={3} size="xs" color="gray.500" mr={2} />
            </HStack>
          </PopoverTrigger>
          <PopoverContent
            _focusVisible={{ boxShadow: "unset" }}
            minW={0}
            borderColor="blue.400"
            w="full"
          >
            <VStack alignItems="flex-start" spacing={2} py={4} px={2}>
              <Text color="gray.500" fontSize="xs" fontWeight="bold" pb={1}>
                PROJECTS
              </Text>
              <Divider />
              <VStack spacing={0} w="full">
                {orgs?.map((org) => (
                  <ProjectOption
                    key={org.id}
                    org={org}
                    isActive={org.id === selectedOrgId}
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
      </NavSidebarOption>
    </VStack>
  );
}

const ProjectOption = ({
  org,
  isActive,
  onClose,
}: {
  org: Organization;
  isActive: boolean;
  onClose: () => void;
}) => {
  const setSelectedOrgId = useAppStore((s) => s.setSelectedOrgId);
  const [gearHovered, setGearHovered] = useState(false);
  return (
    <HStack
      as={Link}
      href="/experiments"
      onClick={() => {
        setSelectedOrgId(org.id);
        onClose();
      }}
      w="full"
      justifyContent="space-between"
      bgColor={isActive ? "gray.100" : "transparent"}
      _hover={gearHovered ? undefined : { bgColor: "gray.200", textDecoration: "none" }}
      p={2}
    >
      <Text>{org.name}</Text>
      <IconButton
        as={Link}
        href="/project/settings"
        aria-label={`Open ${org.name} settings`}
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
