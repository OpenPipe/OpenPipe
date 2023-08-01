import dayjs from "dayjs";
import duration from "dayjs/plugin/duration";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(duration);
dayjs.extend(relativeTime);

export const formatTimePast = (date: Date) =>
  dayjs.duration(dayjs(date).diff(dayjs())).humanize(true);

export default dayjs;
