import {
  Connection,
  PublicKey,
  Account,
  Cluster,
  clusterApiUrl,
} from "@solana/web3.js";
import { createEspnJob, createYahooJob } from "../jobs";
import {
  FactoryInput,
  FactoryError,
  SwitchboardError,
  ConfigError,
  VerifyError,
  FactoryOutput,
  JobOutput,
  FactoryOutputJSON,
  JobOutputJSON,
} from "../types";
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
import chalk from "chalk";

export class DataFeedFactory {
  private connection: Connection;
  private payerAccount: Account;
  public fulfillmentManager: PublicKey;
  public SWITCHBOARD_PID: PublicKey;

  constructor(cluster: Cluster, payer: Account, ffManager: PublicKey) {
    const url = clusterApiUrl(cluster, true);
    this.connection = new Connection(url, "processed");
    this.payerAccount = payer;
    this.fulfillmentManager = ffManager;
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

  public async verifyFulfillmentManager(): Promise<ConfigError | null> {
    try {
      await parseFulfillmentAccountData(
        this.connection,
        this.fulfillmentManager
      );
    } catch (err) {
      return new ConfigError(`not a valid fulfillment manager account`);
    }
    return null;
  }

  public async createNewFeed(newFeed: FactoryInput): Promise<DataFeed> {
    const dataFeed = new DataFeed(newFeed);
    await dataFeed.createEplFeed(
      this.connection,
      this.payerAccount,
      this.fulfillmentManager,
      this.SWITCHBOARD_PID
    );
    return dataFeed;
  }

  public async verifyNewFeed(dataFeed: DataFeed): Promise<void> {
    await dataFeed.verifyEplFeed(this.connection);
  }
}

export class DataFeed {
  input: FactoryInput;
  output?: FactoryOutput;
  error?: FactoryError;
  created: boolean;
  verified: boolean;

  constructor(feed: FactoryInput) {
    this.input = feed;
    this.created = false;
    this.verified = false;
  }

  private createJobs(): JobOutput[] {
    const jobs: JobOutput[] = [];
    if (this.input.espnId) {
      jobs.push({
        provider: "ESPN",
        id: this.input.espnId,
        job: createEspnJob(this.input.espnId),
      });
    }
    if (this.input.yahooId) {
      jobs.push({
        provider: "Yahoo",
        id: this.input.yahooId,
        job: createYahooJob(this.input.yahooId),
      });
    }
    return jobs;
  }

  public async createEplFeed(
    connection: Connection,
    payerAccount: Account,
    fulfillmentManager: PublicKey,
    switchboardPID: PublicKey
  ): Promise<void> {
    const jobs = this.createJobs();
    if (jobs.length === 0) {
      this.error = new ConfigError(
        `no valid jobs defined for ${this.input.name}`
      );
      return;
    }

    let dataFeed: Account;
    // const jobKeys: PublicKey[] = [];
    try {
      dataFeed = await createDataFeed(connection, payerAccount, switchboardPID);
    } catch (e) {
      this.error = new SwitchboardError("failed to create data feed account");
      return;
    }
    await Promise.all(
      jobs.map(async (j) => {
        try {
          const jobAccount = await addFeedJob(
            connection,
            payerAccount,
            dataFeed,
            j.job?.tasks as OracleJob.Task[]
          );
          j.pubKey = jobAccount.publicKey;
          // jobKeys.push(jobAccount.publicKey);
        } catch (err) {
          console.log("Failed to create job", err);
        }
      })
    );

    try {
      await setDataFeedConfigs(connection, payerAccount, dataFeed, {
        minConfirmations: 5,
        minUpdateDelaySeconds: 60,
        fulfillmentManagerPubkey: fulfillmentManager.toBuffer(),
        lock: false,
      });
    } catch (e) {
      this.error = new SwitchboardError(
        `failed to set data feed config ${this.input.name}`
      );
      return;
    }
    this.output = {
      dataFeed,
      jobs,
    };
    this.created = true;
  }

  public async verifyEplFeed(connection: Connection): Promise<void> {
    if (!this.error && this.output?.dataFeed) {
      try {
        const aggState = await parseAggregatorAccountData(
          connection,
          this.output?.dataFeed?.publicKey
        );
        if (
          !(aggState.jobDefinitionPubkeys.length === this.output.jobs.length)
        ) {
          this.error = new VerifyError(
            `data feed has the wrong number of jobs, expected ${this.output.jobs.length}, received ${aggState.jobDefinitionPubkeys.length}`
          );
          return;
        }
      } catch (e) {
        this.error = new VerifyError(
          `failed to verify Epl feed on-chain ${this.input.name}`
        );
        return;
      }
      this.verified = true;
    }
  }
  public toString(): string {
    if (this.error) {
      return `${this.error.toString()}`;
    } else if (this.created && this.verified && this.output) {
      return `${
        this.input.name
      } (${this.output.dataFeed.publicKey.toString()}) verified successfully with ${
        this.output.jobs.length
      } jobs`;
    } else {
      return `${this.input.name} logic error`;
    }
  }
  public toFormattedString(): string {
    if (this.error) {
      return `${this.error.toFormattedString()}`;
    } else if (this.created && this.verified && this.output) {
      return `${chalk.green("Created")}: ${chalk.blue(
        this.input.name
      )} (${this.output.dataFeed.publicKey.toString()}) verified successfully with ${
        this.output.jobs.length
      } jobs`;
    } else {
      return `${this.input.name} logic error`;
    }
  }

  public toJSON(): FactoryOutputJSON {
    const jobs = !this.output
      ? []
      : this.output.jobs.map((j): JobOutputJSON => {
          return {
            provider: j.provider,
            id: j.id,
            pubKey: j.pubKey ? j.pubKey.toString() : "",
          };
        });
    return {
      name: this.input.name,
      dataFeed: this.output ? this.output.dataFeed.publicKey.toString() : "",
      jobs: jobs,
    };
  }
}