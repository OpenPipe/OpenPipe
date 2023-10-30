import dayjs from "dayjs";
import duration from "dayjs/plugin/duration";
import relativeTime from "dayjs/plugin/relativeTime";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(duration);
dayjs.extend(relativeTime);
dayjs.extend(timezone);

export const formatTimePast = (date: Date) =>
  dayjs.duration(dayjs(date).diff(dayjs())).humanize(true);

export const formatDateForPicker = (date: number) =>
  dayjs(new Date(date)).format("YYYY-MM-DD HH:mm");

export default dayjs;
