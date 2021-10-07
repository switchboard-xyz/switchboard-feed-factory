import {
  Account,
  Cluster,
  clusterApiUrl,
  Connection,
  PublicKey,
} from "@solana/web3.js";
import fs from "fs";
// import { readFile } from "fs/promises";
import resolve from "resolve-dir";
import yargs from "yargs/yargs";
import feeds from "./feeds.json";

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
  // Setup Solana connection
  const cluster = "devnet";
  const url = clusterApiUrl(toCluster(cluster), true);
  const connection = new Connection(url, "processed");

  // Read in keypair file
  // const keypair = resolve(argv.payerKeypairFile);
  // console.log(keypair);

  const payerKeypair = JSON.parse(
    fs.readFileSync(resolve(argv.payerKeypairFile), "utf-8")
  );
  const payerAccount = new Account(payerKeypair);
  console.log(payerAccount.publicKey.toString());
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
