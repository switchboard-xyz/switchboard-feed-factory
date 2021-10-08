import { Account } from "@solana/web3.js";
import fs from "fs";
import resolve from "resolve-dir";
import chalk from "chalk";
import yargs from "yargs/yargs";
import _feeds from "./feeds.json";
import { FeedInput, FactoryError, FeedOutput } from "./types";
import DataFeedFactory from "./dataFeedFactory";
import { toCluster, formatFactoryError } from "./utils";

async function main(): Promise<void> {
  // Read in keypair file to fund the new feeds
  const argv = yargs(process.argv.slice(2))
    .options({
      payerKeypairFile: {
        type: "string",
        describe: "Path to keypair file that will pay for transactions.",
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
  const payerKeypair = JSON.parse(
    fs.readFileSync(resolve(argv.payerKeypairFile), "utf-8")
  );
  const payerAccount = new Account(payerKeypair);
  console.log(chalk.blue("Payer Account:"), payerAccount.publicKey.toString());

  const cluster = toCluster(argv.cluster);
  const feedFactory = new DataFeedFactory(cluster, payerAccount);

  // Read in json feeds and pass to factory
  const feedInput = _feeds as FeedInput[];
  const feedInputMap = new Map(feedInput.map((f) => [f.name, f]));
  if (feedInputMap.size !== feedInput.length) {
    const e = new FactoryError(
      "duplicate names detected, check your json file",
      "JsonErr"
    );
    console.log(formatFactoryError(e));
    return;
  }
  console.log(
    chalk.yellow("######## Creating Data Feeds from JSON File ########")
  );

  const feedOutputMap: Map<string, FeedOutput | FactoryError> = new Map();
  await Promise.all(
    feedInput.map(async (f) => {
      const resp = await feedFactory.createEplFeed(f);
      feedOutputMap.set(f.name, resp);
      if (resp instanceof FactoryError) {
        console.log(formatFactoryError(resp));
      } else {
        console.log(
          `${chalk.blue(f.name)}: ${resp.dataFeed.publicKey.toString()}`
        );
      }
    })
  );
  // write to output file
}

main().then(
  () => {
    console.log("Switchboard-EPL-Feeds ran successfully.");
    process.exit();
  },
  (err) => {
    console.log(err);
    process.exit(-1);
  }
);
