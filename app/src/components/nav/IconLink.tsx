import { Icon, HStack, Text, type BoxProps } from "@chakra-ui/react";
import Link, { type LinkProps } from "next/link";
import { type IconType } from "react-icons";
import NavSidebarOption from "./NavSidebarOption";

type IconLinkProps = BoxProps & LinkProps & { label?: string; icon: IconType; href: string };

const IconLink = ({ icon, label, href, color, ...props }: IconLinkProps) => {
  return (
    <Link href={href} style={{ width: "100%" }}>
      <NavSidebarOption activeHrefPattern={href}>
        <HStack w="full" p={2} color={color} justifyContent="start" {...props}>
          <Icon as={icon} boxSize={6} mr={2} />
          <Text fontSize="sm">
            {label}
          </Text>
        </HStack>
      </NavSidebarOption>
    </Link>
  );
};

export default IconLink;
