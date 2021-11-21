import { eplFactory } from "../jobs/epl";
import { nbaFactory } from "../jobs/nba";
import { nflFactory } from "../jobs/nfl";
import { JobError, JobInput, JobOutput } from "../types";

export const jobFactory = (sport: string, jobInput: JobInput): JobOutput => {
  switch (sport.toLowerCase()) {
    case "epl":
      return eplFactory(jobInput);
    case "nba":
      return nbaFactory(jobInput);
    case "nfl":
      return nflFactory(jobInput);
    default:
      const err = `Failed to match sport ${sport}`;
      console.error(err);
      throw new JobError(err);
  }
};
