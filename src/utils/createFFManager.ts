import { Connection, Account, clusterApiUrl } from "@solana/web3.js";
import {
  SWITCHBOARD_DEVNET_PID,
  setFulfillmentManagerConfigs,
  createFulfillmentManager,
} from "@switchboard-xyz/switchboard-api";
import yargs from "yargs/yargs";
import fs from "fs";
import resolve from "resolve-dir";

async function main(): Promise<void> {
  const argv = yargs(process.argv.slice(2))
    .options({
      payerKeypairFile: {
        type: "string",
        describe: "Path to keypair file that will pay for transactions.",
        demand: true,
      },
      cluster: {
        type: "string",
        describe: "devnet, testnet, or mainnet-beta",
        demand: false,
        default: "devnet",
      },
    })
    .parseSync();

  const url = clusterApiUrl("devnet", true);
  const connection = new Connection(url, "processed");
  const payerKeypair = JSON.parse(
    fs.readFileSync(resolve(argv.payerKeypairFile), "utf-8")
  );
  const payerAccount = new Account(payerKeypair);
  const fulfillmentManagerAccount = await createFulfillmentManager(
    connection,
    payerAccount,
    SWITCHBOARD_DEVNET_PID
  );

  await setFulfillmentManagerConfigs(
    connection,
    payerAccount,
    fulfillmentManagerAccount,
    {
      heartbeatAuthRequired: true,
      usageAuthRequired: true,
      lock: false,
    }
  );

  console.log(fulfillmentManagerAccount.publicKey.toString());
  // 9DQtXe31pHpNsVskZJpbDUBUGKdxDCV96L7N4Xwbi62X
}

main().then(
  () => {
    console.log("Created Fulfillment Manager account succesfully");
    process.exit();
  },
  (err) => {
    console.log(err);
    process.exit(-1);
  }
);
