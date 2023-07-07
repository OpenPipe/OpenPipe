import { type ModelOutput } from "@prisma/client";
import { HStack, VStack, Text, Button, Icon } from "@chakra-ui/react";
import { useEffect, useState } from "react";
import { BsArrowClockwise } from "react-icons/bs";
import { rateLimitErrorMessage } from "~/sharedStrings";
import pluralize from "pluralize";

const MAX_AUTO_RETRIES = 3;

export const ErrorHandler = ({
  output,
  refetchOutput,
  numPreviousTries,
}: {
  output: ModelOutput;
  refetchOutput: () => void;
  numPreviousTries: number;
}) => {
  const [msToWait, setMsToWait] = useState(0);
  const shouldAutoRetry =
    output.errorMessage === rateLimitErrorMessage && numPreviousTries < MAX_AUTO_RETRIES;

  useEffect(() => {
    if (!shouldAutoRetry) return;

    const initialWaitTime = calculateDelay(numPreviousTries);
    const msModuloOneSecond = initialWaitTime % 1000;
    let remainingTime = initialWaitTime - msModuloOneSecond;
    setMsToWait(remainingTime);

    let interval: NodeJS.Timeout;
    const timeout = setTimeout(() => {
      interval = setInterval(() => {
        remainingTime -= 1000;
        setMsToWait(remainingTime);

        if (remainingTime <= 0) {
          refetchOutput();
          clearInterval(interval);
        }
      }, 1000);
    }, msModuloOneSecond);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [shouldAutoRetry, setMsToWait, refetchOutput, numPreviousTries]);

  return (
    <VStack w="full">
      <HStack w="full" alignItems="flex-start" justifyContent="space-between">
        <Text color="red.600" fontWeight="bold">
          Error
        </Text>
        <Button
          size="xs"
          w={4}
          h={4}
          px={4}
          py={4}
          minW={0}
          borderRadius={8}
          variant="ghost"
          cursor="pointer"
          onClick={refetchOutput}
          aria-label="refetch output"
        >
          <Icon as={BsArrowClockwise} boxSize={6} />
        </Button>
      </HStack>
      <Text color="red.600" wordBreak="break-word">
        {output.errorMessage}
      </Text>
      {msToWait > 0 && (
        <Text color="red.600" fontSize="sm">
          Retrying in {pluralize("second", Math.ceil(msToWait / 1000), true)}...
        </Text>
      )}
    </VStack>
  );
};

const MIN_DELAY = 500; // milliseconds
const MAX_DELAY = 5000; // milliseconds

function calculateDelay(numPreviousTries: number): number {
  const baseDelay = Math.min(MAX_DELAY, MIN_DELAY * Math.pow(2, numPreviousTries));
  const jitter = Math.random() * baseDelay;
  return baseDelay + jitter;
}
