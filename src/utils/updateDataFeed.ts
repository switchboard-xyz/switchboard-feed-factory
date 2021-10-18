import { Account, clusterApiUrl, Connection } from "@solana/web3.js";
import yargs from "yargs/yargs";
import fs from "fs";
import resolve from "resolve-dir";
import prompts, { Choice } from "prompts";
import path from "path";

// NOT IMPLEMENTED
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

  const jsonFiles: Choice[] = fs
    .readdirSync("./")
    .filter((file) => path.extname(file) === ".json")
    .map((fileName) => {
      return {
        value: fileName,
        title: fileName,
      };
    });

  const pickJson = await prompts([
    {
      type: "select",
      name: "jsonFile",
      message: "Pick a JSON file to import",
      choices: jsonFiles,
    },
  ]);
  console.log(`selected ${pickJson.jsonFile}`);

  //   let dataFeedPubkey = new PublicKey(argv.dataFeedPubkey);
  //   let updateAuthPubkey = new PublicKey(argv.updateAuthPubkey);
  //   let signature = await updateFeed(
  //     connection,
  //     payerAccount,
  //     dataFeedPubkey,
  //     updateAuthPubkey
  //   );
  //   console.log("Awaiting update transaction finalization...");
  //   let emitter = new EventEmitter();
  //   let callback = async function (
  //     signatureResult: SignatureResult,
  //     ctx: Context
  //   ) {
  //     let attempts = 30;
  //     while (attempts--) {
  //       let state: AggregatorState = await parseAggregatorAccountData(
  //         connection,
  //         dataFeedPubkey
  //       );
  //       if (
  //         state.currentRoundResult.numSuccess +
  //           state.currentRoundResult.numError !==
  //         0
  //       ) {
  //         console.log(
  //           `(${dataFeedPubkey.toBase58()}) state.\n`,
  //           JSON.stringify(state.toJSON(), null, 2)
  //         );
  //         break;
  //       }
  //       // It may take a few more seconds for the oracle response to be processed.
  //       await sleep(1_000);
  //     }
  //     emitter.emit("Done");
  //   };
  //   connection.onSignature(signature, callback, "processed");
  //   await waitFor("Done", emitter);
  return "";
}

main().then(
  () => {
    process.exit();
  },
  (err) => {
    console.log(err);
    return "";
  }
);
