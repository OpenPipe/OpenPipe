import {
  Box,
  Button,
  Card,
  Collapse,
  HStack,
  Heading,
  Icon,
  Image,
  Input,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  VStack,
} from "@chakra-ui/react";
import dayjs from "dayjs";
import Link from "next/link";
import { useRouter } from "next/router";
import { useState } from "react";
import { BiLogInCircle } from "react-icons/bi";
import { AddCredits } from "~/components/admin/Actions/AddCredits";
import { SortableHeader } from "~/components/sorting";
import { type RouterOutputs, api, type RouterInputs } from "~/utils/api";
import { useAdminProjects, useHandledAsyncCallback, useSearchQuery } from "~/utils/hooks";
import { useCopyToClipboard } from "~/utils/useCopyToClipboard";
import AdminProjectsPaginator from "./AdminProjectsPaginator";
import { ChangeRateLimit } from "../Actions/ChangeRateLimit";

type SortableField = NonNullable<RouterInputs["adminProjects"]["list"]["sortOrder"]>["field"];
type AdminProjectType = RouterOutputs["adminProjects"]["list"]["projects"][0];

export default function AdminProjectsTable() {
  const { setSearchQueryParam } = useSearchQuery();
  const projects = useAdminProjects().data?.projects;

  return (
    <Card p={4} w="100%">
      <Input
        placeholder="Search by project: name, slug | user: name, email | model: slug | baseModel"
        onChange={(e) => setSearchQueryParam({ search: e.target.value })}
      />

      <Table w="100%">
        <Thead>
          <Tr>
            <SortableHeader<SortableField> title="Name" field="name" />
            <SortableHeader<SortableField> isNumeric title="Created At" field="createdAt" />
            <SortableHeader<SortableField> title="Slug" field="slug" />
            <Th>
              <Text>Members</Text>
            </Th>
            <SortableHeader<SortableField> isNumeric title="Models" field="fineTunesCount" />
            <Th isNumeric minW="150px">
              <Text>Last usage</Text>
            </Th>
          </Tr>
        </Thead>
        <Tbody>
          {projects?.length &&
            projects.map((project) => <TableRow key={project.id} project={project} />)}
        </Tbody>
      </Table>
      <AdminProjectsPaginator />
    </Card>
  );
}

const TableRow = ({ project }: { project: AdminProjectType }) => {
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  return (
    <>
      <Tr
        onClick={() => setExpandedRow(project.id === expandedRow ? null : project.id)}
        _hover={{ td: { bgColor: "gray.50", cursor: "pointer" } }}
        transition="background-color 1.2s"
        fontSize="sm"
      >
        <Td>
          <Text as="b">
            <Link
              href={{
                pathname: `/p/[projectSlug]/request-logs`,
                query: { projectSlug: project.slug },
              }}
            >
              <Button variant="ghost">{project.name}</Button>
            </Link>
          </Text>
        </Td>
        <Td isNumeric>
          <Box whiteSpace="nowrap" minW="120px">
            {dayjs(project.createdAt).format("MMMM D h:mm A")}
          </Box>
        </Td>
        <Td>{project.slug}</Td>
        <Td>
          {project.projectUsers.map((user) => (
            <Text key={user.email}>
              {user.name} ({user.email})
            </Text>
          ))}
        </Td>
        <Td isNumeric>{project.fineTunesCount}</Td>
        <Td isNumeric>
          {project.lastUsageLog[0]?.usageLogCreatedAt
            ? dayjs(project.lastUsageLog[0]?.usageLogCreatedAt).format("DD MMM YYYY")
            : "-"}
        </Td>
      </Tr>
      <ExtendableArea expandedRow={expandedRow} project={project} />
    </>
  );
};

interface ExtendableAreaProps {
  expandedRow: string | null;
  project: AdminProjectType;
}

const ExtendableArea: React.FC<ExtendableAreaProps> = ({ expandedRow, project }) => {
  const copyToClipboard = useCopyToClipboard();
  const impersonateMutation = api.adminUsers.impersonate.useMutation();
  const router = useRouter();

  const [impersonate] = useHandledAsyncCallback(
    async (userId: string) => {
      await impersonateMutation.mutateAsync({ id: userId });
      window.location.replace("/");
    },
    [impersonateMutation, router],
  );

  return (
    <Tr maxW="full">
      <Td colSpan={6} w="full" maxW="full" p={0}>
        <Collapse in={expandedRow === project.id} unmountOnExit={true}>
          <HStack px={6} pt={2} pb={4} spacing={4}>
            <Text as="b">ID:</Text>
            <Text cursor="pointer" size="sm" onClick={() => void copyToClipboard(project.id)}>
              {project.id}
            </Text>
            <Text size="sm">
              <strong>Credits:</strong> ${Number(project.credits ?? 0).toFixed(2)}
            </Text>
            <AddCredits projectId={project.id}>
              <Button variant="ghost" colorScheme="orange" minW={24}>
                Add credits
              </Button>
            </AddCredits>
            <Text size="sm">
              <strong>Rate Limit:</strong> {project.rateLimit}
            </Text>
            <ChangeRateLimit projectId={project.id}>
              <Button variant="ghost" colorScheme="orange" minW={24}>
                Change
              </Button>
            </ChangeRateLimit>
          </HStack>

          <HStack align="stretch" px={6} pt={2} pb={4} spacing={4}>
            <VStack flex={1} align="stretch">
              <Heading size="sm">Users:</Heading>
              <Card p={3} mr={2} borderColor="orange.200" backgroundColor="orange.50">
                {project.projectUsers.map((user) => (
                  <HStack key={user.email}>
                    <Text as="b">{user.name}</Text>
                    <Text cursor="pointer" onClick={() => void copyToClipboard(user.email!)}>
                      ({user.email})
                    </Text>
                    <Text>{user.role}</Text>
                    {user.image && (
                      <Image
                        src={user.image}
                        alt="profile picture"
                        boxSize={8}
                        borderRadius="50%"
                      />
                    )}
                    <Button variant="ghost" onClick={() => impersonate(user.id!)}>
                      <Icon as={BiLogInCircle} boxSize={6} onClick={() => impersonate(user.id!)} />
                    </Button>
                  </HStack>
                ))}
              </Card>
              {project.fineTunes.length > 0 && (
                <>
                  <Heading size="sm">Models:</Heading>
                  <Card p={3} mr={2} borderColor="orange.200" backgroundColor="orange.50">
                    {project.fineTunes.map((fineTune) => (
                      <HStack key={fineTune.slug}>
                        <Text as="b">openpipe:{fineTune.slug}</Text>
                        <Text>({fineTune.baseModel})</Text>
                      </HStack>
                    ))}
                  </Card>
                </>
              )}
            </VStack>
          </HStack>
        </Collapse>
      </Td>
    </Tr>
  );
};
