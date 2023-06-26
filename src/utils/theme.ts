import { extendTheme } from "@chakra-ui/react";

const systemFont =
  'ui-sans-serif, -apple-system, "system-ui", "Segoe UI", Helvetica, "Apple Color Emoji", Arial, sans-serif, "Segoe UI Emoji", "Segoe UI Symbol"';

const theme = extendTheme({
  fonts: {
    heading: systemFont,
    body: systemFont,
  },

  components: {
    Button: {
      baseStyle: {
        borderRadius: "sm",
      },
    },
    Input: {
      sizes: {
        md: {
          field: {
            borderRadius: "sm",
          },
        },
      },
    },
  },
});

export default theme;
