/**
 * Hits each endpoint and builds a struct containing
 * Home Team, Away Team, Event Date, Endpoint Name, Endpoint ID
 * Then attempts to map each event to each endpoint using the ESPN as the master record
 *
 * @privateRemarks probably need to use some kind of fuzzy matching to match teams unless we mapped each team ID
 */

import chalk from "chalk";
import fs from "fs";
import { JsonInput } from "../../types";
import { selectDateRange } from "../cli";
import { toDateString } from "../toDateString";
import { getEspnEvents, getEspnEventUrl } from "./jobs/espn";
import { getYahooEvents, getYahooEventUrl } from "./jobs/yahoo";
import { capitalizeTeamName } from "./nflAbbreviationMap";

export interface EventKind {
  Endpoint: string;
  EndpointId: string;
  HomeTeam: string;
  AwayTeam: string;
  EventDate: Date; // UTC
}

export interface Event {
  Espn: EventKind;
  Yahoo?: EventKind;
}

async function fetchNflFeeds(date: string): Promise<JsonInput[]> {
  const espnEvents = await getEspnEvents(date);
  const yahooEvents = await getYahooEvents(date);
  if (!espnEvents || espnEvents.length === 0) return [];

  // match ESPN to Yahoo list
  const matches: Event[] = espnEvents.map((espnEvent) => {
    const m: Event = { Espn: espnEvent };
    // find YAHOO event
    m.Yahoo = yahooEvents.find(
      (yahooEvent) =>
        yahooEvent.HomeTeam === espnEvent.HomeTeam &&
        yahooEvent.AwayTeam === espnEvent.AwayTeam
    );
    if (!m.Yahoo)
      console.log(
        chalk.red(
          `failed to match Yahoo event for ${espnEvent.AwayTeam} @ ${espnEvent.HomeTeam}`
        )
      );
    return m;
  });
  if (!matches || matches.length === 0) {
    console.error(`failed to find any event matches on ${date}`);
  }

  fs.writeFileSync(
    `./feeds/nfl/${date}/full_matches.json`,
    JSON.stringify(matches, null, 2)
  );

  const eventMatches: JsonInput[] = matches.map((match) => {
    const name = `${capitalizeTeamName(
      match.Espn.AwayTeam
    )} at ${capitalizeTeamName(match.Espn.HomeTeam)} ${toDateString(
      match.Espn.EventDate
    )}`;
    const jsonInput: JsonInput = {
      name: name,
      date: match.Espn.EventDate,
      espnId: match.Espn.EndpointId,
      yahooId: match.Yahoo?.EndpointId,
    };
    return jsonInput;
  });
  fs.writeFileSync(
    `./feeds/nfl/${date}/${date}_JsonInput.json`,
    JSON.stringify(eventMatches, null, 2)
  );
  const matchCount: string = eventMatches.length.toString().padStart(2, " ");
  const espnCount = eventMatches
    .filter((m) => m.espnId)
    .length.toString()
    .padStart(2, " ");
  const yahooCount = eventMatches
    .filter((m) => m.yahooId)
    .length.toString()
    .padStart(2, " ");

  console.log(
    `${chalk.blue(date)}: ${chalk.yellow(matchCount)} events  [ ${chalk.yellow(
      espnCount
    )} ESPN / ${chalk.yellow(yahooCount)} Yahoo ]`
  );
  return eventMatches;
}

export async function nfl(): Promise<boolean> {
  const dates = await selectDateRange();
  console.log(dates);
  const allMatches: JsonInput[] = [];

  for await (const d of dates) {
    const output = await fetchNflFeeds(d);
    if (!output.length) console.error(`failed to fetch feeds for ${d}`);
    allMatches.push(...output);
  }
  if (allMatches.length) {
    fs.writeFileSync(
      `./feeds/nfl/JsonInput.json`,
      JSON.stringify(allMatches, null, 2)
    );
    const header = "Date,Name,ESPN ID,Yahoo ID,ESPN Endpoint,Yahoo Endpoint,";
    const csvLines: string[] = allMatches.map(
      (m) =>
        `"${toDateString(m.date)}","${m.name}","${m.espnId}","${m.yahooId}","
        ${getEspnEventUrl(m)}","${getYahooEventUrl(m)}"`
    );
    csvLines.unshift(header);
    fs.writeFileSync(`./feeds/nfl/AllFeeds.csv`, csvLines.join("\r\n"));
  }
  return true;
}
