import { Icon, HStack, Text, type BoxProps } from "@chakra-ui/react";
import Link, { type LinkProps } from "next/link";
import { type IconType } from "react-icons";
import NavSidebarOption from "./NavSidebarOption";

type IconLinkProps = BoxProps &
  LinkProps & { label?: string; icon: IconType; href: string; beta?: boolean };

const IconLink = ({ icon, label, href, color, beta, ...props }: IconLinkProps) => {
  return (
    <Link href={href} style={{ width: "100%" }}>
      <NavSidebarOption activeHrefPattern={href}>
        <HStack w="full" justifyContent="space-between" p={2} color={color} {...props}>
          <HStack w="full" justifyContent="start">
            <Icon as={icon} boxSize={6} mr={2} />
            <Text fontSize="sm" display={{ base: "none", md: "block" }}>
              {label}
            </Text>
          </HStack>
          {beta && (
            <Text fontSize="xs" ml={2} fontWeight="bold" color="orange.400">
              BETA
            </Text>
          )}
        </HStack>
      </NavSidebarOption>
    </Link>
  );
};

export default IconLink;
