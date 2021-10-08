import { Account, PublicKey } from "@solana/web3.js";
import { OracleJob } from "@switchboard-xyz/switchboard-api";

/**
 * @param name  Unique name for the data feed
 * @param espnId (optional) The ESPN ID associated with the data feed
 * @param yahooId  (optional) The Yahoo ID associated with the data feed
 */
export interface FactoryInput {
  name: string;
  espnId?: string;
  yahooId?: string;
}
export interface FactoryOutput {
  dataFeed: Account;
  jobs: JobOutput[];
}
export interface JobOutput {
  provider: string;
  id: string;
  pubKey?: PublicKey;
  job?: OracleJob;
}
export interface FactoryOutputJSON {
  name: string;
  dataFeed: string;
  jobs: JobOutputJSON[];
}
export interface JobOutputJSON {
  provider: string;
  id: string;
  pubKey: string;
}
