import {
  Connection,
  PublicKey,
  Account,
  Cluster,
  clusterApiUrl,
} from "@solana/web3.js";
import {
  FactoryInput,
  FactoryError,
  SwitchboardError,
  ConfigError,
  JobOutput,
  VerifyError,
  FactoryOutput,
  FactoryOutputJSON,
  JobOutputJSON,
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
import chalk from "chalk";
import { jobFactory } from "./jobs";

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
    await dataFeed.createFeed(
      this.connection,
      this.payerAccount,
      this.fulfillmentManager,
      this.SWITCHBOARD_PID
    );
    return dataFeed;
  }

  public async verifyNewFeed(dataFeed: DataFeed): Promise<void> {
    await dataFeed.verifyFeed(this.connection);
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

  public async createFeed(
    connection: Connection,
    payerAccount: Account,
    fulfillmentManager: PublicKey,
    switchboardPID: PublicKey
  ): Promise<void> {
    // TO DD: Setup job factory in main using sport as the constructor param,
    // from there we can just pass jobs and the mapping will be handled behind the scenes.
    // and it will remove the need for sport in this context
    const jobs: JobOutput[] = [];
    this.input.jobs.forEach((j) => {
      try {
        const jobResult = jobFactory(this.input.sport, j);
        jobs.push(jobResult);
      } catch (err) {
        console.error(err);
      }
    });
    if (jobs.length === 0) {
      this.error = new ConfigError(
        `no valid jobs defined for ${this.input.name}`
      );
      return;
    }

    // create feeds then add jobs and return job public key
    let dataFeed: Account;
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
        } catch (err) {
          console.log("Failed to create job", err);
        }
      })
    );

    // set fulfillment manager and update config
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

  // read feed on-chain and verify correct # of jobs
  public async verifyFeed(connection: Connection): Promise<void> {
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

  // for better console logging
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

  // TO DO: Wrap feed JSON output in result type with input config (cluster, sport, fulfillment manager, etc)
  public toJSON(): FactoryOutputJSON {
    const jobs = !this.output
      ? []
      : this.output.jobs.map((j): JobOutputJSON => {
          return {
            provider: j.jobProvider,
            id: j.jobId,
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
