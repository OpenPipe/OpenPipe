import { Text, VStack } from "@chakra-ui/react";
import AppShell from "~/components/nav/AppShell";
import { useAccessCheck } from "~/components/ConditionallyEnable";
import AdminProjectsTable from "~/components/admin/Projects/AdminProjectsTable";

export default function AdminDashboard() {
  const isAdmin = useAccessCheck("requireIsAdmin").access;
  if (!isAdmin) return null;

  return (
    <AppShell title="Admin Dashboard">
      <VStack px={8} py={8} alignItems="flex-start" spacing={4} w="full">
        <Text fontSize="2xl" fontWeight="bold">
          All projects
        </Text>
        <AdminProjectsTable />
      </VStack>
    </AppShell>
  );
}
