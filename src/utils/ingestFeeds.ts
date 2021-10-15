import fs from "fs";
import { FactoryInput, JsonInput } from "../types";
import { JobInput } from "../types/factory";
import { JsonInputError } from "../types/error";

/**
   * Handles the mapping between chosen job type and parsed JSON file
   * Returns an input for the Data Feed Factory
   *
   * @param sport - epl | nba
   * @returns Array of FactoryInput elements for the DataFeedFactory to consume

   */
export const ingestFeeds = (sport: string): FactoryInput[] => {
  let inputFile: string;
  switch (sport.toLowerCase()) {
    case "epl":
      inputFile = "epl.feeds.json";
      break;
    case "nba":
      inputFile = "nba.feeds.json";
      break;
    default:
      throw `couldnt match a sport for ${sport} - (epl/nba)`;
  }
  try {
    const fileBuffer = fs.readFileSync(inputFile);
    const jsonInput: JsonInput[] = JSON.parse(fileBuffer.toString());
    const factoryInput = jsonInput.map((f): FactoryInput => {
      const jobs: JobInput[] = [];
      if (f.espnId) {
        jobs.push({
          jobProvider: "espn",
          jobId: f.espnId,
        });
      }
      if (f.yahooId) {
        jobs.push({
          jobProvider: "yahoo",
          jobId: f.yahooId,
        });
      }
      return {
        name: f.name,
        sport,
        jobs,
      };
    });
    return factoryInput;
  } catch (err) {
    throw `please create ${inputFile} - ${err}`;
  }
  throw new JsonInputError("failed to parse json file");
};
