import {
  Connection,
  PublicKey,
  Account,
  Cluster,
  clusterApiUrl,
} from "@solana/web3.js";
import { FactoryInput, ConfigError, DataFeed } from "./";
import {
  SWITCHBOARD_DEVNET_PID,
  SWITCHBOARD_MAINNET_PID,
  SWITCHBOARD_TESTNET_PID,
  parseFulfillmentAccountData,
} from "@switchboard-xyz/switchboard-api";
import { sleep } from "../utils/sleep";

export class DataFeedFactory {
  private connection: Connection;
  private payerAccount: Account;
  private fulfillmentAccount: Account;
  private authAccount?: Account; // might not be needed
  public SWITCHBOARD_PID: PublicKey;

  constructor(cluster: Cluster, payer: Account, fulfillment: Account) {
    const url = clusterApiUrl(cluster, true);
    this.connection = new Connection(url, "processed");
    this.payerAccount = payer;
    this.fulfillmentAccount = fulfillment;
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
      await this.verifyNewFeed(newFeed);
      console.log(newFeed.toFormattedString());
      await sleep(1_000);
      feeds.push(newFeed);
    }
    return feeds;
  }

  public async createNewFeed(newFeed: FactoryInput): Promise<DataFeed> {
    const dataFeed = new DataFeed(newFeed);
    await dataFeed.createFeed(
      this.connection,
      this.payerAccount,
      this.fulfillmentAccount,
      this.SWITCHBOARD_PID
    );
    return dataFeed;
  }

  public async verifyNewFeed(dataFeed: DataFeed): Promise<void> {
    await dataFeed.verifyFeed(this.connection);
  }
}
