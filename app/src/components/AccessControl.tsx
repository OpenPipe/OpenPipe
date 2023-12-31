import { Tooltip, type TooltipProps, FormControl, ButtonGroup } from "@chakra-ui/react";

import { type AccessLevel } from "~/utils/accessControl";
import { api } from "~/utils/api";
import { useSelectedProject } from "~/utils/hooks";

export const useAccessControl = (accessLevel: AccessLevel) => {
  const selectedProject = useSelectedProject().data;

  return api.users.checkAccess.useQuery({
    projectId: selectedProject?.id,
    accessLevel,
  });
};

const AccessControl = ({
  accessLevel,
  accessDeniedText,
  hideTooltip,
  w = "fit-content",
  children,
  ...rest
}: {
  accessLevel: AccessLevel;
  accessDeniedText?: string;
  hideTooltip?: boolean;
} & TooltipProps) => {
  const access = useAccessControl(accessLevel).data;

  if (access || accessDeniedText) {
    // pass
  } else if (accessLevel === "requireCanViewProject") {
    accessDeniedText = "You don't have access to view this project.";
  } else if (accessLevel === "requireCanModifyProject") {
    accessDeniedText = "Only project members can perform this action";
  } else if (accessLevel === "requireIsProjectAdmin") {
    accessDeniedText = "Only project admins can perform this action";
  } else if (accessLevel === "requireCanModifyPruningRule") {
    accessDeniedText = "You don't have access to modify this pruning rule.";
  } else if (accessLevel === "requireIsAdmin") {
    accessDeniedText = "You must be an admin to perform this action.";
  }

  return (
    <Tooltip label={accessDeniedText} isDisabled={access || hideTooltip} hasArrow {...rest}>
      <ButtonGroup isDisabled={!access} w={w}>
        <FormControl isDisabled={!access} w={w}>
          {children}
        </FormControl>
      </ButtonGroup>
    </Tooltip>
  );
};

export default AccessControl;
