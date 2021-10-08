"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const web3_js_1 = require("@solana/web3.js");
const espn_1 = __importDefault(require("./jobs/espn"));
const yahoo_1 = __importDefault(require("./jobs/yahoo"));
const switchboard_api_1 = require("@switchboard-xyz/switchboard-api");
class DataFeedFactory {
    constructor(newConnection, payer) {
        this.fulfillmentManager = new web3_js_1.PublicKey("7s6kXRDAV7MKsfydrhsmB48qcUTB7L46C75occvaHgaL" // this isnt right
        );
        this.connection = newConnection;
        this.payerAccount = payer;
    }
    async createEplFeed(feed) {
        const espnJob = feed.espnId ? (0, espn_1.default)(feed.espnId) : null;
        const yahooJob = feed.yahooId ? (0, yahoo_1.default)(feed.yahooId) : null;
        let dateFeedAccount = await (0, switchboard_api_1.createDataFeed)(this.connection, this.payerAccount, switchboard_api_1.SWITCHBOARD_DEVNET_PID);
        if (espnJob) {
            dateFeedAccount = await (0, switchboard_api_1.addFeedJob)(this.connection, this.payerAccount, dateFeedAccount, espnJob.tasks);
        }
        if (yahooJob) {
            dateFeedAccount = await (0, switchboard_api_1.addFeedJob)(this.connection, this.payerAccount, dateFeedAccount, yahooJob.tasks);
        }
        await (0, switchboard_api_1.setDataFeedConfigs)(this.connection, this.payerAccount, dateFeedAccount, {
            minConfirmations: 5,
            minUpdateDelaySeconds: 60,
            fulfillmentManagerPubkey: this.fulfillmentManager.toBuffer(),
            lock: false,
        });
        return dateFeedAccount;
    }
}
exports.default = DataFeedFactory;
//# sourceMappingURL=dataFeedFactory.js.map