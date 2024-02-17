import { useState } from "react";
import { Table, Thead, Tr, Th, Tbody, Td, IconButton, Text, Button } from "@chakra-ui/react";
import { useSession } from "next-auth/react";
import { BsTrash } from "react-icons/bs";

import { useHandledAsyncCallback, useSelectedProject } from "~/utils/hooks";
import { RemoveProjectUserDialog, type ProjectUser } from "./RemoveProjectUserDialog";
import { api } from "~/utils/api";
import { maybeReportError } from "~/utils/errorHandling/maybeReportError";
import ConditionallyEnable, { useAccessCheck } from "../ConditionallyEnable";

const ProjectUserTable = () => {
  const selectedProject = useSelectedProject().data;
  const session = useSession().data;

  const isAdmin = useAccessCheck("requireIsProjectAdmin").access;
  const owner = selectedProject?.projectUsers.find((u) => u.role === "OWNER");
  const utils = api.useContext();

  const [projectUserToRemove, setProjectUserToRemove] = useState<ProjectUser | null>(null);

  const cancelInvitationMutation = api.users.cancelProjectInvitation.useMutation();

  const [cancelInvitation, isCancelling] = useHandledAsyncCallback(
    async (invitationToken: string) => {
      if (!selectedProject?.id) return;
      const resp = await cancelInvitationMutation.mutateAsync({
        invitationToken,
      });
      if (maybeReportError(resp)) return;
      await utils.projects.get.invalidate();
    },
    [selectedProject?.id, cancelInvitationMutation],
  );

  return (
    <>
      <Table fontSize={{ base: "sm", md: "md" }}>
        <Thead
          sx={{
            th: {
              base: { px: 0 },
              md: { px: 6 },
            },
          }}
        >
          <Tr>
            <Th>Name</Th>
            <Th display={{ base: "none", md: "table-cell" }}>Email</Th>
            <Th>Role</Th>
            <Th />
          </Tr>
        </Thead>
        <Tbody
          sx={{
            td: {
              base: { px: 0 },
              md: { px: 6 },
            },
          }}
        >
          {selectedProject &&
            selectedProject.projectUsers.map((member) => {
              return (
                <Tr key={member.userId}>
                  <Td>
                    <Text fontWeight="bold">{member.name}</Text>
                  </Td>
                  <Td display={{ base: "none", md: "table-cell" }} h="full">
                    {member.email}
                  </Td>
                  <Td fontSize={{ base: "xs", md: "sm" }}>{member.role}</Td>
                  <Td textAlign="end">
                    {(member.userId === session?.user?.id || isAdmin) &&
                      member.userId !== selectedProject.personalProjectUserId && (
                        <ConditionallyEnable
                          checks={[
                            [member.userId !== owner?.userId, "You are the owner of this project."],
                          ]}
                        >
                          <IconButton
                            aria-label="Remove member"
                            colorScheme="red"
                            icon={<BsTrash />}
                            onClick={() => setProjectUserToRemove(member)}
                          />
                        </ConditionallyEnable>
                      )}
                  </Td>
                </Tr>
              );
            })}
          {selectedProject?.projectUserInvitations?.map((invitation) => {
            return (
              <Tr key={invitation.id}>
                <Td>
                  <Text as="i">Invitation pending</Text>
                </Td>
                <Td>{invitation.email}</Td>
                <Td fontSize="sm">{invitation.role}</Td>
                {isAdmin && (
                  <Td textAlign="end">
                    <Button
                      size="sm"
                      colorScheme="red"
                      variant="ghost"
                      onClick={() => cancelInvitation(invitation.invitationToken)}
                      isLoading={isCancelling}
                    >
                      Cancel
                    </Button>
                  </Td>
                )}
              </Tr>
            );
          })}
        </Tbody>
      </Table>
      <RemoveProjectUserDialog
        projectUser={projectUserToRemove}
        isOpen={!!projectUserToRemove}
        onClose={() => setProjectUserToRemove(null)}
      />
    </>
  );
};

export default ProjectUserTable;
