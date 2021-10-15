import { JobInput, JobError, JobOutput } from "../../types";
import { createYahooEplJob } from "./yahoo";
import { createEspnEplJob } from "./espn";
import { OracleJob } from "@switchboard-xyz/switchboard-api";

export const eplFactory = (jobInput: JobInput): JobOutput => {
  let job: OracleJob;
  if (jobInput.jobProvider.toLowerCase() === "yahoo") {
    job = createYahooEplJob(jobInput.jobId);
  } else if (jobInput.jobProvider.toLowerCase() === "espn") {
    job = createEspnEplJob(jobInput.jobId);
  } else {
    throw new JobError(`failed to match epl provider ${jobInput.jobProvider}`);
  }
  if (job) {
    return {
      ...jobInput,
      job,
    };
  }
  throw new JobError(`failed to create epl job ${jobInput}`);
};
