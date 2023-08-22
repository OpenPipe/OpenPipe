import {
  HStack,
  Icon,
  Image,
  VStack,
  Text,
  Popover,
  PopoverTrigger,
  PopoverContent,
  Link,
  type StackProps,
} from "@chakra-ui/react";
import { type Session } from "next-auth";
import { signOut } from "next-auth/react";
import { BsBoxArrowRight, BsChevronRight, BsPersonCircle } from "react-icons/bs";
import NavSidebarOption from "./NavSidebarOption";

export default function UserMenu({ user, ...rest }: { user: Session } & StackProps) {
  const profileImage = user.user.image ? (
    <Image src={user.user.image} alt="profile picture" boxSize={8} borderRadius="50%" />
  ) : (
    <Icon as={BsPersonCircle} boxSize={6} />
  );

  return (
    <Popover placement="right">
      <PopoverTrigger>
        <NavSidebarOption>
          <HStack
            // Weird values to make mobile look right; can clean up when we make the sidebar disappear on mobile
            py={2}
            px={1}
            spacing={3}
            {...rest}
          >
            {profileImage}
            <VStack spacing={0} align="start" flex={1} flexShrink={1}>
              <Text fontWeight="bold" fontSize="sm">
                {user.user.name}
              </Text>
              <Text color="gray.500" fontSize="xs">
                {/* {user.user.email} */}
              </Text>
            </VStack>
            <Icon as={BsChevronRight} boxSize={4} color="gray.500" />
          </HStack>
        </NavSidebarOption>
      </PopoverTrigger>
      <PopoverContent _focusVisible={{ outline: "unset" }} ml={-1} minW={48} w="full">
        <VStack align="stretch" spacing={0}>
          {/* sign out */}
          <HStack
            as={Link}
            onClick={() => {
              signOut().catch(console.error);
            }}
            px={4}
            py={2}
            spacing={4}
            color="gray.500"
            fontSize="sm"
          >
            <Icon as={BsBoxArrowRight} boxSize={6} />
            <Text>Sign out</Text>
          </HStack>
        </VStack>
      </PopoverContent>
    </Popover>
  );
}
