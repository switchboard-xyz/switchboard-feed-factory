import { Cluster } from "@solana/web3.js";
import { FactoryError } from "./types";
import chalk from "chalk";

export function toCluster(cluster: string): Cluster {
  switch (cluster) {
    case "devnet":
    case "testnet":
    case "mainnet-beta": {
      return cluster;
    }
  }
  throw new Error("Invalid cluster provided.");
}
export function formatFactoryError(err: FactoryError): string {
  return `${chalk.red(err.name)}: ${err.message}`;
}
