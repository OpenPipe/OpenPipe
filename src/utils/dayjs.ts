import dayjs from "dayjs";
import duration from "dayjs/plugin/duration";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(duration);
dayjs.extend(relativeTime);

export const formatTimePast = (date: Date) => {
    const now = dayjs();
    const dayDiff = Math.floor(now.diff(date, "day"));
    if (dayDiff > 0) return dayjs.duration(-dayDiff, "days").humanize(true);
    
    const hourDiff = Math.floor(now.diff(date, "hour"));
    if (hourDiff > 0) return dayjs.duration(-hourDiff, "hours").humanize(true);

    const minuteDiff = Math.floor(now.diff(date, "minute"));
    if (minuteDiff > 0) return dayjs.duration(-minuteDiff, "minutes").humanize(true);

    return 'a few seconds ago'
};
