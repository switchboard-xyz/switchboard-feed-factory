import fetch from "node-fetch";
import fs from "fs";

// const formatDate = (date) =>
//   `${date.getHours()}:${String(date.getMinutes()).padStart(2, "0")} ${String(
//     date.getSeconds()
//   ).padStart(2, "0")}.${String(date.getMilliseconds()).padStart(3, "0")}`;

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
  const nbaResponse = await api(nbaApi);
  fs.writeFileSync(
    `./feeds/nba/nba.json`,
    JSON.stringify(nbaResponse, null, 2)
  );

  const espnApi =
    "https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard?dates=20211015";
  const espnResponse = await api(espnApi);
  fs.writeFileSync(
    `./feeds/nba/espn.json`,
    JSON.stringify(espnResponse, null, 2)
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
