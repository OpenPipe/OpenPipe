import { Box, Card, HStack, Image, Table, Tbody, Td, Text, Tooltip, Tr } from "@chakra-ui/react";
import { Project, ProjectUser } from "@prisma/client";
import dayjs from "dayjs";
import { useRouter } from "next/router";
import AsyncSelect from "react-select/async";

import AppShell from "~/components/nav/AppShell";
import { type RouterOutputs, api } from "~/utils/api";
import { useHandledAsyncCallback } from "~/utils/hooks";
import AdminProjects from "./projects/adminProjectsTable";
import AdminProjectsPaginator from "./projects/adminProjectsPaginator";

export default function AdminDashboard() {
  return (
    <AppShell title="Admin Impersonate">
      <Card m={5} p={4}>
        <AdminProjects />
        <AdminProjectsPaginator />
      </Card>
    </AppShell>
  );
}
