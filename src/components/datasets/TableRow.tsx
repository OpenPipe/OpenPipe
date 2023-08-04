import { Th, Tr } from "@chakra-ui/react";
import { type DatasetEntry } from "@prisma/client";

const TableRow = ({ entry }: { entry: DatasetEntry }) => {
  return (
    <Tr key={entry.id}>
      <Th>{entry.input}</Th>
      <Th>{entry.output}</Th>
    </Tr>
  );
};

export default TableRow;