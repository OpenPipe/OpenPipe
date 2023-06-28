import { Flex, Icon, Link, Text } from "@chakra-ui/react";
import { BsExclamationTriangleFill } from "react-icons/bs";
import { env } from "~/env.mjs";

export default function PublicPlaygroundWarning() {
  if (!env.NEXT_PUBLIC_IS_PUBLIC_PLAYGROUND) return null;

  return (
    <Flex bgColor="red.600" color="whiteAlpha.900" p={2} align="center">
      <Icon boxSize={4} mr={2} as={BsExclamationTriangleFill} />
      <Text>
        Warning: this is a public playground. Anyone can see, edit or delete your experiments. For
        private use,{" "}
        <Link textDecor="underline" href="https://github.com/corbt/prompt-lab" target="_blank">
          run a local copy
        </Link>
        .
      </Text>
    </Flex>
  );
}
