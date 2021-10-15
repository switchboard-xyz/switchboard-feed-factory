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

  /**
   * Reads the fulfillment manager account on-chain and verifies it is the correct account type
   */
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

  /**
   * Returns the array of DataFeeds from the factory
   *
   * @param factoryInput struct defining the parameters for the factory
   */
  public async buildFeeds(factoryInput: FactoryInput[]): Promise<DataFeed[]> {
    return await Promise.all(
      factoryInput.map(async (f) => {
        const newFeed = await this.createNewFeed(f);
        await this.verifyNewFeed(newFeed);
        console.log(newFeed.toFormattedString());
        return newFeed;
      })
    );
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
