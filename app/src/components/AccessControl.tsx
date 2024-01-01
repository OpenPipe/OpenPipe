import { Tooltip, type TooltipProps, FormControl, ButtonGroup } from "@chakra-ui/react";

import { type AccessCheck } from "~/utils/accessControl";
import { api } from "~/utils/api";
import { useSelectedProject } from "~/utils/hooks";

export const useAccessCheck = (accessCheck: AccessCheck) => {
  const selectedProject = useSelectedProject().data;

  return (
    api.users.checkAccess.useQuery({
      accessCheck,
      projectId: selectedProject?.id,
    }).data ?? { access: false, message: "" }
  );
};

const AccessCheck = (
  props: {
    check: AccessCheck;
    accessDeniedText?: string;
    hideTooltip?: boolean;
  } & TooltipProps,
) => {
  const { check, accessDeniedText, hideTooltip, children, ...rest } = props;
  const checkOutput = useAccessCheck(check);

  const tooltipText = !checkOutput.access && (accessDeniedText ?? checkOutput?.message);

  return (
    <Tooltip label={tooltipText} isDisabled={checkOutput.access || hideTooltip} hasArrow {...rest}>
      <ButtonGroup isDisabled={!checkOutput.access} w={rest.w}>
        <FormControl isDisabled={!checkOutput.access} w={rest.w}>
          {children}
        </FormControl>
      </ButtonGroup>
    </Tooltip>
  );
};

export default AccessCheck;
