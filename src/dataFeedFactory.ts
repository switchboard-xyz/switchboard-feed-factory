import {
  Connection,
  PublicKey,
  Account,
  Cluster,
  clusterApiUrl,
} from "@solana/web3.js";
import createEspnJob from "./jobs/espn";
import createYahooJob from "./jobs/yahoo";
import {
  FactoryInput,
  FactoryError,
  SwitchboardError,
  ConfigError,
  VerifyError,
  FactoryOutput,
  FactoryResult,
  err,
  ok,
} from "./types";
import {
  OracleJob,
  createDataFeed,
  SWITCHBOARD_DEVNET_PID,
  SWITCHBOARD_MAINNET_PID,
  SWITCHBOARD_TESTNET_PID,
  addFeedJob,
  setDataFeedConfigs,
  parseAggregatorAccountData,
  parseFulfillmentAccountData,
} from "@switchboard-xyz/switchboard-api";

export default class DataFeedFactory {
  private connection: Connection;
  private payerAccount: Account;
  public fulfillmentManager?: PublicKey;
  public SWITCHBOARD_PID: PublicKey;

  constructor(cluster: Cluster, payer: Account, ffManager?: string) {
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
    if (ffManager) {
      this.fulfillmentManager = new PublicKey(ffManager);
    }
  }

  public async verifyFulfillmentManager(): Promise<void> {
    if (this.fulfillmentManager) {
      try {
        await parseFulfillmentAccountData(
          this.connection,
          this.fulfillmentManager
        );
      } catch (err) {
        console.log(
          `${new FactoryError(
            `not a valid fulfillment manager account`,
            "ConfigErr"
          )}`
        );
        process.exit(-1);
      }
    }
  }
  private createJobs(feed: FactoryInput): OracleJob[] {
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
    feed: FactoryInput
  ): Promise<FactoryResult<FactoryOutput, FactoryError>> {
    const jobs = this.createJobs(feed);
    if (jobs.length === 0) {
      return err(new ConfigError(`no valid jobs defined for ${feed.name}`));
    }

    let dataFeed: Account;
    const jobAccounts: Account[] = [];
    try {
      dataFeed = await createDataFeed(
        this.connection,
        this.payerAccount,
        this.SWITCHBOARD_PID
      );
    } catch (e) {
      return err(new SwitchboardError("failed to create data feed account"));
    }
    await Promise.all(
      jobs.map(async (j) => {
        try {
          const jobAccount = await addFeedJob(
            this.connection,
            this.payerAccount,
            dataFeed,
            j.tasks as OracleJob.Task[]
          );
          jobAccounts.push(jobAccount);
        } catch (err) {
          console.log("Failed to create job", err);
        }
      })
    );

    try {
      await setDataFeedConfigs(this.connection, this.payerAccount, dataFeed, {
        minConfirmations: 5,
        minUpdateDelaySeconds: 60,
        // fulfillmentManagerPubkey: this.fulfillmentManager.toBuffer(),
        lock: false,
      });
    } catch (e) {
      return err(
        new SwitchboardError(`failed to set data feed config ${feed.name}`)
      );
    }
    return ok({ ...feed, dataFeed, jobs });
  }

  public async verifyEplFeed(
    feed: FactoryOutput
  ): Promise<FactoryResult<boolean, FactoryError>> {
    try {
      const aggState = await parseAggregatorAccountData(
        this.connection,
        feed.dataFeed.publicKey
      );
      if (!(aggState.jobDefinitionPubkeys.length === feed.jobs.length)) {
        return err(
          new VerifyError(
            `data feed has the wrong number of jobs, expected ${feed.jobs.length}, received ${aggState.jobDefinitionPubkeys.length}`
          )
        );
      }
    } catch (e) {
      return err(
        new SwitchboardError(`failed to verify Epl feed on-chain ${feed.name}`)
      );
    }
    return ok(true);
  }
}

// export class DataFeed {
//   name: string;
//   espnId?: string;
//   yahooId?: string;
//   created: boolean;
//   error?: FactoryError;

//   constructor(
//     connection: Connection,
//     payerAccount: Account,
//     switchboardPID: PublicKey,
//     feed: FactoryInput
//   ) {
//     this.created = false;
//     this.name = feed.name;
//     this.espnId = feed.espnId;
//     this.yahooId = feed.yahooId;
//   }
// }
