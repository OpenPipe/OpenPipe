import { HStack, VStack, Text } from "@chakra-ui/react";
import dayjs from "dayjs";

export const ResponseLog = ({
  time,
  title,
  message,
}: {
  time: Date;
  title: string;
  message?: string;
}) => {
  return (
    <VStack spacing={0} alignItems="flex-start">
      <HStack>
        <Text>{dayjs(time).format("HH:mm:ss")}</Text>
        <Text>{title}</Text>
      </HStack>
      {message && <Text pl={4}>{message}</Text>}
    </VStack>
  );
};
