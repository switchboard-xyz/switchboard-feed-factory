import { JobError, JobInput, JobOutput } from "../types";
import { eplFactory } from "../jobs/epl";
import { nbaFactory } from "../jobs/nba";

export const jobFactory = (sport: string, jobInput: JobInput): JobOutput => {
  if (sport.toLowerCase() === "epl") {
    return eplFactory(jobInput);
  } else if (sport.toLowerCase() === "nba") {
    return nbaFactory(jobInput);
  }
  const err = `failed to match sport ${sport}`;
  console.error(err);
  throw new JobError(err);
};
