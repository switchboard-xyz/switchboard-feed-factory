import fs from "fs";
import chalk from "chalk";
import {
  FactoryError,
  AppConfig,
  DataFeedFactory,
  ConfigError,
  JsonInputError,
} from "./types/";
import { getConfig } from "./config";

async function main(): Promise<void> {
  const config: AppConfig = await getConfig();

  const factory = new DataFeedFactory(
    config.cluster,
    config.payerAccount,
    config.fulfillmentAccount
  );

  const ffmCheck = await factory.verifyFulfillmentManager();
  if (ffmCheck instanceof ConfigError) {
    console.log(ffmCheck.toString());
    throw ffmCheck;
  }

  console.log(
    chalk.underline.yellow(
      "######## Creating Data Feeds from JSON File ########"
    )
  );
  const factoryOutput = await factory.buildFeeds(config.factoryInput);

  const createdFeeds = factoryOutput.filter((f) => f.output);
  if (createdFeeds.length > 0) {
    fs.writeFileSync(
      `./CreatedFeeds-${Date.now()}.json`,
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
      `./Errors-${Date.now()}.json`,
      JSON.stringify(errorMap, null, 2)
    );
  } else {
    console.log("No errors");
  }
}

main().then(
  () => {
    console.log(chalk.green("Switchboard-EPL-Feeds ran successfully."));
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
