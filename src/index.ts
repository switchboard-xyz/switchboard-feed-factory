import { Account } from "@solana/web3.js";
import fs from "fs";
import resolve from "resolve-dir";
import chalk from "chalk";
import yargs from "yargs/yargs";
import _feeds from "./feeds.json";
import { FeedInput, FactoryError, FeedOutput } from "./types";
import DataFeedFactory from "./dataFeedFactory";
import { toCluster } from "./utils";

const logSymbols = {
  info: chalk.blue("i"),
  success: chalk.green("√"),
  warning: chalk.yellow("‼"),
  error: chalk.red("×"),
};

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
      fulfillmentManager: {
        type: "string",
        describe: "Public key of the fulfillment manager account",
        demand: false,
        default: "7s6kXRDAV7MKsfydrhsmB48qcUTB7L46C75occvaHgaL",
      },
    })
    .parseSync();
  const payerKeypair = JSON.parse(
    fs.readFileSync(resolve(argv.payerKeypairFile), "utf-8")
  );
  const payerAccount = new Account(payerKeypair);
  console.log(chalk.blue("Payer Account:"), payerAccount.publicKey.toString());

  const cluster = toCluster(argv.cluster);
  const feedFactory = new DataFeedFactory(
    cluster,
    payerAccount,
    argv.fulfillmentManager
  );

  // Read in json feeds and check for any duplicate names
  const feedInput = _feeds as FeedInput[];
  const feedInputMap = new Map(feedInput.map((f) => [f.name, f]));
  if (feedInputMap.size !== feedInput.length) {
    const e = new FactoryError(
      "duplicate names detected, check your json file",
      "JsonErr"
    );
    console.log(`${e}`);
    return;
  }
  console.log(
    chalk.underline.yellow(
      "######## Creating Data Feeds from JSON File ########"
    )
  );

  // pass feeds to factory and parse account response
  const feedOutputMap: Map<string, FeedOutput | FactoryError> = new Map();
  await Promise.all(
    feedInput.map(async (f) => {
      const resp = await feedFactory.createEplFeed(f);
      feedOutputMap.set(f.name, resp);
      if (resp instanceof FactoryError) {
        console.log(`${resp}`);
      } else {
        console.log(
          `${chalk.blue(f.name)}: ${resp.dataFeed.publicKey.toString()}`
        );
      }
    })
  );

  // verify new account configurations on-chain
  console.log(
    chalk.underline.yellow("######## Verifying Data Feeds On-Chain ########")
  );
  const feedResultMap: Map<string, boolean | FactoryError> = new Map();
  await Promise.all(
    Array.from(feedOutputMap.values()).map(async (f) => {
      if (f instanceof FactoryError) {
        console.log(logSymbols.error, `${f}`);
        return;
      }
      // verify configuration matches expected
      const result = await feedFactory.verifyEplFeed(f);
      feedResultMap.set(f.name, result);
      if (result instanceof FactoryError) {
        console.log(`${result}`);
      } else {
        if (result) {
          console.log(
            logSymbols.success,
            `account verified successfully ${f.dataFeed.publicKey.toString()}`
          );
        } else {
          console.log(
            logSymbols.error,
            `failed to verify account configuration ${f.dataFeed.publicKey.toString()}`
          );
        }
      }
    })
  );
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
