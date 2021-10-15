import fs from "fs";
import chalk from "chalk";
import { FactoryError } from "./types/";
import { getConfig, AppConfig } from "./config";

async function main(): Promise<void> {
  // Read in config with prompts
  const config: AppConfig = await getConfig();

  console.log(
    chalk.underline.yellow(
      "######## Creating Data Feeds from JSON File ########"
    )
  );
  // pass factory input to factory and parse account response
  const factoryOutput = await config.factory.buildFeeds(config.factoryInput);

  // Write to output file
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
