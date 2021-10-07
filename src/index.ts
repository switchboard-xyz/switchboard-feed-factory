import {
  Account,
  Cluster,
  clusterApiUrl,
  Connection,
  PublicKey,
} from "@solana/web3.js";
import fs from "fs";
import resolve from "resolve-dir";
import yargs from "yargs/yargs";
import _feeds from "./feeds.json";
import espnJob from "./espn";
import yahooJob from "./yahoo";
import { OracleJob } from "@switchboard-xyz/switchboard-api";
import {
  createDataFeed,
  SWITCHBOARD_DEVNET_PID,
  addFeedJob,
  setDataFeedConfigs,
} from "@switchboard-xyz/switchboard-api";

const fulfillmentManagerPubkey = new PublicKey(
  "7s6kXRDAV7MKsfydrhsmB48qcUTB7L46C75occvaHgaL" // this isnt right
);
// Setup Solana connection
const cluster = "devnet";
const url = clusterApiUrl(toCluster(cluster), true);
const connection = new Connection(url, "processed");
export interface FeedType {
  // (required) is used to name the output file where the feed's account keypair is stored.
  name: string;
  // (optional) will add an ESPN job for the specified match when provided.
  espnId?: string;
  // (optional) will add a Yahoo Sports job for the specified match when provided.
  yahooId?: string;
}

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
  // Read in keypair file
  const payerKeypair = JSON.parse(
    fs.readFileSync(resolve(argv.payerKeypairFile), "utf-8")
  );
  const payerAccount = new Account(payerKeypair);
  console.log(payerAccount.publicKey.toString());

  // Read in json feeds
  const feeds = _feeds as FeedType[];
  feeds.forEach(async (feed) => {
    const espn = feed.espnId ? espnJob(feed.espnId) : null;
    const yahoo = feed.yahooId ? yahooJob(feed.yahooId) : null;
    const dateFeedAccount = await createDataFeed(
      connection,
      payerAccount,
      SWITCHBOARD_DEVNET_PID
    );
    if (espn) {
      await addFeedJob(
        connection,
        payerAccount,
        dateFeedAccount,
        espn.tasks as OracleJob.Task[]
      );
    }
    if (yahoo) {
      await addFeedJob(
        connection,
        payerAccount,
        dateFeedAccount,
        yahoo.tasks as OracleJob.Task[]
      );
    }
    await setDataFeedConfigs(connection, payerAccount, dateFeedAccount, {
      minConfirmations: 5,
      minUpdateDelaySeconds: 60,
      fulfillmentManagerPubkey: fulfillmentManagerPubkey.toBuffer(),
      lock: false,
    });
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
