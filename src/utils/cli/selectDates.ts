import prompts, { Choice } from "prompts";
import chalk from "chalk";
import { toDateString } from "../toDateString";

function getNextNDays(numDays: number): string[] {
  const days: string[] = [];
  const today = new Date();
  for (let i = 0; i < numDays; i++) {
    const nextDate = new Date();
    nextDate.setDate(today.getDate() + i);
    days.push(toDateString(nextDate));
  }
  // console.log(
  //   `${chalk.blue(days[0])} ${chalk.yellow("-")} ${chalk.blue(days[-1])}`
  // );
  return days;
}

export async function selectDates(): Promise<string[]> {
  const numDaysAnswer = await prompts([
    {
      type: "number",
      name: "numDays",
      message: "Number of days to fetch events for",
    },
  ]);
  const days = getNextNDays(numDaysAnswer.numDays);
  const choices: Choice[] = days.map((d) => {
    return { title: d, value: d };
  });
  const answer = await prompts([
    {
      type: "multiselect",
      name: "date",
      message: "Pick a date to fetch events for",
      choices,
    },
  ]);
  console.log(
    `${chalk.blue(answer.date[0])} ${chalk.yellow("-")} ${chalk.blue(
      answer.date[answer.date.length - 1]
    )}`
  );
  // console.log(answer.date);
  return answer.date;
}
