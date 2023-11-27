import { HStack, Text, Icon, Button, Link } from "@chakra-ui/react";
import { BsStars } from "react-icons/bs";
import { useSession } from "next-auth/react";
import { useIsMissingBetaAccess } from "~/utils/hooks";
import { useAppStore } from "~/state/store";

const BetaBanner = () => {
  const session = useSession();

  const isMissingBetaAccess = useIsMissingBetaAccess();
  const betaBannerDismissed = useAppStore((state) => state.betaBannerDismissed);
  const dismissBetaBanner = useAppStore((state) => state.dismissBetaBanner);

  if (!isMissingBetaAccess || betaBannerDismissed) {
    return null;
  }

  const email = session.data?.user.email ?? "";
  return (
    <HStack
      w="full"
      justifyContent="space-between"
      bgColor="white"
      borderBottom="1px solid"
      borderColor="gray.300"
      py={2}
      px={8}
      display={{ base: "none", md: "flex" }}
    >
      <HStack>
        <Icon as={BsStars} color="orange.400" />
        <Text>
          Fine-tuning Llama2 and Mistral models is currently in beta. To receive early access to
          beta-only features,{" "}
          <Link
            href={`https://ax3nafkw0jp.typeform.com/to/ZNpYqvAc#email=${email}`}
            target="_blank"
            color="orange.400"
          >
            join the waitlist
          </Link>
          .
        </Text>
      </HStack>
      <HStack>
        <Button variant="outline" colorScheme="gray" onClick={dismissBetaBanner}>
          Dismiss
        </Button>
      </HStack>
    </HStack>
  );
};

export default BetaBanner;
