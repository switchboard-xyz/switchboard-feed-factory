import { Account, Connection, PublicKey } from "@solana/web3.js";
import createEspnJob from "./espn";
import createYahooJob from "./yahoo";
import { OracleJob } from "@switchboard-xyz/switchboard-api";
import FeedType from "./types";
import {
  createDataFeed,
  SWITCHBOARD_DEVNET_PID,
  addFeedJob,
  setDataFeedConfigs,
} from "@switchboard-xyz/switchboard-api";

// Not sure if this is needed
const fulfillmentManagerPubkey = new PublicKey(
  "7s6kXRDAV7MKsfydrhsmB48qcUTB7L46C75occvaHgaL" // this isnt right
);

async function createEplFeed(
  connection: Connection,
  payerAccount: Account,
  feed: FeedType
): Promise<void> {
  const espnJob = feed.espnId ? createEspnJob(feed.espnId) : null;
  const yahooJob = feed.yahooId ? createYahooJob(feed.yahooId) : null;
  const dateFeedAccount = await createDataFeed(
    connection,
    payerAccount,
    SWITCHBOARD_DEVNET_PID
  );
  if (espnJob) {
    await addFeedJob(
      connection,
      payerAccount,
      dateFeedAccount,
      espnJob.tasks as OracleJob.Task[]
    );
  }
  if (yahooJob) {
    await addFeedJob(
      connection,
      payerAccount,
      dateFeedAccount,
      yahooJob.tasks as OracleJob.Task[]
    );
  }
  await setDataFeedConfigs(connection, payerAccount, dateFeedAccount, {
    minConfirmations: 5,
    minUpdateDelaySeconds: 60,
    fulfillmentManagerPubkey: fulfillmentManagerPubkey.toBuffer(),
    lock: false,
  });
}

export default createEplFeed;
