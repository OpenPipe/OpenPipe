import { Breadcrumb, BreadcrumbItem, Input } from "@chakra-ui/react";
import { useEffect, useState } from "react";
import AppShell from "~/components/nav/AppShell";
import PageHeaderContainer from "~/components/nav/PageHeaderContainer";
import { api } from "~/utils/api";
import { useHandledAsyncCallback, useSelectedOrg } from "~/utils/hooks";

export default function Settings() {
  const utils = api.useContext();
  const { data: selectedOrg } = useSelectedOrg();

  const updateMutation = api.organizations.update.useMutation();
  const [onSaveName] = useHandledAsyncCallback(async () => {
    if (name && name !== selectedOrg?.name && selectedOrg?.id) {
      await updateMutation.mutateAsync({
        id: selectedOrg.id,
        updates: { name },
      });
      await Promise.all([utils.organizations.get.invalidate({ id: selectedOrg.id })]);
    }
  }, [updateMutation, selectedOrg]);

  const [name, setName] = useState(selectedOrg?.name);
  useEffect(() => {
    setName(selectedOrg?.name);
  }, [selectedOrg?.name]);

  return (
    <AppShell>
      <PageHeaderContainer>
        <Breadcrumb>
          <BreadcrumbItem isCurrentPage>
            <Input
              size="sm"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={onSaveName}
              borderWidth={1}
              borderColor="transparent"
              fontSize={16}
              px={0}
              minW={{ base: 100, lg: 300 }}
              flex={1}
              _hover={{ borderColor: "gray.300" }}
              _focus={{ borderColor: "blue.500", outline: "none" }}
            />
          </BreadcrumbItem>
        </Breadcrumb>
      </PageHeaderContainer>
    </AppShell>
  );
}
