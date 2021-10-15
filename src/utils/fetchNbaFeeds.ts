import fetch from "node-fetch";
import fs from "fs";

/**
 * Hits each endpoint and builds a struct containing
 * Home Team, Away Team, Event Date, Endpoint Name, Endpoint ID
 * Then attempts to map each event to each endpoint using the NBA as the master record
 */

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

// Standard variation
async function api<T>(url: string): Promise<T> {
  return fetch(url).then((response) => {
    if (!response.ok) {
      throw new Error(response.statusText);
    }
    return response.json() as Promise<T>;
  });
}

export async function fetchNbaFeeds(): Promise<void> {
  const nbaApi = "https://data.nba.net/prod/v2/20211015/scoreboard.json";
  const nbaResponse: any = await api(nbaApi);
  fs.writeFileSync(
    `./feeds/nba/nba.json`,
    JSON.stringify(nbaResponse.games, null, 2)
  );
  const nbaMap = new Map(
    nbaResponse.games.map((event) => [event.gameId, event])
  );

  const espnApi =
    "https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard?dates=20211015";
  const espnResponse: any = await api(espnApi);
  fs.writeFileSync(
    `./feeds/nba/espn.json`,
    JSON.stringify(espnResponse.events, null, 2)
  );

  const yahooApi =
    "https://api-secure.sports.yahoo.com/v1/editorial/s/scoreboard?leagues=nba&date=2021-10-15";
  const yahooResponse: any = await api(yahooApi);
  fs.writeFileSync(
    `./feeds/nba/yahoo.json`,
    JSON.stringify(yahooResponse.service.scoreboard.games, null, 2)
  );
}

fetchNbaFeeds().then(
  () => {
    process.exit();
  },
  (err) => {
    console.log(err);
    process.exit(-1);
  }
);
