import { type MouseEvent, useState } from "react";
import {
  HStack,
  Icon,
  VStack,
  Text,
  Divider,
  Spinner,
  AspectRatio,
  SkeletonText,
  Card,
  useDisclosure,
  Box,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  IconButton,
  useToast,
} from "@chakra-ui/react";
import { RiFlaskLine } from "react-icons/ri";
import Link from "next/link";
import { useRouter } from "next/router";
import { BsPlusSquare, BsThreeDotsVertical, BsLink45Deg, BsTrash } from "react-icons/bs";

import { formatTimePast } from "~/utils/dayjs";
import { type RouterOutputs, api } from "~/utils/api";
import { useHandledAsyncCallback } from "~/utils/hooks";
import { useAppStore } from "~/state/store";
import DeleteExperimentDialog from "./DeleteExperimentDialog";

export const ExperimentCard = ({ exp }: { exp: RouterOutputs["experiments"]["list"][0] }) => {
  const [isMenuHovered, setIsMenuHovered] = useState(false);

  return (
    <Card
      w="full"
      h="full"
      cursor="pointer"
      p={4}
      bg="white"
      borderRadius={4}
      _hover={{ bg: isMenuHovered ? undefined : "gray.100" }}
      transition="background 0.2s"
      aspectRatio={1.2}
    >
      <VStack
        as={Link}
        w="full"
        h="full"
        href={{ pathname: "/experiments/[experimentSlug]", query: { experimentSlug: exp.slug } }}
        justify="space-between"
      >
        <HStack w="full" justify="space-between" spacing={0}>
          <Box w={6} />
          <HStack color="gray.700" justify="center">
            <Icon as={RiFlaskLine} boxSize={4} />
            <Text fontWeight="bold">{exp.label}</Text>
          </HStack>
          <CardMenu
            experimentId={exp.id}
            experimentSlug={exp.slug}
            setIsMenuHovered={setIsMenuHovered}
          />
        </HStack>
        <HStack h="full" spacing={4} flex={1} align="center">
          <CountLabel label="Variants" count={exp.promptVariantCount} />
          <Divider h={12} orientation="vertical" />
          <CountLabel label="Scenarios" count={exp.testScenarioCount} />
        </HStack>
        <HStack w="full" color="gray.500" fontSize="xs" textAlign="center">
          <Text flex={1}>Created {formatTimePast(exp.createdAt)}</Text>
          <Divider h={4} orientation="vertical" />
          <Text flex={1}>Updated {formatTimePast(exp.updatedAt)}</Text>
        </HStack>
      </VStack>
    </Card>
  );
};

const CardMenu = ({
  experimentId,
  experimentSlug,
  setIsMenuHovered,
}: {
  experimentId: string;
  experimentSlug: string;
  setIsMenuHovered: (isHovered: boolean) => void;
}) => {
  const deleteDisclosure = useDisclosure();
  const menuDisclosure = useDisclosure();
  const toast = useToast();
  const [copyShareLink] = useHandledAsyncCallback(
    async (e: MouseEvent<HTMLButtonElement>) => {
      if (typeof window === "undefined") return;
      e.preventDefault();
      e.stopPropagation();
      const shareLink = `${window.location.origin}/experiments/${experimentSlug}`;
      await navigator.clipboard.writeText(shareLink);
      toast({
        title: "Share link copied to clipboard",
        status: "success",
        duration: 2000,
        isClosable: true,
      });
      menuDisclosure.onClose();
    },
    [toast, menuDisclosure.onClose, experimentSlug],
  );
  return (
    <>
      <Menu isLazy {...menuDisclosure}>
        <MenuButton
          as={IconButton}
          aria-label="Options"
          icon={<BsThreeDotsVertical />}
          variant="ghost"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            menuDisclosure.onOpen();
          }}
          onMouseEnter={() => setIsMenuHovered(true)}
          onMouseLeave={() => setIsMenuHovered(false)}
          boxSize={6}
          minW={0}
        />
        <MenuList>
          <MenuItem icon={<Icon as={BsLink45Deg} boxSize={5} />} onClick={copyShareLink}>
            Copy Link
          </MenuItem>
          <MenuItem
            icon={<Icon as={BsTrash} boxSize={5} />}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              deleteDisclosure.onOpen();
            }}
            color="red.500"
          >
            Delete
          </MenuItem>
        </MenuList>
      </Menu>
      <DeleteExperimentDialog experimentId={experimentId} disclosure={deleteDisclosure} />
    </>
  );
};

const CountLabel = ({ label, count }: { label: string; count: number }) => {
  return (
    <VStack alignItems="center" flex={1}>
      <Text color="gray.500" fontWeight="bold">
        {label}
      </Text>
      <Text fontSize="sm" color="gray.500">
        {count}
      </Text>
    </VStack>
  );
};

export const NewExperimentCard = () => {
  const router = useRouter();
  const selectedProjectId = useAppStore((s) => s.selectedProjectId);
  const createMutation = api.experiments.create.useMutation();
  const [createExperiment, isLoading] = useHandledAsyncCallback(async () => {
    const newExperiment = await createMutation.mutateAsync({
      projectId: selectedProjectId ?? "",
    });
    await router.push({
      pathname: "/experiments/[experimentSlug]",
      query: { experimentSlug: newExperiment.slug },
    });
  }, [createMutation, router, selectedProjectId]);

  return (
    <Card
      w="full"
      h="full"
      cursor="pointer"
      p={4}
      bg="white"
      borderRadius={4}
      _hover={{ bg: "gray.100" }}
      transition="background 0.2s"
      aspectRatio={1.2}
    >
      <VStack align="center" justify="center" w="full" h="full" p={4} onClick={createExperiment}>
        <Icon as={isLoading ? Spinner : BsPlusSquare} boxSize={8} />
        <Text ml={2}>New Experiment</Text>
      </VStack>
    </Card>
  );
};

export const ExperimentCardSkeleton = () => (
  <AspectRatio ratio={1.2} w="full">
    <VStack align="center" borderColor="gray.200" borderWidth={1} p={4} bg="white">
      <SkeletonText noOfLines={1} w="80%" />
      <SkeletonText noOfLines={2} w="60%" />
      <SkeletonText noOfLines={1} w="80%" />
    </VStack>
  </AspectRatio>
);
