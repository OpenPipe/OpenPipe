import {
  extendTheme,
  defineStyleConfig,
  ChakraProvider,
  createStandaloneToast,
} from "@chakra-ui/react";
import "@fontsource/inconsolata";
import { cardAnatomy, modalAnatomy } from "@chakra-ui/anatomy";
import { createMultiStyleConfigHelpers } from "@chakra-ui/styled-system";

const systemFont =
  'ui-sans-serif, -apple-system, "system-ui", "Segoe UI", Helvetica, "Apple Color Emoji", Arial, sans-serif, "Segoe UI Emoji", "Segoe UI Symbol"';

/* eslint-disable @typescript-eslint/unbound-method */
const modal = createMultiStyleConfigHelpers(modalAnatomy.keys);

const card = createMultiStyleConfigHelpers(cardAnatomy.keys);

const modalTheme = modal.defineMultiStyleConfig({
  baseStyle: modal.definePartsStyle({
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
    Card: card.defineMultiStyleConfig({
      baseStyle: card.definePartsStyle({
        container: {
          boxShadow: "unset",
          borderColor: "gray.300",
          borderWidth: 1,
          // borderRadius: "md",
        },
      }),
    }),
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
