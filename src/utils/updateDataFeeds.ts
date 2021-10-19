import { Account, clusterApiUrl, Connection } from "@solana/web3.js";
import yargs from "yargs/yargs";
import fs from "fs";
import resolve from "resolve-dir";
import prompts, { Choice } from "prompts";
import path from "path";
import { FactoryOutputJSON } from "../types";
import { sleep } from "./sleep";
import chalk from "chalk";
import { updateDataFeed } from "./updateDataFeed";

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
      choices: jsonFiles.reverse(), // latest comes first
    },
  ]);
  console.log(`selected ${pickJson.jsonFile}`);
  const createdFeeds: FactoryOutputJSON[] = JSON.parse(
    fs.readFileSync(pickJson.jsonFile).toString()
  );

  const feedChoices: Choice[] = createdFeeds.map((f) => ({
    value: f,
    title: f.name,
  }));
  const selectedFeeds = await prompts([
    {
      type: "multiselect",
      name: "feeds",
      message: "Pick which data feeds to update",
      choices: feedChoices,
    },
  ]);
  for await (const feed of selectedFeeds.feeds) {
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
