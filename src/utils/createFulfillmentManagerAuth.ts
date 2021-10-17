import { Connection, Account, clusterApiUrl } from "@solana/web3.js";
import { createFulfillmentManagerAuth } from "@switchboard-xyz/switchboard-api";
import yargs from "yargs/yargs";
import fs from "fs";
import resolve from "resolve-dir";
import chalk from "chalk";

async function main(): Promise<string> {
  const argv = yargs(process.argv.slice(2))
    .options({
      payerKeypairFile: {
        type: "string",
        describe: "Path to keypair file that will pay for transactions.",
        demand: true,
      },
      fulfillmentKeypair: {
        type: "string",
        describe:
          "Path to the keypair file that will orchestrate fulfillment request to oracles",
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
  // need better error handling
  // reuse other verify fulfillment function?
  const fulfillmentKeypair = JSON.parse(
    fs.readFileSync(resolve(argv.fulfillmentKeypair), "utf-8")
  );
  const fulfillmentAccount = new Account(fulfillmentKeypair);

  console.log(
    `# Creating authorization account to permit account ` +
      `${payerAccount.publicKey} to join fulfillment manager ` +
      `${fulfillmentAccount.publicKey}`
  );
  const authAccount = await createFulfillmentManagerAuth(
    connection,
    payerAccount,
    fulfillmentAccount,
    payerAccount.publicKey,
    {
      authorizeHeartbeat: true,
      authorizeUsage: false,
    }
  );

  console.log(
    `     ${chalk.green("export")} ${chalk.blue("AUTH_KEY")}=${chalk.yellow(
      authAccount.publicKey
    )}`
  );

  //   const authSecret = Uint8Array.from(authAccount.secretKey);
  //   const authKeypairFile = `Auth-${keypairFile}`;
  //   if (fs.existsSync(authKeypairFile)) {
  //     throw `${chalk.red(`auth keypair file already exist:`)} ${authKeypairFile}`;
  //   }
  //   fs.writeFileSync(authKeypairFile, `[${authSecret.toString()}]`);

  return authAccount.publicKey.toString();
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
