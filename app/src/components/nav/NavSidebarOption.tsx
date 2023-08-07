import { Box, type BoxProps } from "@chakra-ui/react";
import { useRouter } from "next/router";

const NavSidebarOption = ({
  activeHrefPattern,
  ...props
}: { activeHrefPattern?: string } & BoxProps) => {
  const router = useRouter();
  const isActive = activeHrefPattern && router.pathname.startsWith(activeHrefPattern);
  return (
    <Box
      w="full"
      fontWeight={isActive ? "bold" : "500"}
      bgColor={isActive ? "gray.200" : "transparent"}
      _hover={{ bgColor: "gray.200", textDecoration: "none" }}
      justifyContent="start"
      cursor="pointer"
      borderRadius={4}
      {...props}
    >
      {props.children}
    </Box>
  );
};

export default NavSidebarOption;
