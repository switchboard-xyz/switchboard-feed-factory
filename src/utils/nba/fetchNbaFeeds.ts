/**
 * Hits each endpoint and builds a struct containing
 * Home Team, Away Team, Event Date, Endpoint Name, Endpoint ID
 * Then attempts to map each event to each endpoint using the NBA as the master record
 *
 * @privateRemarks probably need to use some kind of fuzzy matching to match teams unless we mapped each team ID
 */

import chalk from "chalk";
import fs from "fs";
import { BundleOutput, JsonInput } from "../../types";
import { toDateString } from "../toDateString";
import { getEspnEvents } from "./jobs/espn";
import { getNbaEvents } from "./jobs/nba";
import { getYahooEvents } from "./jobs/yahoo";
import { capitalizeTeamName } from "./nbaAbbreviationMap";

export interface EventKind {
  Endpoint: string;
  EndpointId: string;
  HomeTeam: string;
  AwayTeam: string;
  EventDate: Date; // UTC
}

export interface Event {
  Nba: EventKind;
  Espn?: EventKind;
  Yahoo?: EventKind;
}

export async function fetchNbaFeeds(date: string): Promise<JsonInput[]> {
  const nbaEvents = await getNbaEvents(date);
  const espnEvents = await getEspnEvents(date);
  const yahooEvents = await getYahooEvents(date);
  if (!nbaEvents || nbaEvents.length === 0) return [];

  // match NBA to ESPN & Yahoo list
  const matches: Event[] = nbaEvents.map((nbaEvent) => {
    const m: Event = {
      Nba: nbaEvent,
    };
    // find ESPN event
    m.Espn = espnEvents.find(
      (espnEvent) =>
        espnEvent.HomeTeam === nbaEvent.HomeTeam &&
        espnEvent.AwayTeam === nbaEvent.AwayTeam
    );
    if (!m.Espn)
      console.log(
        chalk.red(
          `failed to match ESPN event for ${nbaEvent.AwayTeam} @ ${nbaEvent.HomeTeam}`
        )
      );
    m.Yahoo = yahooEvents.find(
      (yahooEvent) =>
        yahooEvent.HomeTeam === nbaEvent.HomeTeam &&
        yahooEvent.AwayTeam === nbaEvent.AwayTeam
    );
    if (!m.Yahoo)
      console.log(
        chalk.red(
          `failed to match Yahoo event for ${nbaEvent.AwayTeam} @ ${nbaEvent.HomeTeam}`
        )
      );
    return m;
  });
  if (!matches || matches.length === 0) {
    console.error(`failed to find any event matches on ${date}`);
  }

  fs.writeFileSync(
    `./feeds/nba/${date}/full_matches.json`,
    JSON.stringify(matches, null, 2)
  );

  const eventMatches2: BundleOutput[] = [];
  for (const match of matches) {
    const name = `${capitalizeTeamName(
      match.Nba.AwayTeam
    )} @ ${capitalizeTeamName(match.Nba.HomeTeam)} (${toDateString(
      match.Nba.EventDate
    )})`;
  }

  const eventMatches: JsonInput[] = matches.map((match) => {
    const name = `${capitalizeTeamName(
      match.Nba.AwayTeam
    )} at ${capitalizeTeamName(match.Nba.HomeTeam)} ${toDateString(
      match.Nba.EventDate
    )}`;
    const jsonInput: JsonInput = {
      name: name,
      date: match.Nba.EventDate,
      nbaId: match.Nba.EndpointId,
      yahooId: match.Yahoo?.EndpointId,
      espnId: match.Espn?.EndpointId,
    };
    return jsonInput;
  });
  fs.writeFileSync(
    `./feeds/nba/${date}/${date}_JsonInput.json`,
    JSON.stringify(eventMatches, null, 2)
  );
  const matchCount: string = eventMatches.length.toString().padStart(2, " ");
  const nbaCount = eventMatches
    .filter((m) => m.nbaId)
    .length.toString()
    .padStart(2, " ");
  const espnCount = eventMatches
    .filter((m) => m.espnId)
    .length.toString()
    .padStart(2, " ");
  const yahooCount = eventMatches
    .filter((m) => m.yahooId)
    .length.toString()
    .padStart(2, " ");

  console.log(
    `${chalk.blue(date)}: ${chalk.yellow(matchCount)} events  [${chalk.yellow(
      nbaCount
    )} NBA / ${chalk.yellow(espnCount)} ESPN / ${chalk.yellow(
      yahooCount
    )} Yahoo ]`
  );
  return eventMatches;
}
