import {
  Account,
  Cluster,
  clusterApiUrl,
  Connection,
  PublicKey,
} from "@solana/web3.js";
import fs from "fs";
import resolve from "dir-resolve";
import yargs from "yargs";
import feeds from "./feeds.json";

const argv = yargs(process.argv).options({
  payerKeypairFile: {
    type: "string",
    describe: "Path to keypair file that will pay for transactions.",
    demand: true,
    default: "./keypair.json",
  },
}).argv;

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
  console.log("ARGS", argv);
  const cluster = "devnet";
  const url = clusterApiUrl(toCluster(cluster), true);
  const connection = new Connection(url, "processed");
  // const payerKeypair = JSON.parse(
  //   fs.readFileSync(resolve(argv.payerKeypairFile), "utf-8")
  // );
  // const payerAccount = new Account(payerKeypair);
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
