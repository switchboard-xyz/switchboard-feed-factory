import chalk from "chalk";
import fs from "fs";
import { FetchOutput } from "../types";
import { selectDateRange, selectSport } from "./cli";
import { fetchNbaFeeds } from "./nba/fetchNbaFeeds";
import { getEspnEventUrl } from "./nba/jobs/espn";
import { getNbaEventUrl } from "./nba/jobs/nba";
import { getYahooEventUrl } from "./nba/jobs/yahoo";
import { toDateString } from "./toDateString";

/**
 * Reads in program arguements and prompts, then returns the parsed JSON and DataFeedFactory
 *
 * @returns the configuration struct defining the cluster,
 * fulfillment manager, sport, and the parsed JSON file with the intended data feeds
 */
export async function fetchFeeds(): Promise<boolean> {
  const sport = await selectSport();
  if (sport.toLowerCase() === "epl") {
    console.error(chalk.red("EPL fetch not implemented yet"));
    return false;
  } else if (sport.toLowerCase() === "nba") {
    if (!fs.existsSync(`./feeds`)) {
      fs.mkdirSync(`./feeds`);
    }
    if (!fs.existsSync(`./feeds/nba`)) {
      fs.mkdirSync(`./feeds/nba`);
    }
    const success = await nba();
    return success;
  }
  return false;
}
export async function nba(): Promise<boolean> {
  const dates = await selectDateRange();
  console.log(dates);
  let allMatches: FetchOutput = { inputs: [], bundles: [] };

  for await (const d of dates) {
    const output = await fetchNbaFeeds(d);
    if (!output.inputs.length) console.error(`failed to fetch feeds for ${d}`);
    allMatches.inputs = allMatches.inputs.concat(output.inputs);
    allMatches.bundles = allMatches.bundles.concat(output.bundles);
  }
  if (allMatches.inputs.length) {
    fs.writeFileSync(
      `./feeds/nba/JsonInput.json`,
      JSON.stringify(allMatches.inputs, null, 2)
    );
    const header =
      "Date,Name,NBA ID,ESPN ID,Yahoo ID,NBA Endpoint,SPN Endpoint,Yahoo Endpoint,";
    const csvLines: string[] = allMatches.inputs.map(
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
  if (allMatches.bundles.length) {
    fs.writeFileSync(
      `./bundles/nba/BundlesOutput.json`,
      JSON.stringify(allMatches.bundles, null, 2)
    );
  }
  return true;
}

fetchFeeds().then(
  () => {
    console.log(chalk.green("Successfully fetched feeds..."));
    process.exit();
  },
  (err) => {
    console.error(err);
  }
);
