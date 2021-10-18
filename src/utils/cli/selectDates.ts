import prompts from "prompts";
import { toDateString } from "../toDateString";

export async function selectDateRange(): Promise<string[]> {
  const today = new Date();
  const dates = await prompts([
    {
      type: "date",
      name: "startDate",
      message: "Start date",
      initial: new Date(today.getFullYear(), today.getMonth(), today.getDate()),
    },
    {
      type: "date",
      name: "endDate",
      message: "End date",
      initial: new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate() + 7
      ),
    },
  ]);
  let start: Date = dates.startDate;
  let end: Date = dates.endDate;
  if (dates.startDate > dates.endDate) {
    start = dates.endDate;
    end = dates.startDate;
  }
  let date = start;
  const output: string[] = [];
  while (date <= end) {
    output.push(toDateString(date));
    const nextDay = date;
    nextDay.setDate(date.getDate() + 1);
    date = nextDay;
  }
  return output;
}
