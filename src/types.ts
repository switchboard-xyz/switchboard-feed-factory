import { Account } from "@solana/web3.js";
import { OracleJob } from "@switchboard-xyz/switchboard-api";
import chalk from "chalk";

export interface FeedInput {
  // (required) is used to name the output file where the feed's account keypair is stored.
  name: string;
  // (optional) will add an ESPN job for the specified match when provided.
  espnId?: string;
  // (optional) will add a Yahoo Sports job for the specified match when provided.
  yahooId?: string;
}
export class FactoryError extends Error {
  constructor(message: string, type?: string) {
    super(message);
    this.name = type ? type : "FactoryError";
  }
  public toString(): string {
    return `${chalk.red(this.name)}:: ${this.message}`;
  }
}

export interface FeedOutput extends FeedInput {
  dataFeed: Account;
  jobs: OracleJob[];
}

// export class FeedOutput implements FeedInput {
//   name: string;
//   espnId?: string;
//   yahooId?: string;
//   dataFeed: Account;
//   jobs: OracleJob[];

//   constructor(input: FeedInput, dataFeed: Account, jobs: OracleJob[]) {
//     this.name = input.name;
//     this.espnId = input.espnId;
//     this.yahooId = input.yahooId;
//     this.dataFeed = dataFeed;
//     this.jobs = jobs;
//   }
// }
