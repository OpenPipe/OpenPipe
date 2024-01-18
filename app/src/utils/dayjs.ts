import dayjs from "dayjs";
import duration from "dayjs/plugin/duration";
import relativeTime from "dayjs/plugin/relativeTime";
import timezone from "dayjs/plugin/timezone";
import utc from "dayjs/plugin/utc"; // Import the UTC plugin

dayjs.extend(duration);
dayjs.extend(relativeTime);
dayjs.extend(timezone);
dayjs.extend(utc);

export const formatTimePast = (date: Date) =>
  dayjs.duration(dayjs(date).diff(dayjs())).humanize(true);

export const formatDateForPicker = (date: number) =>
  dayjs(new Date(date)).format("YYYY-MM-DD HH:mm");

export const formatToUTCDayMonth = (dateStr: string | Date) =>
  dayjs(dateStr).utc().format("DD MMM");

export const toUTC = (dateStr: string | Date) => dayjs(dateStr).utc();

export default dayjs;
