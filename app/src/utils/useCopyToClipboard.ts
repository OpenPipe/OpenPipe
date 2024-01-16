import { useToast } from "@chakra-ui/react";

export const useCopyToClipboard = () => {
  const toast = useToast();

  const copyToClipboard = async (text?: string) => {
    try {
      await navigator.clipboard.writeText(text as string);
      toast({
        title: "Copied to clipboard",
        status: "success",
        duration: 2000,
      });
    } catch (err) {
      toast({
        title: "Failed to copy to clipboard",
        status: "error",
        duration: 2000,
      });
    }
  };

  return copyToClipboard;
};
