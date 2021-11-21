import chalk from "chalk";
import fs from "fs";
import { BundleOutput } from "../types";
import { selectDateRange, selectSport } from "./cli";
import { fetchNbaBundles } from "./nba/fetchNbaBundles";
import { fetchNflBundles } from "./nfl/fetchNflBundles";

/**
 * Reads in program arguements and prompts, then returns the parsed JSON and DataFeedFactory
 *
 * @returns the configuration struct defining the cluster,
 * fulfillment manager, sport, and the parsed JSON file with the intended data feeds
 */
export async function fetchFeeds(): Promise<boolean> {
  const sport = await selectSport();

  const bundlesDir = `./bundles`;
  const sportDir = `${bundlesDir}/${sport.toLowerCase()}`;
  if (!fs.existsSync(bundlesDir)) fs.mkdirSync(bundlesDir);
  if (!fs.existsSync(sportDir)) fs.mkdirSync(sportDir);

  const dates = await selectDateRange();

  if (sport.toLowerCase() === "epl") {
    console.error(chalk.red("EPL fetch not implemented yet"));
    return false;
  } else if (sport.toLowerCase() === "nba" && (await nba(dates))) {
    console.log(`Outputted to ${sportDir}`);
    return true;
  } else if (sport.toLowerCase() === "nfl" && (await nfl(dates))) {
    console.log(`Outputted to ${sportDir}`);
    return true;
  }
  return false;
}

async function nba(dates: string[]): Promise<boolean> {
  let allBundles: BundleOutput[] = [];
  for await (const d of dates) {
    const output = await fetchNbaBundles(d);
    if (!output.length) console.error(`failed to fetch bundles for ${d}`);
    allBundles = allBundles.concat(output);
  }

  if (allBundles.length) {
    fs.writeFileSync(
      `./bundles/nba/BundlesOutput.json`,
      JSON.stringify(allBundles, null, 2)
    );
  }
  return true;
}

async function nfl(dates: string[]): Promise<boolean> {
  let allBundles: BundleOutput[] = [];
  for await (const d of dates) {
    const output = await fetchNflBundles(d);
    if (!output.length) console.error(`failed to fetch bundles for ${d}`);
    allBundles = allBundles.concat(output);
  }

  if (allBundles.length) {
    fs.writeFileSync(
      `./bundles/nfl/BundlesOutput.json`,
      JSON.stringify(allBundles, null, 2)
    );
  }
  return true;
}

fetchFeeds().then(
  (result) => {
    if (!result) throw chalk.red("An error occurred");
    console.log(chalk.green("Successfully fetched feeds..."));
    process.exit();
  },
  (err) => {
    console.error(err);
  }
);
