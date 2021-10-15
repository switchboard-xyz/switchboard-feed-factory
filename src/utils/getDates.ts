import prompts, { Choice } from "prompts";

function getNextNDays(numDays: number): string[] {
  const days: string[] = [];
  const today = new Date();
  for (let i = 0; i < numDays; i++) {
    const nextDate = new Date();
    nextDate.setDate(today.getDate() + i);
    days.push(
      `${nextDate.getFullYear()}-${(nextDate.getMonth() + 1)
        .toString()
        .padStart(2, "0")}-${nextDate.getDate().toString().padStart(2, "0")}`
    );
  }
  console.log(days);
  return days;
}

export async function getDates(): Promise<string[]> {
  const days = getNextNDays(7);
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
  console.log(answer.date);
  return answer.date;
}
