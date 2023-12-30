import { Box, type BoxProps, forwardRef } from "@chakra-ui/react";
import { useRouter } from "next/router";

const NavSidebarOption = forwardRef<
  { activeHrefPattern?: string; disableHoverEffect?: boolean } & BoxProps,
  "div"
>(({ activeHrefPattern, disableHoverEffect, ...props }, ref) => {
  const router = useRouter();
  const isActive = activeHrefPattern && router.pathname.includes(activeHrefPattern);
  return (
    <Box
      w="full"
      fontWeight={isActive ? "bold" : "500"}
      bgColor={isActive ? "gray.200" : "transparent"}
      _hover={disableHoverEffect ? undefined : { bgColor: "gray.200", textDecoration: "none" }}
      justifyContent="start"
      cursor="pointer"
      borderRadius={4}
      {...props}
      ref={ref}
    >
      {props.children}
    </Box>
  );
});

NavSidebarOption.displayName = "NavSidebarOption";

export default NavSidebarOption;
