import prompts from "prompts";

export async function selectSport(): Promise<string> {
  const answer = await prompts([
    {
      type: "select",
      name: "sport",
      message: "Pick a sport",
      choices: [
        {
          title: "English Premier League (epl.feeds.json)",
          value: "epl",
        },
        {
          title: "National Basketball Association (nba.feeds.json)",
          value: "nba",
        },
      ],
    },
  ]);
  return answer.sport;
}
