import type { WorkoutProgram } from '@/types/workout';

const millisecondsPerDay = 24 * 60 * 60 * 1000;
const daysPerProgramWeek = 7;

const startOfDay = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate());

const parseValidDate = (value: string | undefined, fallback: Date) => {
  if (!value) {
    return fallback;
  }

  const parsedDate = new Date(value);

  return Number.isNaN(parsedDate.getTime()) ? fallback : parsedDate;
};

const getProgramStartDate = (program: WorkoutProgram, today: Date) =>
  parseValidDate(program.startDate, today);

export const getCurrentProgramWeekIndex = (program: WorkoutProgram, today = new Date()) => {
  const programStart = startOfDay(getProgramStartDate(program, today));
  const currentDay = startOfDay(today);
  const daysSinceProgramStart = Math.floor(
    (currentDay.getTime() - programStart.getTime()) / millisecondsPerDay
  );

  return Math.max(0, Math.floor(daysSinceProgramStart / daysPerProgramWeek));
};

export const getProgramWeekBounds = (program: WorkoutProgram, today = new Date()) => {
  const programStart = startOfDay(getProgramStartDate(program, today));
  const weekIndex = getCurrentProgramWeekIndex(program, today);
  const weekStart = new Date(
    programStart.getTime() + weekIndex * daysPerProgramWeek * millisecondsPerDay
  );
  const weekEnd = new Date(weekStart.getTime() + daysPerProgramWeek * millisecondsPerDay - 1);

  return { weekEnd, weekIndex, weekStart };
};
