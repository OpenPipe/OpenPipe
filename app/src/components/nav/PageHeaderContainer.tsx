import { Flex, type FlexProps } from "@chakra-ui/react";

const PageHeaderContainer = (props: FlexProps) => {
  return <Flex
    px={8}
    py={2}
    w="full"
    direction={{ base: "column", sm: "row" }}
    alignItems={{ base: "flex-start", sm: "center" }}
    justifyContent="space-between"
    {...props}
  />;
};

export default PageHeaderContainer;
