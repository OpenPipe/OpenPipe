import { type ScenarioVariantCell } from "@prisma/client";
import { VStack, Text } from "@chakra-ui/react";
import { useEffect, useState } from "react";
import pluralize from "pluralize";

export const ErrorHandler = ({
  cell,
  refetchOutput,
}: {
  cell: ScenarioVariantCell;
  refetchOutput: () => void;
}) => {
  const [msToWait, setMsToWait] = useState(0);

  useEffect(() => {
    if (!cell.retryTime) return;

    const initialWaitTime = cell.retryTime.getTime() - Date.now();
    const msModuloOneSecond = initialWaitTime % 1000;
    let remainingTime = initialWaitTime - msModuloOneSecond;
    setMsToWait(remainingTime);

    let interval: NodeJS.Timeout;
    const timeout = setTimeout(() => {
      interval = setInterval(() => {
        remainingTime -= 1000;
        setMsToWait(remainingTime);

        if (remainingTime <= 0) {
          clearInterval(interval);
        }
      }, 1000);
    }, msModuloOneSecond);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [cell.retryTime, cell.statusCode, setMsToWait, refetchOutput]);

  return (
    <VStack w="full">
      <Text color="red.600" wordBreak="break-word">
        {cell.errorMessage}
      </Text>
      {msToWait > 0 && (
        <Text color="red.600" fontSize="sm">
          Retrying in {pluralize("second", Math.ceil(msToWait / 1000), true)}...
        </Text>
      )}
    </VStack>
  );
};
