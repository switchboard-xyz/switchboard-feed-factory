"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const switchboard_api_1 = require("@switchboard-xyz/switchboard-api");
const createYahooJob = (yahooMatchId) => {
    const yahooMatchNumber = yahooMatchId.slice(yahooMatchId.lastIndexOf("-") + 1);
    // Try to find a match for the query and return its attendance (because a numerical response is
    // required).
    const matchFilter = (filter) => `$.context.dispatcher.stores.GamesStore.games[?(` +
        `@.gameid == 'soccer.g.${yahooMatchNumber}' && ${filter})].attendance`;
    return switchboard_api_1.OracleJob.create({
        tasks: [
            switchboard_api_1.OracleJob.Task.create({
                // The first task hits the Yahoo Sports using the proper match ID (For example
                // aston-villa-everton-526807).
                httpTask: switchboard_api_1.OracleJob.HttpTask.create({
                    url: `https://sports.yahoo.com/soccer/premier-league/${yahooMatchId}`,
                }),
            }),
            switchboard_api_1.OracleJob.Task.create({
                regexExtractTask: {
                    pattern: `root.App.main\\s+=\\s+(\\{.*\\})`,
                    groupNumber: 1,
                },
            }),
            switchboard_api_1.OracleJob.Task.create({
                conditionalTask: switchboard_api_1.OracleJob.ConditionalTask.create({
                    attempt: [
                        switchboard_api_1.OracleJob.Task.create({
                            conditionalTask: switchboard_api_1.OracleJob.ConditionalTask.create({
                                attempt: [
                                    switchboard_api_1.OracleJob.Task.create({
                                        jsonParseTask: {
                                            path: matchFilter(`@.status_type == 'final' && @.winning_team_id == @.home_team_id`),
                                        },
                                    }),
                                    // If the match is final and home team is marked the winner, return 1.
                                    switchboard_api_1.OracleJob.Task.create({ valueTask: { value: 1 } }),
                                ],
                                onFailure: [
                                    switchboard_api_1.OracleJob.Task.create({
                                        jsonParseTask: {
                                            path: matchFilter(`@.status_type == 'final' && @.winning_team_id == @.away_team_id`),
                                        },
                                    }),
                                    // If the match is final and away team is marked the winner, return 2.
                                    switchboard_api_1.OracleJob.Task.create({ valueTask: { value: 2 } }),
                                ],
                            }),
                        }),
                    ],
                    onFailure: [
                        switchboard_api_1.OracleJob.Task.create({
                            conditionalTask: switchboard_api_1.OracleJob.ConditionalTask.create({
                                attempt: [
                                    switchboard_api_1.OracleJob.Task.create({
                                        jsonParseTask: {
                                            path: matchFilter(`@.status_type == 'final'`),
                                        },
                                    }),
                                    // If the match is final and away team is marked the winner, return 2.
                                    switchboard_api_1.OracleJob.Task.create({ valueTask: { value: 0 } }),
                                ],
                                onFailure: [
                                    // If a 'final' match outcome has not been found, return -1.
                                    switchboard_api_1.OracleJob.Task.create({ valueTask: { value: -1 } }),
                                ],
                            }),
                        }),
                    ],
                }),
            }),
        ],
    });
};
exports.default = createYahooJob;
//# sourceMappingURL=yahoo.js.map