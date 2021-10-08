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
  console.log(
    `${new FactoryError(
      `Invalid cluster ${cluster} [devnet / testnet / mainnet-beta]`,
      "ClusterErr"
    )}`
  );
  process.exit(-1);
  // throw new FactoryError("Invalid cluster provided.", "ClusterErr");
}
export function formatFactoryError(err: FactoryError): string {
  return `${chalk.red(err.name)}: ${err.message}`;
}
