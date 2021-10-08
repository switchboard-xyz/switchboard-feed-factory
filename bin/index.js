"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const web3_js_1 = require("@solana/web3.js");
const fs_1 = __importDefault(require("fs"));
const resolve_dir_1 = __importDefault(require("resolve-dir"));
const yargs_1 = __importDefault(require("yargs/yargs"));
const feeds_json_1 = __importDefault(require("./feeds.json"));
const dataFeedFactory_1 = __importDefault(require("./dataFeedFactory"));
function toCluster(cluster) {
    switch (cluster) {
        case "devnet":
        case "testnet":
        case "mainnet-beta": {
            return cluster;
        }
    }
    throw new Error("Invalid cluster provided.");
}
async function main() {
    // Read in keypair file to fund the new feeds
    const argv = (0, yargs_1.default)(process.argv.slice(2))
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
    const payerKeypair = JSON.parse(fs_1.default.readFileSync((0, resolve_dir_1.default)(argv.payerKeypairFile), "utf-8"));
    const payerAccount = new web3_js_1.Account(payerKeypair);
    console.log("Payer Account:", payerAccount.publicKey.toString());
    // Setup Solana connection
    const url = (0, web3_js_1.clusterApiUrl)(toCluster(argv.cluster), true);
    const connection = new web3_js_1.Connection(url, "processed");
    const feedFactory = new dataFeedFactory_1.default(connection, payerAccount);
    // Read in json feeds and pass to factory
    const feeds = feeds_json_1.default;
    const dataFeedAccounts = feeds.map((feed) => feedFactory.createEplFeed(feed));
    const dataFeeds = await Promise.all(dataFeedAccounts);
    // write to output file
    dataFeeds.forEach((f) => console.log(f.publicKey.toString()));
}
main().then(() => {
    console.log("Switchboard-EPL-Feeds ran successfully.");
    process.exit();
}, (err) => {
    console.log(err);
    process.exit(-1);
});
//# sourceMappingURL=index.js.map