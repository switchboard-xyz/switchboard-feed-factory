import {
  Connection,
  PublicKey,
  Account,
  Cluster,
  clusterApiUrl,
} from "@solana/web3.js";
import createEspnJob from "./jobs/espn";
import createYahooJob from "./jobs/yahoo";
import { FeedInput, FactoryError, FeedOutput } from "./types";
import {
  OracleJob,
  createDataFeed,
  SWITCHBOARD_DEVNET_PID,
  SWITCHBOARD_MAINNET_PID,
  SWITCHBOARD_TESTNET_PID,
  addFeedJob,
  setDataFeedConfigs,
} from "@switchboard-xyz/switchboard-api";
import chalk from "chalk";

export default class DataFeedFactory {
  private connection: Connection;
  private payerAccount: Account;
  private fulfillmentManager = new PublicKey(
    "7s6kXRDAV7MKsfydrhsmB48qcUTB7L46C75occvaHgaL" // this isnt right
  );
  public SWITCHBOARD_PID: PublicKey;

  constructor(cluster: Cluster, payer: Account) {
    const url = clusterApiUrl(cluster, true);
    this.connection = new Connection(url, "processed");
    this.payerAccount = payer;
    switch (cluster) {
      case "mainnet-beta":
        this.SWITCHBOARD_PID = SWITCHBOARD_MAINNET_PID;
        break;
      case "testnet":
        this.SWITCHBOARD_PID = SWITCHBOARD_TESTNET_PID;
        break;
      case "devnet":
        this.SWITCHBOARD_PID = SWITCHBOARD_DEVNET_PID;
        break;
      default:
        this.SWITCHBOARD_PID = SWITCHBOARD_DEVNET_PID;
        break;
    }
  }
  private parseJobIds(feed: FeedInput): OracleJob[] {
    const jobs: OracleJob[] = [];
    if (feed.espnId) {
      jobs.push(createEspnJob(feed.espnId));
    }
    if (feed.yahooId) {
      jobs.push(createYahooJob(feed.yahooId));
    }

    return jobs;
  }

  public async createEplFeed(
    feed: FeedInput
  ): Promise<FeedOutput | FactoryError> {
    const jobs = this.parseJobIds(feed);
    if (jobs.length === 0) {
      return new FactoryError(`no valid jobs defined for ${feed.name}`);
    }

    let dataFeed: Account;
    try {
      dataFeed = await createDataFeed(
        this.connection,
        this.payerAccount,
        this.SWITCHBOARD_PID
      );
    } catch (err) {
      return new FactoryError(
        "failed to create data feed account",
        "SwitchboardErr"
      );
    }
    jobs.forEach(async (j) => {
      try {
        dataFeed = await addFeedJob(
          this.connection,
          this.payerAccount,
          dataFeed,
          j.tasks as OracleJob.Task[]
        );
      } catch (err) {
        console.log("Failed to create job");
      }
    });

    try {
      await setDataFeedConfigs(this.connection, this.payerAccount, dataFeed, {
        minConfirmations: 5,
        minUpdateDelaySeconds: 60,
        fulfillmentManagerPubkey: this.fulfillmentManager.toBuffer(),
        lock: false,
      });
    } catch (err) {
      return new FactoryError(
        `failed to set data feed config: ${err}`,
        "SwitchboardErr"
      );
    }
    // console.log(
    //   `${chalk.blue(feed.name)}: ${dateFeedAccount.publicKey.toString()}`
    // );
    return { ...feed, dataFeed, jobs };
  }
}
