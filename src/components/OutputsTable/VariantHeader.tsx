import { Button, Stack, Title } from "@mantine/core";
import { useMonaco } from "@monaco-editor/react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { PromptVariant } from "./types";
import { api } from "~/utils/api";
import { useHandledAsyncCallback } from "~/utils/hooks";
import { notifications } from "@mantine/notifications";
import { type JSONSerializable } from "~/server/types";
import VariantConfigEditor from "./VariantConfigEditor";

export default function VariantHeader({ variant }: { variant: PromptVariant }) {
  const replaceWithConfig = api.promptVariants.replaceWithConfig.useMutation();
  const utils = api.useContext();

  const onSave = useCallback(
    async (currentConfig: string) => {
      let parsedConfig: JSONSerializable;
      try {
        parsedConfig = JSON.parse(currentConfig) as JSONSerializable;
      } catch (e) {
        notifications.show({
          title: "Invalid JSON",
          message: "Please fix the JSON before saving.",
          color: "red",
        });
        return;
      }

      if (parsedConfig === null) {
        notifications.show({
          title: "Invalid JSON",
          message: "Please fix the JSON before saving.",
          color: "red",
        });
        return;
      }

      await replaceWithConfig.mutateAsync({
        id: variant.id,
        config: currentConfig,
      });

      await utils.promptVariants.list.invalidate();

      // TODO: invalidate the variants query
    },
    [variant.id, replaceWithConfig]
  );

  return (
    <Stack w="100%">
      <Title order={4}>{variant.label}</Title>
      <VariantConfigEditor
        initialConfig={JSON.stringify(variant.config, null, 2)}
        onSave={onSave}
      />
    </Stack>
  );
}
