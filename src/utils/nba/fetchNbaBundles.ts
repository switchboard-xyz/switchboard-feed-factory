/**
 * Hits each endpoint and builds a struct containing
 * Home Team, Away Team, Event Date, Endpoint Name, Endpoint ID
 * Then attempts to map each event to each endpoint using the NBA as the master record
 *
 * @privateRemarks probably need to use some kind of fuzzy matching to match teams unless we mapped each team ID
 */

import chalk from "chalk";
import fs from "fs";
import { nbaFactory } from "../../jobs/nba";
import { BundleOutput } from "../../types";
import { toDateString } from "../toDateString";
import { getEspnEvents } from "./jobs/espn";
import { getNbaEvents } from "./jobs/nba";
import { getYahooEvents } from "./jobs/yahoo";
import { capitalizeTeamName } from "./nbaAbbreviationMap";

interface EventKind {
  Endpoint: string;
  EndpointId: string;
  HomeTeam: string;
  AwayTeam: string;
  EventDate: Date; // UTC
}

interface Event {
  Nba: EventKind;
  Espn?: EventKind;
  Yahoo?: EventKind;
}

const logRed = (log: any) => console.log(chalk.red(log));

const findEventFromNba = (nbaEvent: EventKind, events: EventKind[]) =>
  events.find(
    (e) => e.HomeTeam === nbaEvent.HomeTeam && e.AwayTeam === nbaEvent.AwayTeam
  );

export async function fetchNbaBundles(date: string): Promise<BundleOutput[]> {
  const nbaEvents = await getNbaEvents(date);
  const espnEvents = await getEspnEvents(date);
  const yahooEvents = await getYahooEvents(date);
  if (!nbaEvents || nbaEvents.length === 0) return [];

  // match NBA to ESPN & Yahoo list
  const matches: Event[] = nbaEvents.map((nbaEvent) => {
    const m: Event = { Nba: nbaEvent };
    // find ESPN event
    m.Espn = findEventFromNba(nbaEvent, espnEvents);
    if (!m.Espn)
      logRed(
        `Failed to match ESPN event for ${nbaEvent.AwayTeam} @ ${nbaEvent.HomeTeam}`
      );
    m.Yahoo = findEventFromNba(nbaEvent, yahooEvents);
    if (!m.Yahoo)
      logRed(
        `Failed to match Yahoo event for ${nbaEvent.AwayTeam} @ ${nbaEvent.HomeTeam}`
      );
    return m;
  });
  if (!matches || matches.length === 0) {
    console.error(`failed to find any event matches on ${date}`);
  } else {
    if (!fs.existsSync(`./bundles/nba/${date}`))
      fs.mkdirSync(`./bundles/nba/${date}`);
    fs.writeFileSync(
      `./bundles/nba/${date}/full_matches.json`,
      JSON.stringify(matches, null, 2)
    );
  }

  const eventBundles = matches.map<BundleOutput>((match) => {
    const matchJobs: EventKind[] = [];
    if (match.Espn) matchJobs.push(match.Espn);
    if (match.Yahoo) matchJobs.push(match.Yahoo);

    return {
      title:
        `${capitalizeTeamName(match.Nba.AwayTeam)} @ ` +
        `${capitalizeTeamName(match.Nba.HomeTeam)} Result ` +
        `(${toDateString(match.Nba.EventDate)})`,
      description:
        `A bundle of jobs that return the result of the match when the event ` +
        `finishes. A result of 1 indicates that the home team won while a ` +
        `result of 2 indicates that the away team won.`,
      category: `Sports`,
      isMainnet: true,
      displayType: "none",
      jobs: matchJobs.map((src) =>
        JSON.stringify(
          nbaFactory({ jobProvider: src.Endpoint, jobId: src.EndpointId }).job
        )
      ),
      tags: ["NBA"],
    };
  });
  fs.writeFileSync(
    `./bundles/nba/${date}/${date}_JsonInput.json`,
    JSON.stringify(eventBundles, null, 2)
  );

  const matchCount: string = matches.length.toString().padStart(2, " ");
  const nbaCount = matches
    .filter((m) => m.Nba)
    .length.toString()
    .padStart(2, " ");
  const espnCount = matches
    .filter((m) => m.Espn)
    .length.toString()
    .padStart(2, " ");
  const yahooCount = matches
    .filter((m) => m.Yahoo)
    .length.toString()
    .padStart(2, " ");

  console.log(
    `${chalk.blue(date)}: ${chalk.yellow(matchCount)} events  [${chalk.yellow(
      nbaCount
    )} NBA / ${chalk.yellow(espnCount)} ESPN / ${chalk.yellow(
      yahooCount
    )} Yahoo ]`
  );
  return eventBundles;
}
