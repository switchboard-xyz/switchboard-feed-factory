import { OracleJob } from "@switchboard-xyz/switchboard-api";
import { JobError, JobInput, JobOutput } from "../../types";
import { createEspnNflJob } from "./espn";
import { createYahooNflJob } from "./yahoo";

export const nflFactory = (jobInput: JobInput): JobOutput => {
  let job: OracleJob;
  if (jobInput.jobProvider.toLowerCase() === "yahoo") {
    job = createYahooNflJob(jobInput.jobId);
  } else if (jobInput.jobProvider.toLowerCase() === "espn") {
    job = createEspnNflJob(jobInput.jobId);
  } else {
    throw new JobError(`failed to match nfl provider ${jobInput.jobProvider}`);
  }
  if (job) {
    return {
      ...jobInput,
      job,
    };
  }
  throw new JobError(`failed to create nfl job ${jobInput}`);
};
