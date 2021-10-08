import { OracleJob } from "@switchboard-xyz/switchboard-api";

const createEspnJob = (espnMatchId: string): OracleJob => {
  const espnCompletedMatch = `$.competitions[?(@.status.type.completed && @.id == '${espnMatchId}')]`;
  return OracleJob.create({
    tasks: [
      OracleJob.Task.create({
        // The first task hits the ESPN API using the proper match ID (For example 606037).
        httpTask: OracleJob.HttpTask.create({
          url: `https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1/scoreboard/${espnMatchId}`,
        }),
      }),
      // Next we want to use a couple of nested ConditionalTask, which try to produce valid
      // output through running the `attempt` tasks and falling back to the `onFailure` tasks.
      OracleJob.Task.create({
        conditionalTask: OracleJob.ConditionalTask.create({
          attempt: [
            OracleJob.Task.create({
              conditionalTask: {
                // Our first attempt finds a match in the JSON data with the proper ID and
                // then looks for a competitor that has been marked both the home team and
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
                // that has been marked both the away team and the winner. If successful,
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
          onFailure: [
            OracleJob.Task.create({
              conditionalTask: OracleJob.ConditionalTask.create({
                // Next, we simply look for a completed match with the proper ID. If we were
                // unable to find a winner but the match has completed, the result must be a
                // draw. If successful, return ValueTask(0).
                attempt: [
                  OracleJob.Task.create({
                    jsonParseTask: OracleJob.JsonParseTask.create({
                      path: `${espnCompletedMatch}.id`,
                    }),
                  }),
                  OracleJob.Task.create({ valueTask: { value: 0 } }),
                ],
                // If all of the above fails, return ValueTask(-1).
                onFailure: [
                  OracleJob.Task.create({ valueTask: { value: -1 } }),
                ],
              }),
            }),
          ],
        }),
      }),
    ],
  });
};

export default createEspnJob;
