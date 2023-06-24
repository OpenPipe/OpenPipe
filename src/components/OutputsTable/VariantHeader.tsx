import { useCallback } from "react";
import type { PromptVariant } from "./types";
import { api } from "~/utils/api";
import { type JSONSerializable } from "~/server/types";
import VariantConfigEditor from "./VariantConfigEditor";
import EditableVariantLabel from "./EditableVariantLabel";
import { Stack, useToast } from "@chakra-ui/react";

export default function VariantHeader({ variant }: { variant: PromptVariant }) {
  const replaceWithConfig = api.promptVariants.replaceWithConfig.useMutation();
  const utils = api.useContext();
  const toast = useToast();

  const onSave = useCallback(
    async (currentConfig: string) => {
      let parsedConfig: JSONSerializable;
      try {
        parsedConfig = JSON.parse(currentConfig) as JSONSerializable;
      } catch (e) {
        toast({
          title: "Invalid JSON",
          description: "Please fix the JSON before saving.",
          status: "error",
        });
        return;
      }

      if (parsedConfig === null) {
        toast({
          title: "Invalid JSON",
          description: "Please fix the JSON before saving.",
          status: "error",
        });
        return;
      }

      await replaceWithConfig.mutateAsync({
        id: variant.id,
        config: currentConfig,
      });

      await utils.promptVariants.list.invalidate();
    },
    [variant.id, replaceWithConfig, utils.promptVariants.list, toast]
  );

  return (
    <Stack w="100%">
      <EditableVariantLabel variant={variant} />
      <VariantConfigEditor savedConfig={JSON.stringify(variant.config, null, 2)} onSave={onSave} />
    </Stack>
  );
}
