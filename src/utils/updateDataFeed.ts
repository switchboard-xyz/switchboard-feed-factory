import {
  Account,
  clusterApiUrl,
  Connection,
  Context,
  PublicKey,
  SignatureResult,
} from "@solana/web3.js";
import yargs from "yargs/yargs";
import fs from "fs";
import resolve from "resolve-dir";
import prompts, { Choice } from "prompts";
import path from "path";
import { FactoryOutputJSON } from "../types";
import {
  AggregatorState,
  parseAggregatorAccountData,
  updateFeed,
} from "@switchboard-xyz/switchboard-api";
import { EventEmitter } from "events";
import { waitFor } from "wait-for-event";
import { sleep } from "./sleep";
import chalk from "chalk";

async function main(): Promise<string> {
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
      sport: {
        type: "string",
        describe: "Which sport to load [epl / nba]",
        demand: false,
      },
    })
    .parseSync();

  const url = clusterApiUrl("devnet", true);
  const connection = new Connection(url, "processed");
  const payerKeypair = JSON.parse(
    fs.readFileSync(resolve(argv.payerKeypairFile), "utf-8")
  );
  const payerAccount = new Account(payerKeypair);

  const jsonFiles: Choice[] = fs
    .readdirSync("./")
    .filter(
      (file) =>
        path.extname(file) === ".json" &&
        path.basename(file).startsWith("CreatedFeeds-")
    )
    .map((fileName) => {
      return {
        value: fileName,
        title: fileName,
      };
    });

  const pickJson = await prompts([
    {
      type: "select",
      name: "jsonFile",
      message: "Pick a JSON file to import",
      choices: jsonFiles,
    },
  ]);
  console.log(`selected ${pickJson.jsonFile}`);
  const createdFeeds: FactoryOutputJSON[] = JSON.parse(
    fs.readFileSync(pickJson.jsonFile).toString()
  );
  for await (const feed of createdFeeds) {
    console.log(chalk.blue(`Updating ${feed.name}`));
    await updateDataFeed(
      connection,
      payerAccount,
      feed.dataFeed,
      feed.updateAuth
    );
    await sleep(1_000);
  }

  return "";
}

main().then(
  () => {
    process.exit();
  },
  (err) => {
    console.log(err);
    return "";
  }
);

async function updateDataFeed(
  connection: Connection,
  payerAccount: Account,
  dataFeed: string,
  updateAuth: string
) {
  const dataFeedPubkey = new PublicKey(dataFeed);
  const updateAuthPubkey = new PublicKey(updateAuth);
  const signature = await updateFeed(
    connection,
    payerAccount,
    dataFeedPubkey,
    updateAuthPubkey
  );
  console.log(
    `Awaiting update transaction finalization... https://explorer.solana.com/tx/${signature}?cluster=devnet`
  );
  const emitter = new EventEmitter();
  const callback = async function (
    signatureResult: SignatureResult,
    _ctx: Context
  ) {
    if (signatureResult.err) {
      console.error("SignatureError:", signatureResult);
      return;
    }
    let attempts = 30;
    while (attempts--) {
      const state: AggregatorState = await parseAggregatorAccountData(
        connection,
        dataFeedPubkey
      );
      const numSuccess = state.currentRoundResult?.numSuccess
        ? state.currentRoundResult?.numSuccess
        : 0;
      const numError = state.currentRoundResult?.numError
        ? state.currentRoundResult?.numError
        : 0;

      if (numSuccess + numError !== 0) {
        console.log(
          `(${dataFeedPubkey.toBase58()}) state.\n`,
          JSON.stringify(state.toJSON(), null, 2)
        );
        emitter.emit("Success");
        break;
      }
      // It may take a few more seconds for the oracle response to be processed.
      await sleep(1_000);
    }
    emitter.emit("Done");
  };
  connection.onSignature(signature, callback, "finalized");
  emitter.on("Done", () => {
    console.error(`${chalk.red("Failed to update data feed")}`);
  });
  emitter.on("Success", () => {
    console.error("Successfully updated data feed");
    emitter.emit("Done");
  });
  await waitFor("Done", emitter);
}
