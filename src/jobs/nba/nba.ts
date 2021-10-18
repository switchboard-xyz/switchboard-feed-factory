import { OracleJob } from "@switchboard-xyz/switchboard-api";
import { getDateString } from "../../utils/fetchNba/getDates";

/**
 * IN PROGRESS
 * A utils file to help keep track of NBA (National Basketball Association) logic for feeds.
 */

export const createEspnNbaJob = (date: Date, nbaId: string): OracleJob => {
  const d = getDateString(date).replaceAll("-", "");
  const espnCompletedMatch = `$.competitions[?(@.status.type.completed && @.id == '${nbaId}')]`;
  return OracleJob.create({
    tasks: [
      // The first task hits the NBA API using the proper match ID
      OracleJob.Task.create({
        httpTask: OracleJob.HttpTask.create({
          url: `http://data.nba.net/prod/v1/${d}/${nbaId}_boxscore.json`,
        }),
      }),

      // check game is finished
      // statusNum = 1 (NOT STARTED), = 2 (IN PROGRESS?), = 3 (FINISHED)
      OracleJob.Task.create({
        jsonParseTask: OracleJob.JsonParseTask.create({
          path: `$.basicGameData.statusNum`,
        }),
      }),
      OracleJob.Task.create({
        valueTask: OracleJob.ValueTask.create({
          value: 3,
        }),
      }),

      // Get max value of home team vs away team
      OracleJob.Task.create({
        maxTask: {
          tasks: [
            OracleJob.Task.create({
              jsonParseTask: OracleJob.JsonParseTask.create({
                path: `$.basicGameData.hTeam.score`,
              }),
            }),
            OracleJob.Task.create({
              jsonParseTask: OracleJob.JsonParseTask.create({
                path: `$.basicGameData.vTeam.score`,
              }),
            }),
          ],
        },
      }),
    ],
  });
};
