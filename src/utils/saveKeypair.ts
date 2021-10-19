import { Account } from "@solana/web3.js";
import fs from "fs";
import { getUniqueFileName } from "./getUniqueFileName";

/**
 * Saves keypair to path/name.json as a Uint8 array. If file already
 * exist, then the existing file will be renamed with _(#)
 *
 * @param account the solana account holding the secret key
 * @param name the name of the keypair, typically the data feed name
 * @param path the path to save the keypair to without the trailing slash
 * @param extension (default json) the extension of the keypair
 */
export async function saveKeypair(
  account: Account,
  name: string,
  path: string,
  extension = "json"
): Promise<void> {
  const outputDir = path.endsWith("/") ? path.slice(0, -1) : path;
  fs.mkdirSync(outputDir, { recursive: true });
  const secret = Uint8Array.from(account.secretKey);
  const secretKeypairFile = `${name}.${extension}`;
  const fullSecretKeypairPath = `${outputDir}/${secretKeypairFile}`;

  // rename file if it exist
  if (fs.existsSync(fullSecretKeypairPath)) {
    const renamedFile = await getUniqueFileName(outputDir, name);
    fs.renameSync(fullSecretKeypairPath, renamedFile);
  }
  fs.writeFileSync(fullSecretKeypairPath, `[${secret.toString()}]`);
}
