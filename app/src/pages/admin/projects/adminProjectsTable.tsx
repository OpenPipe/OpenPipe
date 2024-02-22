import {
  Box,
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
import { BiLogIn } from "react-icons/bi";
import { BsPersonCircle } from "react-icons/bs";
import { SortArrows, useSortOrder } from "~/components/sorting";
import { type RouterOutputs, api, RouterInputs } from "~/utils/api";
import { useAdminProjects, useHandledAsyncCallback, useSearchQuery } from "~/utils/hooks";

export default function adminProjectsTable() {
  const { setSearchQueryParam } = useSearchQuery();

  const projects = useAdminProjects().data;
  type SortableField = NonNullable<RouterInputs["adminProjects"]["list"]["sortOrder"]>["field"];

  const SortableHeader = (props: { title: string; field: SortableField; isNumeric?: boolean }) => {
    const sortOrder = useSortOrder<SortableField>();

    return (
      <Th onClick={() => sortOrder.toggle(props.field)} cursor="pointer">
        <HStack justify={props.isNumeric ? "end" : undefined}>
          <Text>{props.title}</Text> <SortArrows<SortableField> field={props.field} />
        </HStack>
      </Th>
    );
  };

  return (
    <>
      <Input
        placeholder="Search by project: name, slug | user: name, email | model: slug | baseModel"
        onChange={(e) => setSearchQueryParam({ search: e.target.value })}
      />

      <Table>
        <Thead>
          <Tr>
            <SortableHeader title="Name" field="name" />
            <SortableHeader isNumeric title="Created At" field="createdAt" />
            <SortableHeader title="Slug" field="slug" />
            <Th>
              <Text>Members</Text>
            </Th>
            <SortableHeader isNumeric title="Models" field="fineTunesCount" />
            <Th isNumeric minW="150px">
              <Text>Last usage</Text>
            </Th>
          </Tr>
        </Thead>
        <Tbody>
          {projects?.length &&
            projects?.map((project) => (
              <>
                <TableRow project={project} />
              </>
            ))}
        </Tbody>
      </Table>
    </>
  );
}

const TableRow = ({ project }: { project: RouterOutputs["adminProjects"]["list"][0] }) => {
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  return (
    <>
      <Tr
        onClick={() =>
          project.id === expandedRow ? setExpandedRow(null) : setExpandedRow(project.id)
        }
        key={project.id}
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
              {project.name}
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
            <Text>
              {user.name} ({user.email})
            </Text>
          ))}
        </Td>
        <Td isNumeric>{project.fineTunesCount}</Td>
        <Td isNumeric>
          {project.lastUsageLog[0]?.usageLogCreatedAt
            ? dayjs(project.lastUsageLog[0]?.usageLogCreatedAt).format("DD MMM YYYY")
            : "None"}
        </Td>
      </Tr>
      <ExtendableArea expandedRow={expandedRow} project={project} />
    </>
  );
};

const ExtendableArea = ({
  expandedRow,
  project,
}: {
  expandedRow: string | null;
  project: RouterOutputs["adminProjects"]["list"][0];
}) => {
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
            <Text size="sm">Project ID: {project.id}</Text>
          </HStack>
          <HStack align="stretch" px={6} pt={2} pb={4} spacing={4}>
            <VStack flex={1} align="stretch">
              <Heading size="sm">Users:</Heading>
              <Card p={3} mr={2} borderColor="orange.200" backgroundColor="orange.50">
                {project.projectUsers.map((user) => (
                  <HStack>
                    <Text as="b">{user.name}</Text>
                    <Text>({user.email})</Text>
                    <Text>{user.role}</Text>
                    {user.image && (
                      <Image
                        src={user.image}
                        alt="profile picture"
                        boxSize={8}
                        borderRadius="50%"
                      />
                    )}
                    <Icon as={BiLogIn} boxSize={6} />
                  </HStack>
                ))}
              </Card>
            </VStack>
            <VStack flex={1} align="stretch">
              <Heading size="sm">Models:</Heading>
              <Card p={3} mr={2} borderColor="orange.200" backgroundColor="orange.50">
                {project.fineTunes.map((fineTune) => (
                  <HStack>
                    <Text as="b">openpipe:{fineTune.slug}</Text>
                    <Text>({fineTune.baseModel})</Text>
                  </HStack>
                ))}
              </Card>
            </VStack>
          </HStack>
        </Collapse>
      </Td>
    </Tr>
  );
};
