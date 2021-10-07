import * as readline from "readline-sync";
import yargs from "yargs";

const feeds = require("./feeds.jsonc");
const argv = await yargs(process.argv).options({
  payerKeypairFile: {
    type: "string",
    describe: "Path to keypair file that will pay for transactions.",
    demand: false,
    default: undefined,
  },
}).argv;

async function main() {
  // Try to produce a valid banker account.
  const banker =
    argv.payerKeypairFile ||
    readline.question("Please enter a path to a payer keypair file: ");
}

main().then(
  () => process.exit(),
  (err) => {
    console.error("Failed to complete successfully.");
    console.error(err);
    process.exit(-1);
  }
);
