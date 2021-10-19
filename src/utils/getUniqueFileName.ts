import fs from "fs";

/**
 * Returns a unique file name
 *
 * @param path output directory without trailing file separator
 * @param fileName desired output file name
 * @param extension (optional) file extension
 */
export async function getUniqueFileName(
  path: string,
  fileName: string,
  extension = "json"
): Promise<string> {
  let num = 1;
  let file = `${path}/${fileName}.${extension}`;
  if (fs.existsSync(file)) {
    file = `${path}/${fileName}_(${num}).${extension}`;
  }
  while (fs.existsSync(file)) {
    file = `${path}/${fileName}_(${num++}).${extension}`;
  }
  return file;
}
