import { Connection, Account } from "@solana/web3.js";
import FeedType from "./types";
export default class DataFeedFactory {
    private connection;
    private payerAccount;
    private fulfillmentManager;
    constructor(newConnection: Connection, payer: Account);
    createEplFeed(feed: FeedType): Promise<Account>;
}
