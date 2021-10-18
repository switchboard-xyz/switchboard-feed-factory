import { EventKind } from "../fetchNbaFeeds";
import { api } from "../../api";
import { getTeamFromEspnAbbreviation } from "../nbaAbbreviationMap";
import fs from "fs";
import chalk from "chalk";

export async function getEspnEvents(date: string): Promise<EventKind[]> {
  const strippedDate = date.replaceAll("-", "");

  // Parse ESPN response and build EventKind array
  const espnApi = `https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard?dates=${strippedDate}`;
  const espnResponse: any = await api(espnApi);
  const espnResponseEvents: any[] = espnResponse.events;
  const espnEvents: EventKind[] = espnResponseEvents.map((e) => {
    const teams: string[] = e.shortName.split(" @ ", 2); // away @ home
    return {
      Endpoint: "espn",
      EndpointId: e.id,
      HomeTeam: getTeamFromEspnAbbreviation(teams[1]),
      AwayTeam: getTeamFromEspnAbbreviation(teams[0]),
      EventDate: new Date(e.date),
    };
  });
  if (espnEvents && espnEvents.length > 0) {
    fs.writeFileSync(
      `./feeds/nba/${date}/raw/espn.json`,
      JSON.stringify(espnResponseEvents, null, 2)
    );
    fs.writeFileSync(
      `./feeds/nba/${date}/espn.json`,
      JSON.stringify(espnEvents, null, 2)
    );
  } else {
    console.error(chalk.red(`failed to get espn events on ${date}`));
  }
  return espnEvents;
}
