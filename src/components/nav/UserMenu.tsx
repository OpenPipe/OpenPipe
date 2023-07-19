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
} from "@chakra-ui/react";
import { type Session } from "next-auth";
import { signOut } from "next-auth/react";
import { BsBoxArrowRight, BsChevronRight, BsPersonCircle } from "react-icons/bs";

export default function UserMenu({ user }: { user: Session }) {
  const profileImage = user.user.image ? (
    <Image src={user.user.image} alt="profile picture" w={8} h={8} borderRadius="50%" />
  ) : (
    <Icon as={BsPersonCircle} boxSize="md" />
  );

  return (
    <>
      <Popover placement="right">
        <PopoverTrigger>
          <HStack
            px={2}
            py={2}
            borderColor={"gray.200"}
            borderTopWidth={1}
            borderBottomWidth={1}
            cursor="pointer"
            _hover={{
              bgColor: "gray.200",
            }}
          >
            {profileImage}
            <VStack spacing={0} align="start" flex={1}>
              <Text fontWeight="bold" fontSize="sm">
                {user.user.name}
              </Text>
              <Text color="gray.500" fontSize="xs">
                {user.user.email}
              </Text>
            </VStack>
            <Icon as={BsChevronRight} boxSize={4} color="gray.500" />
          </HStack>
        </PopoverTrigger>
        <PopoverContent _focusVisible={{ boxShadow: "unset", outline: "unset" }} maxW="200px">
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
    </>
  );
}
