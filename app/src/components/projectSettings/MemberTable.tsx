import { useMemo, useState } from "react";
import { Table, Thead, Tr, Th, Tbody, Td, IconButton, Text, Button } from "@chakra-ui/react";
import { useSession } from "next-auth/react";
import { BsTrash } from "react-icons/bs";
import { type User } from "@prisma/client";

import { useHandledAsyncCallback, useSelectedProject } from "~/utils/hooks";
import { RemoveMemberDialog } from "./RemoveMemberDialog";
import { api } from "~/utils/api";
import { maybeReportError } from "~/utils/errorHandling/maybeReportError";

const MemberTable = () => {
  const selectedProject = useSelectedProject().data;
  const session = useSession().data;

  const utils = api.useContext();

  const [memberToRemove, setMemberToRemove] = useState<User | null>(null);

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

  const sortedMembers = useMemo(() => {
    if (!selectedProject?.projectUsers) return [];
    return selectedProject.projectUsers.sort((a, b) => {
      if (a.role === b.role) return a.createdAt < b.createdAt ? -1 : 1;
      // Take advantage of fact that ADMIN is alphabetically before MEMBER
      return a.role < b.role ? -1 : 1;
    });
  }, [selectedProject?.projectUsers]);

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
            {selectedProject?.role === "ADMIN" && <Th />}
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
            sortedMembers.map((member) => {
              return (
                <Tr key={member.id}>
                  <Td>
                    <Text fontWeight="bold">{member.user.name}</Text>
                  </Td>
                  <Td display={{ base: "none", md: "table-cell" }} h="full">
                    {member.user.email}
                  </Td>
                  <Td fontSize={{ base: "xs", md: "sm" }}>{member.role}</Td>
                  {selectedProject.role === "ADMIN" && (
                    <Td textAlign="end">
                      {member.user.id !== session?.user?.id &&
                        member.user.id !== selectedProject.personalProjectUserId && (
                          <IconButton
                            aria-label="Remove member"
                            colorScheme="red"
                            icon={<BsTrash />}
                            onClick={() => setMemberToRemove(member.user)}
                          />
                        )}
                    </Td>
                  )}
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
                {selectedProject.role === "ADMIN" && (
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
      <RemoveMemberDialog
        member={memberToRemove}
        isOpen={!!memberToRemove}
        onClose={() => setMemberToRemove(null)}
      />
    </>
  );
};

export default MemberTable;
