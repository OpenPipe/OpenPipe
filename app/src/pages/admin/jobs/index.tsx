import { Card, Table, Tbody, Td, Th, Thead, Tr } from "@chakra-ui/react";
import dayjs from "dayjs";
import { isDate, isObject, isString } from "lodash-es";
import AppShell from "~/components/nav/AppShell";
import { type RouterOutputs, api } from "~/utils/api";

const fieldsToShow: (keyof RouterOutputs["adminJobs"]["list"][0])[] = [
  "id",
  "task_id",
  "payload",
  "priority",
  "attempts",
  "last_error",
  "created_at",
  "key",
  "locked_at",
  "run_at",
];

export default function Jobs() {
  const jobs = api.adminJobs.list.useQuery({});

  return (
    <AppShell title="Admin Jobs">
      <Card m={4} overflowX="auto">
        <Table>
          <Thead>
            <Tr>
              {fieldsToShow.map((field) => (
                <Th key={field}>{field}</Th>
              ))}
            </Tr>
          </Thead>
          <Tbody>
            {jobs.data?.map((job) => (
              <Tr key={job.id}>
                {fieldsToShow.map((field) => {
                  // Check if object
                  let value = job[field];
                  if (isDate(value)) {
                    value = dayjs(value).format("YYYY-MM-DD HH:mm:ss");
                  } else if (isObject(value) && !isString(value)) {
                    value = JSON.stringify(value);
                  } // check if date
                  return <Td key={field}>{value}</Td>;
                })}
              </Tr>
            ))}
          </Tbody>
        </Table>
      </Card>
    </AppShell>
  );
}
