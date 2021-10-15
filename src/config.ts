import { Account, PublicKey, Cluster } from "@solana/web3.js";
import fs from "fs";
import resolve from "resolve-dir";
import chalk from "chalk";
import yargs from "yargs/yargs";
import { ConfigError, JsonInputError, FactoryInput } from "./types/";
import { DataFeedFactory } from "./dataFeedFactory";
import prompts from "prompts";
import readlineSync from "readline-sync";
import { ingestFeeds } from "./utils/ingestFeeds";

import dotenv from "dotenv";
dotenv.config();

// should keep track of configuration parameters that might change flow of program
export interface AppConfig {
  cluster: Cluster;
  fulfillmentManager: PublicKey;
  sport: string;
  factoryInput: FactoryInput[];
  factory: DataFeedFactory;
}

/**
 * Returns the app config required for the DataFeedFactory
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
      fulfillmentManager: {
        type: "string",
        describe: "Public key of the fulfillment manager account",
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
      : (
          await prompts([
            {
              type: "select",
              name: "sport",
              message: "Pick a sport",
              choices: [
                {
                  title: "English Premier League (epl.feeds.json)",
                  value: "epl",
                },
                {
                  title: "National Basketball Association (nba.feeds.json)",
                  value: "nba",
                },
              ],
            },
          ])
        ).sport;
  console.log(chalk.blue("Sport:"), sport.toUpperCase());

  const factoryInput = ingestFeeds(sport);
  const cluster = toCluster(argv.cluster);
  console.log(chalk.blue("Cluster:"), cluster);

  const payerKeypair = JSON.parse(
    fs.readFileSync(resolve(argv.payerKeypairFile), "utf-8")
  );
  const payerAccount = new Account(payerKeypair);
  console.log(chalk.blue("Payer Account:"), payerAccount.publicKey.toString());

  const fulfillmentManager = new PublicKey(argv.fulfillmentManager);
  console.log(
    chalk.blue("Fulfillment Manager:"),
    fulfillmentManager.toString()
  );

  const factory = new DataFeedFactory(
    cluster,
    payerAccount,
    fulfillmentManager
  );
  const ffmCheck = await factory.verifyFulfillmentManager();
  if (ffmCheck instanceof ConfigError) {
    console.log(ffmCheck.toString());
    throw ffmCheck;
  }

  // Read in json feeds and check for any duplicate names
  const FactoryInputMap = new Map(factoryInput.map((f) => [f.name, f]));
  if (FactoryInputMap.size !== factoryInput.length) {
    const e = new JsonInputError(
      "duplicate names detected, check your json file"
    );
    console.log(e.toString());
    throw new ConfigError("duplicate names for a feed detected");
  }
  console.log(chalk.blue("# of New Feeds:"), factoryInput.length);
  if (!readlineSync.keyInYN("Does the configuration look correct?")) {
    console.log("Exiting...");
    throw new ConfigError("user exited");
  }
  return {
    cluster,
    fulfillmentManager,
    sport,
    factoryInput,
    factory,
  };
}

function toCluster(cluster: string): Cluster {
  switch (cluster) {
    case "devnet":
    case "testnet":
    case "mainnet-beta": {
      return cluster;
    }
  }

  throw new ConfigError(
    `Invalid cluster ${cluster} [devnet / testnet / mainnet-beta]`
  );
}
