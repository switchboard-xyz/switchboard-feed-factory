/**
 * Hits each endpoint and builds a struct containing
 * Home Team, Away Team, Event Date, Endpoint Name, Endpoint ID
 * Then attempts to map each event to each endpoint using the NBA as the master record
 *
 * @privateRemarks probably need to use some kind of fuzzy matching to match teams unless we mapped each team ID
 */

import fs from "fs";
import { api } from "./api";
import { getDates, getDateString } from "./getDates";
import chalk from "chalk";
import { JsonInput } from "../types";

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

export async function fetchNbaFeeds(date: string): Promise<boolean> {
  if (!fs.existsSync(`./feeds/nba/${date}`)) {
    fs.mkdirSync(`./feeds/nba/${date}`);
  }
  if (!fs.existsSync(`./feeds/nba/${date}/raw`)) {
    fs.mkdirSync(`./feeds/nba/${date}/raw`);
  }
  const strippedDate = date.replaceAll("-", "");
  console.log(strippedDate, date);
  const nbaApi = `https://data.nba.net/prod/v2/${strippedDate}/scoreboard.json`;
  const nbaResponse: any = await api(nbaApi);
  const nbaResponseEvents: any[] = nbaResponse.games;
  const nbaEvents: EventKind[] = nbaResponseEvents.map((e) => {
    return {
      Endpoint: "nba",
      EndpointId: e.gameId,
      HomeTeam: e.hTeam.triCode,
      AwayTeam: e.vTeam.triCode,
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

  const espnApi = `https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard?dates=${strippedDate}`;
  const espnResponse: any = await api(espnApi);
  const espnResponseEvents: any[] = espnResponse.events;
  const espnEvents: EventKind[] = espnResponseEvents.map((e) => {
    const teams: string[] = e.shortName.split(" @ ", 2); // away @ home
    const home = mapEspnAbbreviations(teams[1]);
    const away = mapEspnAbbreviations(teams[0]);
    return {
      Endpoint: "espn",
      EndpointId: e.id,
      HomeTeam: home,
      AwayTeam: away,
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

  const yahooApi = `https://api-secure.sports.yahoo.com/v1/editorial/s/scoreboard?leagues=nba&date=${date}`;
  const yahooResponse: any = await api(yahooApi);
  const yahooResponseEvents: any[] = yahooResponse.service.scoreboard.games
    ? Object.values(yahooResponse.service.scoreboard.games)
    : [];
  const yahooEvents: EventKind[] = yahooResponseEvents.map((e) => {
    const boxscoreId: string = e.navigation_links.boxscore.url;
    const gameId = boxscoreId.replace("/nba/", "").replace("/", "");
    let [parsedGameId, AwayTeam, HomeTeam] = [gameId, "", ""];
    [parsedGameId, AwayTeam] = mapYahooNames(parsedGameId);
    [parsedGameId, HomeTeam] = mapYahooNames(parsedGameId);
    return {
      Endpoint: "yahoo",
      EndpointId: gameId,
      HomeTeam: HomeTeam,
      AwayTeam: AwayTeam,
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
    if (m.Espn === null)
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
    if (m.Espn === null)
      console.log(
        chalk.red(
          `failed to match Yahoo event for ${nbaEvent.AwayTeam} @ ${nbaEvent.HomeTeam}`
        )
      );
    return m;
  });
  if (matches && matches.length > 0) {
    fs.writeFileSync(
      `./feeds/nba/${date}/full_matches.json`,
      JSON.stringify(matches, null, 2)
    );
    const output: JsonInput[] = matches.map((match) => {
      const name = `${abbreviationMap.get(
        match.Nba.AwayTeam
      )}_at_${abbreviationMap.get(match.Nba.HomeTeam)}_${getDateString(
        match.Nba.EventDate
      )}`;
      const jsonInput: JsonInput = {
        name: name,
        nbaId: match.Nba.EndpointId,
        yahooId: match.Yahoo?.EndpointId,
        espnId: match.Espn?.EndpointId,
      };
      return jsonInput;
    });
    fs.writeFileSync(
      `./feeds/nba/${date}/${date}_ExpectedInput.json`,
      JSON.stringify(output, null, 2)
    );
  } else {
    console.error(chalk.red(`failed to get matches on ${date}`));
  }
  return true;
}

export async function main(): Promise<void> {
  const dates = await getDates(21);
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

const mapEspnAbbreviations = (espnAbbreviation: string): string => {
  if (espnAbbreviationMap.has(espnAbbreviation)) {
    const abbr = espnAbbreviationMap.get(espnAbbreviation);
    if (abbr) return abbr;
  }
  return espnAbbreviation;
};

/**
 * Yahoo uses the same abbreviation and naming as NBA so using reverse map
 * to lookuo values
 */
const mapYahooNames = (gameId: string): [string, string] => {
  for (const [abbreviation, name] of abbreviationMap) {
    if (gameId.startsWith(name)) {
      const Team = abbreviation;
      return [gameId.replace(`${abbreviationMap.get(Team)}-`, ""), Team];
    }
  }
  console.error(`failed to find yahoo abbreviation for ${gameId}`);
  return [gameId, ""];
};

// yahoo uses same abbreviations as NBA
const abbreviationMap: Map<string, string> = new Map([
  ["ATL", "atlanta-hawks"],
  ["BOS", "boston-celtics"],
  ["CHA", "charlotte-hornets"],
  ["CHI", "chicago-bulls"],
  ["CLE", "cleveland-cavaliers"],
  ["DAL", "dallas-mavericks"],
  ["DEN", "denver-nuggets"],
  ["DET", "detroit-pistons"],
  ["GSW", "golden-state-warriors"],
  ["HOU", "houston-rockets"],
  ["IND", "indiana-pacers"],
  ["LAC", "los-angeles-clippers"],
  ["LAL", "los-angeles-lakers"],
  ["MEM", "memphis-grizzlies"],
  ["MIA", "miami-heat"],
  ["MIL", "milwaukee-bucks"],
  ["MIN", "minnesota-timberwolves"],
  ["NOH", "new-orleans-pelicans"],
  ["NYK", "new-york-knicks"],
  ["BKN", "brooklyn-nets"],
  ["OKC", "oklahoma-city-thunder"],
  ["ORL", "orlando-magic"],
  ["PHI", "philadelphia-76ers"],
  ["PHO", "phoenix-suns"],
  ["POR", "portland-trail-blazers"],
  ["SA", "san-antonio-spurs"],
  ["SAC", "sacramento-kings"],
  ["TOR", "toronto-raptors"],
  ["UTH", "utah-jazz"],
  ["WAS", "washington-wizards"],
]);

// mapping between ESPNs abbreviation and NBA/Yahoos 3 letter tricode
// <Espn Abbreviation, Nba Abbreviation>
const espnAbbreviationMap: Map<string, string> = new Map([
  ["ATL", "ATL"],
  ["BOS", "BOS"],
  ["CHA", "CHA"],
  ["CHI", "CHI"],
  ["CLE", "CLE"],
  ["DAL", "DAL"],
  ["DEN", "DEN"],
  ["DET", "DET"],
  ["GS", "GSW"], // different
  ["HOU", "HOU"],
  ["IND", "IND"],
  ["LAC", "LAC"],
  ["LAL", "LAL"],
  ["MEM", "MEM"],
  ["MIA", "MIA"],
  ["MIL", "MIL"],
  ["MIN", "MIN"],
  ["NO", "NOH"], // different
  ["NYK", "NY"],
  ["BKN", "BKN"],
  ["OKC", "OKC"],
  ["ORL", "ORL"],
  ["PHI", "PHI"],
  ["PHX", "PHO"], // different
  ["POR", "POR"],
  ["SA", "SA"],
  ["SAC", "SAC"],
  ["TOR", "TOR"],
  ["UTH", "UTA"], // different
  ["WSH", "WAS"], // different
]);
