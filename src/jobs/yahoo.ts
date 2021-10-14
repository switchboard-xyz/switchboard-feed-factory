import { OracleJob } from "@switchboard-xyz/switchboard-api";

export const createYahooJob = (yahooMatchId: string): OracleJob => {
  const yahooMatchNumber = yahooMatchId.slice(
    yahooMatchId.lastIndexOf("-") + 1
  );

  // Try to find a match for the query and return its attendance (because a numerical response is
  // required).
  const matchFilter = (filter: string) =>
    `$.context.dispatcher.stores.GamesStore.games[?(` +
    `@.gameid == 'soccer.g.${yahooMatchNumber}' && ${filter})].attendance`;
  return OracleJob.create({
    tasks: [
      OracleJob.Task.create({
        // The first task hits the Yahoo Sports using the proper match ID (For example
        // aston-villa-everton-526807).
        httpTask: OracleJob.HttpTask.create({
          url: `https://sports.yahoo.com/soccer/premier-league/${yahooMatchId}`,
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
              conditionalTask: OracleJob.ConditionalTask.create({
                attempt: [
                  OracleJob.Task.create({
                    jsonParseTask: {
                      path: matchFilter(
                        `@.status_type == 'final' && @.winning_team_id == @.home_team_id`
                      ),
                    },
                  }),
                  // If the match is final and home team is marked the winner, return 1.
                  OracleJob.Task.create({ valueTask: { value: 1 } }),
                ],
                onFailure: [
                  OracleJob.Task.create({
                    jsonParseTask: {
                      path: matchFilter(
                        `@.status_type == 'final' && @.winning_team_id == @.away_team_id`
                      ),
                    },
                  }),
                  // If the match is final and away team is marked the winner, return 2.
                  OracleJob.Task.create({ valueTask: { value: 2 } }),
                ],
              }),
            }),
          ],
          onFailure: [
            OracleJob.Task.create({
              conditionalTask: OracleJob.ConditionalTask.create({
                attempt: [
                  OracleJob.Task.create({
                    jsonParseTask: {
                      path: matchFilter(`@.status_type == 'final'`),
                    },
                  }),
                  // If the match is final and away team is marked the winner, return 2.
                  OracleJob.Task.create({ valueTask: { value: 0 } }),
                ],
                // If all of the above fails, don't return a response.
                onFailure: [],
              }),
            }),
          ],
        }),
      }),
    ],
  });
};
