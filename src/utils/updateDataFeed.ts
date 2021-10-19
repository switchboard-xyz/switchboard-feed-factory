import {
  Account,
  Connection,
  Context,
  PublicKey,
  SignatureResult,
} from "@solana/web3.js";
import {
  AggregatorState,
  parseAggregatorAccountData,
  updateFeed,
} from "@switchboard-xyz/switchboard-api";
import { EventEmitter } from "events";
import { waitFor } from "wait-for-event";
import { sleep } from "./sleep";
import chalk from "chalk";

export async function updateDataFeed(
  connection: Connection,
  payerAccount: Account,
  dataFeed: string,
  updateAuth: string
): Promise<void> {
  const dataFeedPubkey = new PublicKey(dataFeed);
  const updateAuthPubkey = new PublicKey(updateAuth);
  const signature = await updateFeed(
    connection,
    payerAccount,
    dataFeedPubkey,
    updateAuthPubkey
  );
  console.log(
    `Awaiting update transaction finalization... https://explorer.solana.com/tx/${signature}?cluster=devnet`
  );
  const emitter = new EventEmitter();
  const callback = async function (
    signatureResult: SignatureResult,
    _ctx: Context
  ) {
    if (signatureResult.err) {
      console.error("SignatureError:", signatureResult);
      emitter.emit("Failure");
      return;
    }
    let attempts = 30;
    while (attempts--) {
      const state: AggregatorState = await parseAggregatorAccountData(
        connection,
        dataFeedPubkey
      );
      const numSuccess = state.currentRoundResult?.numSuccess
        ? state.currentRoundResult?.numSuccess
        : 0;
      const numError = state.currentRoundResult?.numError
        ? state.currentRoundResult?.numError
        : 0;

      if (numSuccess + numError !== 0) {
        console.log(
          `(${dataFeedPubkey.toBase58()}) state.\n`,
          JSON.stringify(state.toJSON(), null, 2)
        );
        emitter.emit("Success");
        break;
      }
      // It may take a few more seconds for the oracle response to be processed.
      await sleep(1_000);
    }
    emitter.emit("Done");
  };
  connection.onSignature(signature, callback, "finalized");
  emitter.on("Failure", () => {
    console.error(`${chalk.red("Failed to update data feed")}`);
    emitter.emit("Done");
  });
  emitter.on("Success", () => {
    console.error(chalk.green("Successfully updated data feed"));
    emitter.emit("Done");
  });
  await waitFor("Done", emitter);
}
