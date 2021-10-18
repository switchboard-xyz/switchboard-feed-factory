import { Account } from "@solana/web3.js";
import fs from "fs";
import resolve from "resolve-dir";
import chalk from "chalk";
import yargs from "yargs/yargs";
import { ConfigError, AppConfig } from "./types/";
import readlineSync from "readline-sync";
import { ingestFeeds } from "./utils/ingestFeeds";
import { toCluster } from "./utils/toCluster";
import dotenv from "dotenv";
import { selectSport } from "./utils/cli/selectSport";
dotenv.config();

/**
 * Reads in program arguements and prompts, then returns the parsed JSON and DataFeedFactory
 *
 * @returns the configuration struct defining the cluster,
 * fulfillment manager, sport, and the parsed JSON file with the intended data feeds
 */
export async function getConfig(): Promise<AppConfig> {
  console.log(
    chalk.underline.yellow("######## Configuration Settings ########")
  );
  // Read in keypair file to fund the new feeds
  const argv = yargs(process.argv.slice(2))
    .options({
      payerKeypairFile: {
        type: "string",
        describe: "Path to keypair file that will pay for transactions.",
        demand: true,
      },
      fulfillmentKeypair: {
        type: "string",
        describe:
          "Path to the keypair file that will orchestrate fulfillment request to oracles",
        demand: true,
      },
      sport: {
        type: "string",
        describe: "Which sport to load [epl / nba]",
        demand: false,
      },
      cluster: {
        type: "string",
        describe: "devnet, testnet, or mainnet-beta",
        demand: false,
        default: "devnet",
      },
    })
    .parseSync();

  const sport: string =
    argv.sport === "epl" || argv.sport === "nba"
      ? argv.sport
      : await selectSport();

  const factoryInput = ingestFeeds(sport);

  const cluster = toCluster(argv.cluster);

  const payerKeypair = JSON.parse(
    fs.readFileSync(resolve(argv.payerKeypairFile), "utf-8")
  );
  const payerAccount = new Account(payerKeypair);

  const fulfillmentKeypair = JSON.parse(
    fs.readFileSync(resolve(argv.fulfillmentKeypair), "utf-8")
  );
  const fulfillmentAccount = new Account(fulfillmentKeypair);

  console.log(chalk.blue("Sport:"), sport.toUpperCase());
  console.log(chalk.blue("Cluster:"), cluster);
  console.log(chalk.blue("Payer Account:"), payerAccount.publicKey.toString());
  console.log(
    chalk.blue("Fulfillment Account:"),
    fulfillmentAccount.publicKey.toString()
  );
  console.log(chalk.blue("# of New Feeds:"), factoryInput.length);
  if (!readlineSync.keyInYN("Does the configuration look correct?")) {
    console.log("Exiting...");
    throw new ConfigError("user exited");
  }
  return {
    cluster,
    sport,
    factoryInput,
    fulfillmentAccount,
    payerAccount,
  };
}
