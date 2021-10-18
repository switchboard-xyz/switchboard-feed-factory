import { EventKind } from "../fetchNbaFeeds";
import { api } from "../../api";
import { abbreviationMap } from "../nbaAbbreviationMap";
import fs from "fs";
import chalk from "chalk";

/**
 * Yahoo uses the same abbreviation and naming as NBA so using reverse map
 * to lookuo values
 */
const parseTeamNames = (gameId: string): [string, string] => {
  let [home, away] = ["", ""];
  let parsedGameId = gameId;
  for (const awayTeam of abbreviationMap.keys()) {
    if (parsedGameId.startsWith(awayTeam)) {
      away = awayTeam;
      parsedGameId = gameId.replace(`${away}-`, "");
      break;
    }
  }
  if (!away) {
    console.error(`failed to get away team for Yahoo ${gameId}`);
  }
  for (const homeTeam of abbreviationMap.keys()) {
    if (parsedGameId.startsWith(homeTeam)) {
      home = homeTeam;
      break;
    }
  }
  if (!home) console.error(`failed to get home team for Yahoo ${parsedGameId}`);
  if (home === away) {
    console.error(`failed to get correct home & away team for ${parsedGameId}`);
    return ["", away];
  }
  return [home, away];
};

export async function getYahooEvents(date: string): Promise<EventKind[]> {
  // Parse Yahoo response and build EventKind array
  const yahooApi = `https://api-secure.sports.yahoo.com/v1/editorial/s/scoreboard?leagues=nba&date=${date}`;
  const yahooResponse: any = await api(yahooApi);
  const yahooResponseEvents: any[] = yahooResponse.service.scoreboard.games
    ? Object.values(yahooResponse.service.scoreboard.games)
    : [];
  const yahooEvents: EventKind[] = yahooResponseEvents.map((e) => {
    const boxscoreId: string = e.navigation_links.boxscore.url;
    const gameId = boxscoreId.replace("/nba/", "").replace("/", "");
    const [home, away] = parseTeamNames(gameId);
    return {
      Endpoint: "yahoo",
      EndpointId: gameId,
      HomeTeam: home,
      AwayTeam: away,
      EventDate: new Date(date), // cheating a bit
    };
  });
  if (yahooResponseEvents && yahooResponseEvents.length > 0) {
    fs.writeFileSync(
      `./feeds/nba/${date}/raw/yahoo.json`,
      JSON.stringify(yahooResponseEvents, null, 2)
    );
    fs.writeFileSync(
      `./feeds/nba/${date}/yahoo.json`,
      JSON.stringify(yahooEvents, null, 2)
    );
  } else {
    console.error(chalk.red(`failed to get yahoo events on ${date}`));
  }
  return yahooEvents;
}
