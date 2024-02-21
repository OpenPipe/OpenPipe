import {
  Box,
  Card,
  Collapse,
  HStack,
  Image,
  Input,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tooltip,
  Tr,
} from "@chakra-ui/react";
import { Project, ProjectUser, User } from "@prisma/client";
import dayjs from "dayjs";
import { useRouter } from "next/router";
import { useState } from "react";
import AsyncSelect from "react-select/async";

import AppShell from "~/components/nav/AppShell";
import { SortArrows, useSortOrder } from "~/components/sorting";
import { useAppStore } from "~/state/store";
import { type RouterOutputs, api, RouterInputs } from "~/utils/api";
import { useAdminProjects, useHandledAsyncCallback, useSearchQuery } from "~/utils/hooks";

export default function adminProjectsTable() {
  const { setSearchQueryParam } = useSearchQuery();

  const [expandedRow, setExpandedRow] = useState<string | null>(null);

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
            <SortableHeader title="Slug" field="createdAt" />
            <SortableHeader title="Members" field="createdAt" />
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
                    <Text as="b">{project.name}</Text>
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
                <Tr maxW="full">
                  <Td
                    colSpan={5} //Change this
                    w="full"
                    maxW="full"
                    p={0}
                  >
                    <Collapse in={expandedRow === project.id} unmountOnExit={true}>
                      <HStack align="stretch" px={6} pt={2} pb={4} spacing={4}>
                        <Text>asdfasdf asdfasdfasdfasdfas</Text>
                      </HStack>
                    </Collapse>
                  </Td>
                </Tr>
              </>
            ))}
        </Tbody>
      </Table>
    </>
  );
}
