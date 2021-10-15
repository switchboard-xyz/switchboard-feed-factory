import { Connection, Account, clusterApiUrl } from "@solana/web3.js";
import {
  SWITCHBOARD_DEVNET_PID,
  setFulfillmentManagerConfigs,
  createFulfillmentManager,
  createFulfillmentManagerAuth,
} from "@switchboard-xyz/switchboard-api";
import yargs from "yargs/yargs";
import fs from "fs";
import resolve from "resolve-dir";
import prompts from "prompts";
import chalk from "chalk";

async function main(): Promise<string> {
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

  const authAccount = await createFulfillmentManagerAuth(
    connection,
    payerAccount,
    fulfillmentManagerAccount,
    payerAccount.publicKey,
    {
      authorizeHeartbeat: true,
      authorizeUsage: false,
    }
  );

  const answer = await prompts([
    {
      type: "text",
      name: "keypairFile",
      message: "Enter a name for the output file",
      initial: "fulfillment-keypair.json",
    },
  ]);
  let keypairFile: string = answer.keypairFile;
  if (!keypairFile.endsWith(".json")) {
    keypairFile += ".json";
  }
  if (fs.existsSync(keypairFile)) {
    throw `${chalk.red(`file already exist:`)} ${keypairFile}`;
  }
  const secret = Uint8Array.from(fulfillmentManagerAccount.secretKey);
  fs.writeFileSync(keypairFile, `[${secret.toString()}]`);
  console.log(
    `${chalk.green("Fulfilmment manager created:")} ${chalk.blue(
      fulfillmentManagerAccount.publicKey.toString()
    )}`
  );

  const authSecret = Uint8Array.from(authAccount.secretKey);
  const authKeypairFile = `Auth-${keypairFile}`;
  if (fs.existsSync(authKeypairFile)) {
    throw `${chalk.red(`auth keypair file already exist:`)} ${authKeypairFile}`;
  }
  fs.writeFileSync(authKeypairFile, `[${authSecret.toString()}]`);

  console.log(
    `${chalk.green(
      "Fulfilmment manager authorization account created:"
    )} ${chalk.blue(authAccount.publicKey.toString())}`
  );

  return fulfillmentManagerAccount.publicKey.toString();
}

main().then(
  () => {
    process.exit();
  },
  (err) => {
    console.log(err);
    process.exit(-1);
  }
);
