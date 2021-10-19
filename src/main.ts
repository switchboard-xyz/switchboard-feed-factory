import fs from "fs";
import chalk from "chalk";
import {
  FactoryError,
  AppConfig,
  DataFeedFactory,
  ConfigError,
} from "./types/";
import { getConfig } from "./config";
import { ingestFeeds } from "./utils/ingestFeeds";
import readlineSync from "readline-sync";

async function main(): Promise<void> {
  const config: AppConfig = await getConfig();

  // read in feeds from json
  const factoryInput = ingestFeeds(config.sport);
  console.log(chalk.blue("# of New Feeds:"), factoryInput.length);

  const factory = new DataFeedFactory(config);

  const ffmCheck = await factory.verifyFulfillmentManager();
  if (ffmCheck instanceof ConfigError) {
    console.log(ffmCheck.toString());
    throw ffmCheck;
  }
  if (!readlineSync.keyInYN("Does the configuration look correct?")) {
    console.log("Exiting...");
    throw new ConfigError("user exited");
  }

  const ts = Date.now();

  console.log(
    chalk.underline.yellow(
      "######## Creating Data Feeds from JSON File ########"
    )
  );
  const factoryOutput = await factory.buildFeeds(factoryInput);

  /**
   * TO DO
   * Save Keypair function should be invoked here
   * Need better saving format with provided configs and output keypair location
   * Maybe better output directory structure (feeds/<sport>/<timestamp>)
   * Maybe let user provide a job name to bundle output files
   */
  const createdFeeds = factoryOutput.filter((f) => f.output);
  if (createdFeeds.length > 0) {
    fs.writeFileSync(
      `./CreatedFeeds-${config.sport.toUpperCase()}-${Date.now()}.json`,
      JSON.stringify(createdFeeds, null, 2)
    );
  } else {
    console.log("No newly created data feeds");
  }

  const errorMap = {};
  factoryOutput
    .filter((f) => f.error)
    .forEach((f) => {
      if (f.error) {
        errorMap[f.input.name] = f.error?.toString();
      }
    });
  if (Object.keys(errorMap).length > 0) {
    fs.writeFileSync(
      `./Errors-${config.sport.toUpperCase()}-${Date.now()}.json`,
      JSON.stringify(errorMap, null, 2)
    );
  } else {
    console.log("No errors");
  }
}

main().then(
  () => {
    console.log(chalk.green("Switchboard-Feed-Factory ran successfully."));
    process.exit();
  },
  (err) => {
    if (err instanceof FactoryError) {
      console.log(err.toString());
      process.exit(-1);
    } else {
      console.log(err);
      process.exit(-1);
    }
  }
);
