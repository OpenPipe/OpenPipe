import { Text } from "@chakra-ui/react";
import { useEffect, useState } from "react";
import pluralize from "pluralize";

export const RetryCountdown = ({ retryTime }: { retryTime: Date }) => {
  const [msToWait, setMsToWait] = useState(0);

  useEffect(() => {
    const initialWaitTime = retryTime.getTime() - Date.now();
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
  }, [retryTime]);

  if (msToWait <= 0) return null;

  return (
    <Text color="red.600" fontSize="sm">
      Retrying in {pluralize("second", Math.ceil(msToWait / 1000), true)}...
    </Text>
  );
};
