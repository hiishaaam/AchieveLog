import { format, parseISO, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, subWeeks, addWeeks, startOfMonth, endOfMonth, getWeeksInMonth, getWeek, getDay, getDaysInMonth, setMonth, setYear } from 'date-fns';

export const formatDate = (date: Date | string, formatStr: string = 'yyyy-MM-dd') => {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, formatStr);
};

export const getWeekDays = (date: Date) => {
  const start = startOfWeek(date, { weekStartsOn: 1 }); // Monday start
  const end = endOfWeek(date, { weekStartsOn: 1 });
  return eachDayOfInterval({ start, end });
};

export const formatDuration = (minutes: number) => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
};
