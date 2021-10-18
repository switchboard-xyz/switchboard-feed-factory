import { Account, PublicKey, Cluster } from "@solana/web3.js";
import { OracleJob } from "@switchboard-xyz/switchboard-api";

// should keep track of configuration parameters that might change flow of program
// log this on error
export interface AppConfig {
  sport: string;
  cluster: Cluster;
  fulfillmentAccount: Account;
  payerAccount: Account;
  factoryInput: FactoryInput[];
}

/**
 * @param name  Unique name for the data feed
 * @param espnId (optional) The ESPN ID associated with the data feed
 * @param yahooId  (optional) The Yahoo ID associated with the data feed
 */
export interface JsonInput {
  name: string;
  date?: Date;
  nbaId?: string;
  espnId?: string;
  yahooId?: string;
}

export interface FactoryInput {
  name: string;
  sport: string;
  jobs: JobInput[];
}
export interface FactoryOutput {
  dataFeed: Account;
  updateAuth: Account;
  jobs: JobOutput[];
}
export interface FactoryOutputJSON {
  name: string;
  dataFeed: string;
  updateAuth: string;
  minConfirmation: number;
  minUpdateDelay: number;
  jobs: JobOutputJSON[];
}

export interface JobOutput {
  jobProvider: string;
  jobId: string;
  job: OracleJob;
  pubKey?: PublicKey;
}
export interface JobInput {
  jobProvider: string;
  jobId: string;
}
export interface JobOutputJSON {
  provider: string;
  id: string;
  pubKey: string;
}
