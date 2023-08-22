import {
  extendTheme,
  defineStyleConfig,
  ChakraProvider,
  createStandaloneToast,
} from "@chakra-ui/react";
import "@fontsource/inconsolata";
import { modalAnatomy } from "@chakra-ui/anatomy";
import { createMultiStyleConfigHelpers } from "@chakra-ui/styled-system";

const systemFont =
  'ui-sans-serif, -apple-system, "system-ui", "Segoe UI", Helvetica, "Apple Color Emoji", Arial, sans-serif, "Segoe UI Emoji", "Segoe UI Symbol"';

/* eslint-disable @typescript-eslint/unbound-method */
const { definePartsStyle, defineMultiStyleConfig } = createMultiStyleConfigHelpers(
  modalAnatomy.keys,
);

const modalTheme = defineMultiStyleConfig({
  baseStyle: definePartsStyle({
    dialog: { borderRadius: "md", mx: 4 },
  }),
});

const Divider = defineStyleConfig({
  baseStyle: {
    borderColor: "gray.300",
    backgroundColor: "gray.300",
  },
});

const theme = extendTheme({
  styles: {
    global: (props: { colorMode: "dark" | "light" }) => ({
      "html, body": {
        backgroundColor: props.colorMode === "dark" ? "gray.900" : "white",
      },
    }),
  },
  fonts: {
    heading: systemFont,
    body: systemFont,
  },

  components: {
    Button: {
      baseStyle: {
        borderRadius: "md",
      },
    },
    Input: {
      baseStyle: {
        field: {
          borderRadius: "sm",
        },
      },
    },
    Textarea: {
      baseStyle: {
        borderRadius: "sm",
        field: {
          borderRadius: "sm",
        },
      },
    },
    Modal: modalTheme,
    Divider,
  },
});

const { ToastContainer, toast } = createStandaloneToast(theme);

export { toast };

export const ChakraThemeProvider = ({ children }: { children: JSX.Element }) => {
  return (
    <ChakraProvider theme={theme}>
      <ToastContainer />
      {children}
    </ChakraProvider>
  );
};
