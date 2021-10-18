/**
 * Hits each endpoint and builds a struct containing
 * Home Team, Away Team, Event Date, Endpoint Name, Endpoint ID
 * Then attempts to map each event to each endpoint using the NBA as the master record
 *
 * @privateRemarks probably need to use some kind of fuzzy matching to match teams unless we mapped each team ID
 */

import fs from "fs";
import { api } from "../api";
import { getDates, getDateString } from "./getDates";
import chalk from "chalk";
import { JsonInput } from "../../types";
import prompts from "prompts";
import {
  abbreviationMap,
  getTeamFromNbaAbbreviation,
  getTeamFromEspnAbbreviation,
  capitalizeTeamName,
} from "./nbaAbbreviationMap";

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
  if (!fs.existsSync(`./feeds`)) {
    fs.mkdirSync(`./feeds`);
  }
  if (!fs.existsSync(`./feeds/nba`)) {
    fs.mkdirSync(`./feeds/nba`);
  }
  if (!fs.existsSync(`./feeds/nba/${date}`)) {
    fs.mkdirSync(`./feeds/nba/${date}`);
  }
  if (!fs.existsSync(`./feeds/nba/${date}/raw`)) {
    fs.mkdirSync(`./feeds/nba/${date}/raw`);
  }
  const strippedDate = date.replaceAll("-", "");
  // console.log(strippedDate, date);

  // Parse NBA response and build EventKind array
  const nbaApi = `https://data.nba.net/prod/v2/${strippedDate}/scoreboard.json`;
  const nbaResponse: any = await api(nbaApi);
  const nbaResponseEvents: any[] = nbaResponse.games;
  const nbaEvents: EventKind[] = nbaResponseEvents.map((e) => {
    return {
      Endpoint: "nba",
      EndpointId: e.gameId,
      HomeTeam: getTeamFromNbaAbbreviation(e.hTeam.triCode),
      AwayTeam: getTeamFromNbaAbbreviation(e.vTeam.triCode),
      EventDate: new Date(e.startTimeUTC),
    };
  });
  if (nbaEvents && nbaEvents.length > 0) {
    fs.writeFileSync(
      `./feeds/nba/${date}/raw/nba.json`,
      JSON.stringify(nbaResponseEvents, null, 2)
    );
    fs.writeFileSync(
      `./feeds/nba/${date}/nba.json`,
      JSON.stringify(nbaEvents, null, 2)
    );
  } else {
    console.error(chalk.red(`failed to get nba events on ${date}`));
  }

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

  // Parse Yahoo response and build EventKind array
  const yahooApi = `https://api-secure.sports.yahoo.com/v1/editorial/s/scoreboard?leagues=nba&date=${date}`;
  const yahooResponse: any = await api(yahooApi);
  const yahooResponseEvents: any[] = yahooResponse.service.scoreboard.games
    ? Object.values(yahooResponse.service.scoreboard.games)
    : [];
  const yahooEvents: EventKind[] = yahooResponseEvents.map((e) => {
    const boxscoreId: string = e.navigation_links.boxscore.url;
    const gameId = boxscoreId.replace("/nba/", "").replace("/", "");
    const [home, away] = mapYahooNames(gameId);
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
  const eventMatches: JsonInput[] = matches.map((match) => {
    const name = `${capitalizeTeamName(
      match.Nba.AwayTeam
    )}_at_${capitalizeTeamName(match.Nba.HomeTeam)}_${getDateString(
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

export async function main(): Promise<void> {
  const answer = await prompts([
    {
      type: "number",
      name: "numDays",
      message: "How many days do you want to fetch data for? (1-200)",
    },
  ]);
  const dates = await getDates(answer.numDays);
  let allMatches: JsonInput[] = [];
  for await (const d of dates) {
    const matches: JsonInput[] = await fetchNbaFeeds(d);
    if (!matches) console.error(`failed to fetch feeds for ${d}`);
    allMatches = allMatches.concat(matches);
  }
  if (allMatches) {
    fs.writeFileSync(
      `./feeds/nba/JsonInput.json`,
      JSON.stringify(allMatches, null, 2)
    );
    const header = "Date,Name,NBA ID,ESPN ID,Yahoo ID";
    const csvLines: string[] = allMatches.map(
      (m) =>
        `${getDateString(m.date)},${m.name},${m.nbaId},${m.espnId},${m.yahooId}`
    );
    csvLines.unshift(header);
    fs.writeFileSync(`./feeds/nba/AllFeeds.csv`, csvLines.join("\r\n"));
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

/**
 * Yahoo uses the same abbreviation and naming as NBA so using reverse map
 * to lookuo values
 */
const mapYahooNames = (gameId: string): [string, string] => {
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
