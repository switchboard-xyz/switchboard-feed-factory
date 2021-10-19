import { Connection, PublicKey, Account, clusterApiUrl } from "@solana/web3.js";
import { FactoryInput, ConfigError, DataFeed } from "./";
import {
  SWITCHBOARD_DEVNET_PID,
  SWITCHBOARD_MAINNET_PID,
  SWITCHBOARD_TESTNET_PID,
  parseFulfillmentAccountData,
} from "@switchboard-xyz/switchboard-api";
import { sleep } from "../utils/sleep";
import { saveKeypair } from "../utils/saveKeypair";
import { AppConfig } from "./io";

export class DataFeedFactory {
  private connection: Connection;
  private payerAccount: Account;
  private fulfillmentAccount: Account;
  private sport: string;
  private authAccount?: Account; // might not be needed
  public SWITCHBOARD_PID: PublicKey;

  constructor(config: AppConfig) {
    const url = clusterApiUrl(config.cluster, true);
    this.connection = new Connection(url, "processed");
    this.payerAccount = config.payerAccount;
    this.fulfillmentAccount = config.fulfillmentAccount;
    this.sport = config.sport;
    switch (config.cluster) {
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

  /**
   * Reads the fulfillment manager account on-chain and verifies it is the correct account type
   * Then creates an auth account
   */
  public async verifyFulfillmentManager(): Promise<ConfigError | null> {
    try {
      await parseFulfillmentAccountData(
        this.connection,
        this.fulfillmentAccount.publicKey
      );
    } catch (err) {
      return new ConfigError(`not a valid fulfillment manager account`);
    }
    return null;
  }

  /**
   * Returns the array of DataFeeds from the factory
   *
   * @param factoryInput struct defining the parameters for the factory
   */
  public async buildFeeds(factoryInput: FactoryInput[]): Promise<DataFeed[]> {
    const feeds: DataFeed[] = [];
    for await (const f of factoryInput) {
      const newFeed = await this.createNewFeed(f);
      console.log(newFeed.toFormattedString());
      feeds.push(newFeed);
      await sleep(250);
    }
    return feeds;
  }

  private async createNewFeed(
    newFeed: FactoryInput,
    retryCount = 2
  ): Promise<DataFeed> {
    const feed = new DataFeed(newFeed);
    await feed.createFeed(
      this.connection,
      this.payerAccount,
      this.fulfillmentAccount,
      this.SWITCHBOARD_PID
    );
    if (feed.error) {
      console.log(`Failed to create feed, retrying ${feed.error}`);
      if (!retryCount) return feed;
      this.createNewFeed(newFeed, --retryCount);
    }
    if (feed.output?.dataFeed) {
      await this.verifyNewFeed(feed);
      feed.error = undefined; // reset if succesful
      saveKeypair(
        feed.output?.dataFeed,
        feed.input.name,
        `feeds/${this.sport}/keypairs`
      );
    }
    return feed;
  }

  private async verifyNewFeed(dataFeed: DataFeed): Promise<void> {
    await dataFeed.verifyFeed(this.connection);
  }
}
