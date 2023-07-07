import dayjs from "dayjs";
import pluralize from "pluralize";

export const formatTimePast = (date: Date) => {
    const now = dayjs();
    const dayDiff = Math.floor(now.diff(date, "day"));
    if (dayDiff > 0) return `${pluralize('day', dayDiff, true)} ago`;
    
    const hourDiff = Math.floor(now.diff(date, "hour"));
    if (hourDiff > 0) return `${pluralize('hour', hourDiff, true)} ago`;

    const minuteDiff = Math.floor(now.diff(date, "minute"));
    if (minuteDiff > 0) return `${pluralize('minute', minuteDiff, true)} ago`;

    return 'a few seconds ago'
};
