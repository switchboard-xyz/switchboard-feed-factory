import { Account } from "@solana/web3.js";
import fs from "fs";
import resolve from "resolve-dir";
import chalk from "chalk";
import yargs from "yargs/yargs";
import _feeds from "./feeds.json";
import {
  FactoryInput,
  FactoryError,
  FactoryOutput,
  FactoryResult,
} from "./types";
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
      },
    })
    .parseSync();
  const payerKeypair = JSON.parse(
    fs.readFileSync(resolve(argv.payerKeypairFile), "utf-8")
  );
  const payerAccount = new Account(payerKeypair);
  console.log(chalk.blue("Payer Account:"), payerAccount.publicKey.toString());

  const cluster = toCluster(argv.cluster);
  console.log(chalk.blue("Cluster:"), cluster);
  const feedFactory = new DataFeedFactory(
    cluster,
    payerAccount,
    argv.fulfillmentManager
  );
  await feedFactory.verifyFulfillmentManager();

  // Read in json feeds and check for any duplicate names
  const FactoryInput = _feeds as FactoryInput[];
  const FactoryInputMap = new Map(FactoryInput.map((f) => [f.name, f]));
  if (FactoryInputMap.size !== FactoryInput.length) {
    const e = new FactoryError(
      "duplicate names detected, check your json file",
      "JsonErr"
    );
    console.log(`${e}`);
    return;
  }

  // pass feeds to factory and parse account response
  console.log(
    chalk.underline.yellow(
      "######## Creating Data Feeds from JSON File ########"
    )
  );
  const FactoryOutput: FactoryResult<FactoryOutput, FactoryError>[] = [];
  await Promise.all(
    FactoryInput.map(async (f) => {
      const resp = await feedFactory.createEplFeed(f);
      FactoryOutput.push(resp);
      if (resp.isErr()) {
        console.log(`${resp.error}`);
      } else if (resp.isOk()) {
        console.log(
          `${chalk.blue(f.name)}: ${resp.value.dataFeed.publicKey.toString()}`
        );
      }
    })
  );

  // verify new account configurations on-chain
  console.log(
    chalk.underline.yellow("######## Verifying Data Feeds On-Chain ########")
  );
  const feedResult: FactoryResult<boolean, FactoryError>[] = [];
  await Promise.all(
    FactoryOutput.map(async (f) => {
      if (f.isErr()) {
        console.log(logSymbols.error, `${f.error}`);
        return;
      }
      // verify configuration matches expected
      const result = await feedFactory.verifyEplFeed(f.value);
      feedResult.push(result);
      if (result.isErr()) {
        console.log(logSymbols.error, `${result}`);
      } else {
        if (result) {
          console.log(
            logSymbols.success,
            `${chalk.green("Success::")} feed ${
              f.value.name
            } verified successfully with ${
              f.value.jobs.length
            } jobs: ${f.value.dataFeed.publicKey.toString()}`
          );
        } else {
          console.log(
            logSymbols.error,
            `${chalk.red(
              "Error::"
            )}failed to verify account configuration ${f.value.dataFeed.publicKey.toString()}`
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
