import { Box, Card, HStack, Image, Table, Tbody, Td, Text, Tooltip, Tr } from "@chakra-ui/react";
import { Project, ProjectUser, User } from "@prisma/client";
import dayjs from "dayjs";
import { useRouter } from "next/router";
import AsyncSelect from "react-select/async";

import AppShell from "~/components/nav/AppShell";
import { type RouterOutputs, api } from "~/utils/api";
import { useHandledAsyncCallback } from "~/utils/hooks";

export default function adminProjectsTable() {
  const impersonateMutation = api.adminUsers.impersonate.useMutation();
  const utils = api.useContext();

  const projects = api.adminProjects.list.useQuery().data;

  return (
    <Table>
      {/* <TableHeader showRelabelStatusColumn={relabelingVisible} /> */}
      <Tbody>
        {projects?.length &&
          projects?.map((project) => (
            <Tr
              key={project.id}
              _hover={{ td: { bgColor: "gray.50", cursor: "pointer" } }}
              transition="background-color 1.2s"
              fontSize="sm"
            >
              <Td>{project.name}</Td>
              <Td isNumeric>
                <Box whiteSpace="nowrap" minW="120px">
                  {dayjs(project.createdAt).format("MMMM D h:mm A")}
                </Box>
              </Td>
              <Td isNumeric>{project.slug}</Td>
              <Td isNumeric>
                {project.projectUsers.map((user) => (
                  <>{user.user.name}</>
                ))}
              </Td>
              <Td isNumeric>{project.fineTunes.length}</Td>
            </Tr>
          ))}
      </Tbody>
    </Table>
  );
}
