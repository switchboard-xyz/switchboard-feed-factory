/**
 * Hits each endpoint and builds a struct containing
 * Home Team, Away Team, Event Date, Endpoint Name, Endpoint ID
 * Then attempts to map each event to each endpoint using the NBA as the master record
 *
 * @privateRemarks probably need to use some kind of fuzzy matching to match teams unless we mapped each team ID
 */

import fs from "fs";
import { api } from "./api";
import { getDates } from "./getDates";
import chalk from "chalk";

export interface EventKind {
  Endpoint: string;
  EndpointId: string;
  HomeTeam: string;
  AwayTeam: string;
  EventDate: Date;
}

export interface Event {
  Nba: EventKind;
  Espn?: EventKind;
  Yahoo?: EventKind;
}

export async function fetchNbaFeeds(date: string): Promise<boolean> {
  const strippedDate = date.replaceAll("-", "");
  const nbaApi = `https://data.nba.net/prod/v2/${strippedDate}/scoreboard.json`;
  const nbaResponse: any = await api(nbaApi);
  const nbaEvents: any[] = nbaResponse.games;
  if (nbaEvents && nbaEvents.length > 0) {
    fs.writeFileSync(
      `./feeds/nba/nba-${date}.json`,
      JSON.stringify(nbaEvents, null, 2)
    );
  } else {
    console.error(chalk.red(`failed to get nba events on ${date}`));
  }

  const espnApi = `https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard?dates=${strippedDate}`;
  const espnResponse: any = await api(espnApi);
  const espnEvents: any[] = espnResponse.events;
  if (espnEvents && espnEvents.length > 0) {
    fs.writeFileSync(
      `./feeds/nba/espn-${date}.json`,
      JSON.stringify(espnEvents, null, 2)
    );
  } else {
    console.error(chalk.red(`failed to get espn events on ${date}`));
  }

  const yahooApi = `https://api-secure.sports.yahoo.com/v1/editorial/s/scoreboard?leagues=nba&date=${date}`;
  const yahooResponse: any = await api(yahooApi);
  const yahooEvents: any[] = yahooResponse.service.scoreboard.games;
  if (yahooEvents && yahooEvents.length > 0) {
    fs.writeFileSync(
      `./feeds/nba/yahoo-${date}.json`,
      JSON.stringify(yahooEvents, null, 2)
    );
  } else {
    console.error(chalk.red(`failed to get yahoo events on ${date}`));
  }

  return true;
}

export async function main(): Promise<void> {
  const dates = await getDates();
  for await (const d of dates) {
    const complete = await fetchNbaFeeds(d);
    if (!complete) console.error(`failed to fetch feeds for ${d}`);
  }
}

main().then(
  () => {
    console.log(chalk.green("Succesfully fetched NBA Feeds"));
    process.exit();
  },
  (err) => {
    console.error(err);
  }
);
