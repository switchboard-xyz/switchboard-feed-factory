import { Account } from "@solana/web3.js";
import fs from "fs";
import resolve from "resolve-dir";
import chalk from "chalk";
import yargs from "yargs/yargs";
import _feeds from "./feeds.json";
import { FeedType, FactoryError } from "./types";
import DataFeedFactory from "./dataFeedFactory";
import { toCluster } from "./utils";

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
  const feeds = _feeds as FeedType[];
  // convert to map and make sure names are unique
  const _feedMap = feeds.reduce(function (map, obj: FeedType) {
    map[obj.name] = obj;
    return map;
  }, {});
  console.log(
    chalk.yellow("######## Creating Data Feeds from JSON File ########")
  );
  const dataFeedAccounts = await Promise.all(
    feeds.map((feed) => feedFactory.createEplFeed(feed))
  );

  // write to output file
  dataFeedAccounts.forEach((f) => {
    if (!(f instanceof FactoryError)) {
      console.log(f.publicKey.toString());
    }
  });
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
