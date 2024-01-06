import { Card, HStack, Image, Text } from "@chakra-ui/react";
import { useRouter } from "next/router";
import AsyncSelect from "react-select/async";

import AppShell from "~/components/nav/AppShell";
import { type RouterOutputs, api } from "~/utils/api";
import { useHandledAsyncCallback } from "~/utils/hooks";

export default function Impersonate() {
  const impersonateMutation = api.adminUsers.impersonate.useMutation();
  const utils = api.useContext();

  const router = useRouter();

  const [impersonate] = useHandledAsyncCallback(
    async (userId: string) => {
      await impersonateMutation.mutateAsync({ id: userId });
      window.location.replace("/");
    },
    [impersonateMutation, router],
  );

  const loadOptions = async (inputValue: string) => {
    if (inputValue.length > 3) {
      return await utils.adminUsers.search.fetch({ query: inputValue });
    }
  };

  return (
    <AppShell title="Admin Impersonate">
      <Card m={4} p={4}>
        <AsyncSelect<RouterOutputs["adminUsers"]["search"][0]>
          // @ts-expect-error for some reason their types are bad
          loadOptions={loadOptions}
          onChange={(option) => option && impersonate(option.id)}
          getOptionLabel={(option) => `${option.name ?? ""} (${option.email ?? ""})`}
          getOptionValue={(option) => option.id}
          formatOptionLabel={(option) => (
            <HStack>
              {option.image && (
                <Image
                  src={option.image}
                  alt={option.name ?? "user"}
                  w={8}
                  h={8}
                  borderRadius={4}
                />
              )}
              <Text>
                {option.name} ({option.email})
              </Text>
            </HStack>
          )}
        />
        {/* <Button colorScheme="blue" onClick={impersonate}>
            Impersonate
          </Button> */}
      </Card>
    </AppShell>
  );
}
