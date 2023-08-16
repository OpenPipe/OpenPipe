import { useState } from "react";
import {
  Table,
  Thead,
  Tr,
  Th,
  Tbody,
  Td,
  IconButton,
  useDisclosure,
  Text,
  Button,
} from "@chakra-ui/react";
import { useSession } from "next-auth/react";
import { BsTrash } from "react-icons/bs";
import { type User } from "@prisma/client";

import { useHandledAsyncCallback, useSelectedProject } from "~/utils/hooks";
import { InviteMemberModal } from "./InviteMemberModal";
import { RemoveMemberDialog } from "./RemoveMemberDialog";
import { api } from "~/utils/api";
import { maybeReportError } from "~/utils/errorHandling/maybeReportError";

const MemberTable = () => {
  const selectedProject = useSelectedProject().data;
  const session = useSession().data;

  const utils = api.useContext();

  const [memberToRemove, setMemberToRemove] = useState<User | null>(null);
  const inviteMemberModal = useDisclosure();

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
      <Table>
        <Thead>
          <Tr>
            <Th>Name</Th>
            <Th>Email</Th>
            <Th>Role</Th>
            {selectedProject?.role === "ADMIN" && <Th />}
          </Tr>
        </Thead>
        <Tbody>
          {selectedProject?.projectUsers.map((member) => {
            return (
              <Tr key={member.id}>
                <Td>
                  <Text fontWeight="bold">{member.user.name}</Text>
                </Td>
                <Td>{member.user.email}</Td>
                <Td fontSize="sm">{member.role}</Td>
                {selectedProject.role === "ADMIN" && (
                  <Td textAlign="end">
                    {member.user.id !== session?.user?.id && (
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
      <InviteMemberModal isOpen={inviteMemberModal.isOpen} onClose={inviteMemberModal.onClose} />
      <RemoveMemberDialog
        member={memberToRemove}
        isOpen={!!memberToRemove}
        onClose={() => setMemberToRemove(null)}
      />
    </>
  );
};

export default MemberTable;
