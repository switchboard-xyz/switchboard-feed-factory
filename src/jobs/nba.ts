import { OracleJob } from "@switchboard-xyz/switchboard-api";

/**
 * A utils file to help keep track of NBA (National Basketball Association) logic for feeds.
 */

const createEspnJob = (espnMatchId: string): OracleJob => {
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

const createYahooJob = (yahooMatchId: string): OracleJob => {
  const yahooMatchNumber = yahooMatchId.slice(
    yahooMatchId.lastIndexOf("-") + 1
  );

  // Try to find a match for the query and return its attendance (because a numerical response is
  // required).
  const matchFilter = (filter: string) =>
    `$.context.dispatcher.stores.GamesStore.games` +
    `[?(@.gameid == 'nba.g.${yahooMatchNumber}' && @.status_type == 'final' && ${filter})]` +
    `.attendance`;
  return OracleJob.create({
    tasks: [
      OracleJob.Task.create({
        // The first task hits the Yahoo Sports using the proper match ID (For example
        // memphis-grizzlies-charlotte-hornets-2021100730).
        httpTask: OracleJob.HttpTask.create({
          url: `https://sports.yahoo.com/nba/${yahooMatchId}`,
        }),
      }),
      OracleJob.Task.create({
        regexExtractTask: {
          pattern: `root.App.main\\s+=\\s+(\\{.*\\})`,
          groupNumber: 1,
        },
      }),
      OracleJob.Task.create({
        conditionalTask: OracleJob.ConditionalTask.create({
          attempt: [
            OracleJob.Task.create({
              jsonParseTask: {
                path: matchFilter(`@.winning_team_id == @.home_team_id`),
              },
            }),
            // If the match is final and home team is marked the winner, return 1.
            OracleJob.Task.create({ valueTask: { value: 1 } }),
          ],
          onFailure: [
            OracleJob.Task.create({
              jsonParseTask: {
                path: matchFilter(`@.winning_team_id == @.away_team_id`),
              },
            }),
            // If the match is final and away team is marked the winner, return 2.
            OracleJob.Task.create({ valueTask: { value: 2 } }),
          ],
        }),
      }),
    ],
  });
};

export function buildNbaMatchResultJobs(
  espnMatchId?: string,
  yahooMatchId?: string
): OracleJob[] {
  const jobs: OracleJob[] = [];
  if (espnMatchId) jobs.push(createEspnJob(espnMatchId));
  if (yahooMatchId) jobs.push(createEspnJob(yahooMatchId));
  return jobs;
}
