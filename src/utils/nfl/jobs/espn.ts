import chalk from "chalk";
import fs from "fs";
import { JsonInput } from "../../../types";
import { api } from "../../api";
import { EventKind } from "../fetchNflFeeds";
import { getTeamFromEspnAbbreviation } from "../nflAbbreviationMap";

export async function getEspnEvents(date: string): Promise<EventKind[]> {
  const strippedDate = date.replaceAll("-", "");

  // Parse ESPN response and build EventKind array
  const espnApi = `https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?dates=${strippedDate}`;
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
    if (!fs.existsSync(`./feeds/nfl/${date}`)) {
      fs.mkdirSync(`./feeds/nfl/${date}`);
    }
    if (!fs.existsSync(`./feeds/nfl/${date}/raw`)) {
      fs.mkdirSync(`./feeds/nfl/${date}/raw`);
    }
    fs.writeFileSync(
      `./feeds/nfl/${date}/raw/espn.json`,
      JSON.stringify(espnResponseEvents, null, 2)
    );
    fs.writeFileSync(
      `./feeds/nfl/${date}/espn.json`,
      JSON.stringify(espnEvents, null, 2)
    );
  } else {
    console.error(chalk.red(`failed to get espn events on ${date}`));
  }
  return espnEvents;
}

export const getEspnEventUrl = (feed: JsonInput): string => {
  if (!feed.espnId) return "";
  return `https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard/${feed.espnId}`;
};
