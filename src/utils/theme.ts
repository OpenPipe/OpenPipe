import { extendTheme } from "@chakra-ui/react";
import "@fontsource/poppins";
import "@fontsource/roboto";

const theme = extendTheme({
  fonts: {
    heading: "Poppins, sans-serif",
    body: "Roboto, sans-serif",
  },
});

export default theme;
