import { Account, PublicKey, Cluster } from "@solana/web3.js";
import fs from "fs";
import resolve from "resolve-dir";
import chalk from "chalk";
import yargs from "yargs/yargs";
import _feeds from "./feeds.json";
import {
  ConfigError,
  FactoryInput,
  JsonInputError,
  FactoryError,
  DataFeedFactory,
} from "./types/";
import readlineSync from "readline-sync";

async function main(): Promise<void> {
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
      cluster: {
        type: "string",
        describe: "devnet, testnet, or mainnet-beta",
        demand: false,
        default: "devnet",
      },
    })
    .parseSync();
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

  const feedFactory = new DataFeedFactory(
    cluster,
    payerAccount,
    fulfillmentManager
  );
  const ffmCheck = await feedFactory.verifyFulfillmentManager();
  if (ffmCheck instanceof ConfigError) {
    console.log(ffmCheck.toString());
    return;
  }

  // Read in json feeds and check for any duplicate names
  const FactoryInput = _feeds as FactoryInput[];
  const FactoryInputMap = new Map(FactoryInput.map((f) => [f.name, f]));
  if (FactoryInputMap.size !== FactoryInput.length) {
    const e = new JsonInputError(
      "duplicate names detected, check your json file"
    );
    console.log(e.toString());
    return;
  }
  console.log(chalk.blue("# of New Feeds:"), FactoryInput.length);
  if (!readlineSync.keyInYN("Does the configuration look correct?")) {
    console.log("Exiting...");
    return;
  }

  // pass feeds to factory and parse account response
  console.log(
    chalk.underline.yellow(
      "######## Creating Data Feeds from JSON File ########"
    )
  );
  const factoryOutput = await Promise.all(
    FactoryInput.map(async (f) => {
      const newFeed = await feedFactory.createNewFeed(f);
      await feedFactory.verifyNewFeed(newFeed);
      console.log(newFeed.toFormattedString());
      return newFeed;
    })
  );
  // Write to output file
  const createdFeeds = factoryOutput.filter((f) => f.output);
  if (createdFeeds.length > 0) {
    fs.writeFileSync(
      `./CreatedFeeds-${Date.now()}.json`,
      JSON.stringify(createdFeeds, null, 2)
    );
  } else {
    console.log("No newly created data feeds");
  }

  const errorMap = {};
  factoryOutput
    .filter((f) => f.error)
    .forEach((f) => {
      if (f.error) {
        errorMap[f.input.name] = f.error?.toString();
      }
    });
  if (Object.keys(errorMap).length > 0) {
    fs.writeFileSync(
      `./Errors-${Date.now()}.json`,
      JSON.stringify(errorMap, null, 2)
    );
  } else {
    console.log("No errors");
  }
}

main().then(
  () => {
    console.log(chalk.green("Switchboard-EPL-Feeds ran successfully."));
    process.exit();
  },
  (err) => {
    if (err instanceof FactoryError) {
      console.log(err.toString());
      process.exit(-1);
    } else {
      console.log(err);
      process.exit(-1);
    }
  }
);

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
