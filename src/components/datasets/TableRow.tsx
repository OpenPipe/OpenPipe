import { Td, Tr } from "@chakra-ui/react";
import { type DatasetEntry } from "@prisma/client";

const TableRow = ({ entry }: { entry: DatasetEntry }) => {
  return (
    <Tr key={entry.id}>
      <Td>{entry.input}</Td>
      <Td>{entry.output}</Td>
    </Tr>
  );
};

export default TableRow;