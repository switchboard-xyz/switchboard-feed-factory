/**
 * Hits each endpoint and builds a struct containing
 * Home Team, Away Team, Event Date, Endpoint Name, Endpoint ID
 * Then attempts to map each event to each endpoint using the ESPN as the master record
 *
 * @privateRemarks probably need to use some kind of fuzzy matching to match teams unless we mapped each team ID
 */

import chalk from "chalk";
import fs from "fs";
import { nflFactory } from "../../jobs/nfl";
import { BundleOutput } from "../../types";
import { toDateString } from "../toDateString";
import { getEspnEvents } from "./jobs/espn";
import { getYahooEvents } from "./jobs/yahoo";
import { capitalizeTeamName } from "./nflAbbreviationMap";

interface EventKind {
  Endpoint: string;
  EndpointId: string;
  HomeTeam: string;
  AwayTeam: string;
  EventDate: Date; // UTC
}

interface Event {
  Espn: EventKind;
  Yahoo?: EventKind;
}

const logRed = (log: any) => console.log(chalk.red(log));

const findEventFromNfl = (nflEvent: EventKind, events: EventKind[]) =>
  events.find(
    (e) => e.HomeTeam === nflEvent.HomeTeam && e.AwayTeam === nflEvent.AwayTeam
  );

export async function fetchNflBundles(date: string): Promise<BundleOutput[]> {
  const espnEvents = await getEspnEvents(date);
  const yahooEvents = await getYahooEvents(date);
  if (!espnEvents || espnEvents.length === 0) return [];

  // match ESPN to Yahoo list
  const matches: Event[] = espnEvents.map((espnEvent) => {
    const m: Event = { Espn: espnEvent };
    // find Yahoo event
    m.Yahoo = findEventFromNfl(espnEvent, yahooEvents);
    if (!m.Yahoo)
      logRed(
        `Failed to match Yahoo event for ${espnEvent.AwayTeam} @ ${espnEvent.HomeTeam}`
      );
    return m;
  });
  if (!matches || matches.length === 0) {
    console.error(`failed to find any event matches on ${date}`);
  } else {
    if (!fs.existsSync(`./bundles/nfl/${date}`))
      fs.mkdirSync(`./bundles/nfl/${date}`);
    fs.writeFileSync(
      `./bundles/nfl/${date}/full_matches.json`,
      JSON.stringify(matches, null, 2)
    );
  }

  const eventBundles = matches.map<BundleOutput>((match) => {
    const matchJobs = [match.Espn];
    if (match.Yahoo) matchJobs.push(match.Yahoo);

    return {
      title:
        `${capitalizeTeamName(match.Espn.AwayTeam)} @ ` +
        `${capitalizeTeamName(match.Espn.HomeTeam)} Result ` +
        `(${toDateString(match.Espn.EventDate)})`,
      description:
        `A bundle of jobs that return the result of the match when the event ` +
        `finishes. A result of 1 indicates that the home team won while a ` +
        `result of 2 indicates that the away team won.`,
      category: `Sports`,
      isMainnet: true,
      displayType: "none",
      eventDateUTC: match.Espn.EventDate.toUTCString(),
      jobs: matchJobs.map((src) =>
        JSON.stringify(
          nflFactory({ jobProvider: src.Endpoint, jobId: src.EndpointId }).job
        )
      ),
      tags: ["NFL"],
    };
  });
  fs.writeFileSync(
    `./bundles/nfl/${date}/${date}_JsonInput.json`,
    JSON.stringify(eventBundles, null, 2)
  );

  const matchCount: string = matches.length.toString().padStart(2, " ");
  const espnCount = matches
    .filter((m) => m.Espn)
    .length.toString()
    .padStart(2, " ");
  const yahooCount = matches
    .filter((m) => m.Yahoo)
    .length.toString()
    .padStart(2, " ");

  console.log(
    `${chalk.blue(date)}: ${chalk.yellow(matchCount)} events  [ ${chalk.yellow(
      espnCount
    )} ESPN / ${chalk.yellow(yahooCount)} Yahoo ]`
  );
  return eventBundles;
}
