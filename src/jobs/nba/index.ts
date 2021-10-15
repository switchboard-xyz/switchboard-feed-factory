import { JobInput, JobError, JobOutput } from "../../types";
import { createYahooNbaJob } from "./yahoo";
import { createEspnNbaJob } from "./espn";
import { OracleJob } from "@switchboard-xyz/switchboard-api";

export const nbaFactory = (jobInput: JobInput): JobOutput => {
  let job: OracleJob;
  if (jobInput.jobProvider.toLowerCase() === "yahoo") {
    job = createYahooNbaJob(jobInput.jobId);
  } else if (jobInput.jobProvider.toLowerCase() === "espn") {
    job = createEspnNbaJob(jobInput.jobId);
  } else {
    throw new JobError(`failed to match nba provider ${jobInput.jobProvider}`);
  }
  if (job) {
    return {
      ...jobInput,
      job,
    };
  }
  throw new JobError(`failed to create nba job ${jobInput}`);
};
