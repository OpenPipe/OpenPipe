import { Tooltip, type TooltipProps, FormControl, ButtonGroup } from "@chakra-ui/react";

import { type AccessCheck } from "~/utils/accessControl";
import { api } from "~/utils/api";
import { useSelectedProject } from "~/utils/hooks";

export const useAccessCheck = (accessCheck: AccessCheck) => {
  const selectedProject = useSelectedProject().data;

  return (
    api.users.checkAccess.useQuery({
      accessCheck,
      projectId: selectedProject?.id ?? null,
    }).data ?? { access: false, message: "" }
  );
};

const ConditionallyEnable = (
  props: {
    accessRequired?: AccessCheck;
    accessDeniedText?: string;
    checks?: [boolean, string][];
    hideTooltip?: boolean;
  } & TooltipProps,
) => {
  const {
    accessRequired = "requireNothing",
    accessDeniedText,
    checks = [],
    hideTooltip,
    children,
    ...rest
  } = props;

  const accessCheck = useAccessCheck(accessRequired);
  const selectedProjectNotHidden = useSelectedProject().data?.isHidden !== true;
  const failingCheck = [
    [selectedProjectNotHidden, "This project is archived. No further changes can be made."],
    ...checks,
  ]?.find(([check]) => !check);

  const disableChildren = !accessCheck.access || !!failingCheck;
  const tooltipText = !accessCheck.access
    ? accessDeniedText ?? accessCheck.message
    : failingCheck?.[1] ?? "";

  return (
    <Tooltip label={tooltipText} isDisabled={!disableChildren || hideTooltip} hasArrow {...rest}>
      <ButtonGroup isDisabled={disableChildren} w={rest.w}>
        <FormControl isDisabled={disableChildren} w={rest.w}>
          {children}
        </FormControl>
      </ButtonGroup>
    </Tooltip>
  );
};

export default ConditionallyEnable;
