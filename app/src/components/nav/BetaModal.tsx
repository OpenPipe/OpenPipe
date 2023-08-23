import {
  Button,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  VStack,
  Text,
  HStack,
  Icon,
  Link,
} from "@chakra-ui/react";
import { BsStars } from "react-icons/bs";
import { useRouter } from "next/router";
import { useSession } from "next-auth/react";

export const BetaModal = () => {
  const router = useRouter();
  const session = useSession();

  const email = session.data?.user.email ?? "";

  return (
    <Modal
      isOpen
      onClose={router.back}
      closeOnOverlayClick={false}
      size={{ base: "xl", md: "2xl" }}
    >
      <ModalOverlay />
      <ModalContent w={1200}>
        <ModalHeader>
          <HStack>
            <Icon as={BsStars} />
            <Text>Beta-Only Feature</Text>
          </HStack>
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody maxW="unset">
          <VStack spacing={8} py={4} alignItems="flex-start">
            <Text fontSize="md">
              This feature is currently in beta. To receive early access to beta-only features, join
              the waitlist. You'll receive an email at <b>{email}</b> when you're approved.
            </Text>
          </VStack>
        </ModalBody>
        <ModalFooter>
          <HStack spacing={4}>
            <Button
              as={Link}
              textDecoration="none !important"
              colorScheme="orange"
              target="_blank"
              href={`https://ax3nafkw0jp.typeform.com/to/ZNpYqvAc#email=${email}`}
            >
              Join Waitlist
            </Button>
            <Button colorScheme="blue" onClick={router.back}>
              Done
            </Button>
          </HStack>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
