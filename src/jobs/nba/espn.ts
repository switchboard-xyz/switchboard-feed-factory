import { OracleJob } from "@switchboard-xyz/switchboard-api";

/**
 * A utils file to help keep track of NBA (National Basketball Association) logic for feeds.
 */

export const createEspnNbaJob = (espnMatchId: string): OracleJob => {
  const espnCompletedMatch = `$.competitions[?(@.status.type.completed && @.id == '${espnMatchId}')]`;
  return OracleJob.create({
    tasks: [
      OracleJob.Task.create({
        // The first task hits the ESPN API using the proper match ID (For example 401365913).
        httpTask: OracleJob.HttpTask.create({
          url: `https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard/${espnMatchId}`,
        }),
      }),
      // Next we want to use a ConditionalTask, which will try to produce valid output through
      // running the `attempt` tasks and falling back to the `onFailure` tasks.
      OracleJob.Task.create({
        conditionalTask: {
          // Our first attempt finds a match in the JSON data with the proper ID and
          // then looks for a competitor that has been marked both the "home" team and
          // the winner. If successful, return ValueTask(1).
          //
          // An IMPORTANT NOTE here is that we parse out the competitor's ID because
          // the JsonParseTask expects to produce numerical output. If we make it
          // beyond the JsonParseTask successfully it means that we did find a
          // competitor that met our criteria and we can simply use a ValueTask to
          // to return our expected output.
          attempt: [
            OracleJob.Task.create({
              jsonParseTask: OracleJob.JsonParseTask.create({
                path: `${espnCompletedMatch}.competitors[?(@.winner && @.homeAway == 'home')].id`,
              }),
            }),
            OracleJob.Task.create({ valueTask: { value: 1 } }),
          ],
          // Our next attempt tries to do the same except it looks for a competitor
          // that has been marked both the "away" team and the winner. If successful,
          // return ValueTask(2).
          onFailure: [
            OracleJob.Task.create({
              jsonParseTask: OracleJob.JsonParseTask.create({
                path: `${espnCompletedMatch}.competitors[?(@.winner && @.homeAway == 'away')].id`,
              }),
            }),
            OracleJob.Task.create({ valueTask: { value: 2 } }),
          ],
        },
      }),
    ],
  });
};
