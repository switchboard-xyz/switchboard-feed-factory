import chalk from "chalk";
import fs from "fs";
import { JsonInput } from "../types";
import { selectDateRange, selectSport } from "./cli";
import { fetchNbaFeeds } from "./nba/fetchNbaFeeds";
import { getEspnEventUrl } from "./nba/jobs/espn";
import { getNbaEventUrl } from "./nba/jobs/nba";
import { getYahooEventUrl } from "./nba/jobs/yahoo";
import { nfl } from "./nfl/fetchNflFeeds";
import { toDateString } from "./toDateString";

/**
 * Reads in program arguements and prompts, then returns the parsed JSON and DataFeedFactory
 *
 * @returns the configuration struct defining the cluster,
 * fulfillment manager, sport, and the parsed JSON file with the intended data feeds
 */
export async function fetchFeeds(): Promise<boolean> {
  if (!fs.existsSync(`./feeds`)) fs.mkdirSync(`./feeds`);
  if (!fs.existsSync(`./bundles`)) fs.mkdirSync(`./bundles`);

  const sport = await selectSport();
  switch (sport.toLowerCase()) {
    case "epl":
      console.error(chalk.red("EPL fetch not implemented yet"));
      return false;
    case "nba":
      if (!fs.existsSync(`./feeds/nba`)) fs.mkdirSync(`./feeds/nba`);
      if (!fs.existsSync(`./bundles/nba`)) fs.mkdirSync(`./bundles/nba`);
      return await nba();
    case "nfl":
      if (!fs.existsSync(`./feeds/nfl`)) fs.mkdirSync(`./feeds/nfl`);
      if (!fs.existsSync(`./bundles/nfl`)) fs.mkdirSync(`./bundles/nfl`);
      return await nfl();
  }
  throw new Error(`Unknown sport: ${sport}`);
}

export async function nba(): Promise<boolean> {
  const dates = await selectDateRange();
  console.log(dates);
  let allMatches: JsonInput[] = [];

  for await (const d of dates) {
    const output = await fetchNbaFeeds(d);
    if (!output.length) console.error(`failed to fetch feeds for ${d}`);
    allMatches = allMatches.concat(output);
  }
  if (allMatches.length) {
    fs.writeFileSync(
      `./feeds/nba/JsonInput.json`,
      JSON.stringify(allMatches, null, 2)
    );
    const header =
      "Date,Name,NBA ID,ESPN ID,Yahoo ID,NBA Endpoint,ESPN Endpoint,Yahoo Endpoint,";
    const csvLines: string[] = allMatches.map(
      (m) =>
        `"${toDateString(m.date)}","${m.name}","${m.nbaId}","${m.espnId}","${
          m.yahooId
        }","${getNbaEventUrl(m)}","${getEspnEventUrl(m)}","${getYahooEventUrl(
          m
        )}"`
    );
    csvLines.unshift(header);
    fs.writeFileSync(`./feeds/nba/AllFeeds.csv`, csvLines.join("\r\n"));
  }
  return true;
}

fetchFeeds()
  .then(() => console.log(chalk.green("Successfully fetched feeds...")))
  .then(() => process.exit())
  .catch((err) => console.error(err));
