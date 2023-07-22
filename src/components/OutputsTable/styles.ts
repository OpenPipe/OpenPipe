import { type GridItemProps, type SystemStyleObject } from "@chakra-ui/react";

export const stickyHeaderStyle: SystemStyleObject = {
  position: "sticky",
  top: "0",
  backgroundColor: "#fff",
  zIndex: 10,
};

export const borders: GridItemProps = {
  borderRightWidth: 1,
  borderBottomWidth: 1,
};
