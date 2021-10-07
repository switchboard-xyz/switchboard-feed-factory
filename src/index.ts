import { Account, Cluster, clusterApiUrl, Connection } from "@solana/web3.js";
import fs from "fs";
import resolve from "resolve-dir";
import yargs from "yargs/yargs";
import _feeds from "./feeds.json";
import createEplFeed from "./create";
import FeedType from "./types";

const argv = yargs(process.argv.slice(2))
  .options({
    payerKeypairFile: {
      type: "string",
      describe: "Path to keypair file that will pay for transactions.",
      demand: true,
    },
  })
  .parseSync();

function toCluster(cluster: string): Cluster {
  switch (cluster) {
    case "devnet":
    case "testnet":
    case "mainnet-beta": {
      return cluster;
    }
  }
  throw new Error("Invalid cluster provided.");
}

async function main(): Promise<void> {
  // Read in keypair file to fund the new feeds
  const payerKeypair = JSON.parse(
    fs.readFileSync(resolve(argv.payerKeypairFile), "utf-8")
  );
  const payerAccount = new Account(payerKeypair);
  console.log("Payer Account:", payerAccount.publicKey.toString());

  // Setup Solana connection
  const cluster = "devnet";
  const url = clusterApiUrl(toCluster(cluster), true);
  const connection = new Connection(url, "processed");

  // Read in json feeds
  const feeds = _feeds as FeedType[];
  feeds.forEach(
    async (feed) => await createEplFeed(connection, payerAccount, feed)
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
