import fs from "fs";
import { FactoryInput } from "../types";

/**
   * Returns the parsed JSON file file corresponding to a given sport
   *
   * @param sportFlag - epl | nba
   * @returns Array of jobIDs

   */
export const ingestFeeds = (sportFlag: string): FactoryInput[] => {
  switch (sportFlag.toLowerCase()) {
    case "epl": {
      try {
        const fileBuffer = fs.readFileSync("epl.feeds.json");
        const eplFeeds: FactoryInput[] = JSON.parse(fileBuffer.toString());
        return eplFeeds;
      } catch (err) {
        throw "please create epl.feeds.json";
      }
    }
    case "nba": {
      try {
        const fileBuffer = fs.readFileSync("nba.feeds.json");
        const nbaFeeds: FactoryInput[] = JSON.parse(fileBuffer.toString());
        return nbaFeeds;
      } catch (err) {
        throw "please create nba.feeds.json";
      }
    }
    default:
      throw `couldnt match a sport for ${sportFlag} - (epl/nba)`;
  }
};
