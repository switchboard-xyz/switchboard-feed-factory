export interface TeamAbbreviation {
  nba: string;
  yahoo: string;
  espn: string;
}

export const abbreviationMap: Map<string, TeamAbbreviation> = new Map([
  [
    "atlanta-hawks",
    {
      nba: "ATL",
      yahoo: "ATL",
      espn: "ATL",
    },
  ],
  [
    "boston-celtics",
    {
      nba: "BOS",
      yahoo: "BOS",
      espn: "BOS",
    },
  ],
  [
    "charlotte-hornets",
    {
      nba: "CHA",
      yahoo: "CHA",
      espn: "CHA",
    },
  ],
  [
    "chicago-bulls",
    {
      nba: "CHI",
      yahoo: "CHI",
      espn: "CHI",
    },
  ],
  [
    "cleveland-cavaliers",
    {
      nba: "CLE",
      yahoo: "CLE",
      espn: "CLE",
    },
  ],
  [
    "dallas-mavericks",
    {
      nba: "DAL",
      yahoo: "DAL",
      espn: "DAL",
    },
  ],
  [
    "denver-nuggets",
    {
      nba: "DEN",
      yahoo: "DEN",
      espn: "DEN",
    },
  ],
  [
    "detroit-pistons",
    {
      nba: "DET",
      yahoo: "DET",
      espn: "DET",
    },
  ],
  [
    "golden-state-warriors",
    {
      nba: "GSW",
      yahoo: "GSW",
      espn: "GS",
    },
  ],
  [
    "houston-rockets",
    {
      nba: "HOU",
      yahoo: "HOU",
      espn: "HOU",
    },
  ],
  [
    "indiana-pacers",
    {
      nba: "IND",
      yahoo: "IND",
      espn: "IND",
    },
  ],
  [
    "los-angeles-clippers",
    {
      nba: "LAC",
      yahoo: "LAC",
      espn: "LAC",
    },
  ],
  [
    "los-angeles-lakers",
    {
      nba: "LAL",
      yahoo: "LAL",
      espn: "LAL",
    },
  ],
  [
    "memphis-grizzlies",
    {
      nba: "MEM",
      yahoo: "MEM",
      espn: "MEM",
    },
  ],
  [
    "miami-heat",
    {
      nba: "MIA",
      yahoo: "MIA",
      espn: "MIA",
    },
  ],
  [
    "milwaukee-bucks",
    {
      nba: "MIL",
      yahoo: "MIL",
      espn: "MIL",
    },
  ],
  [
    "minnesota-timberwolves",
    {
      nba: "MIN",
      yahoo: "MIN",
      espn: "MIN",
    },
  ],
  [
    "new-orleans-pelicans",
    {
      nba: "NOP",
      yahoo: "NOH",
      espn: "NO",
    },
  ],
  [
    "new-york-knicks",
    {
      nba: "NYK",
      yahoo: "NYK",
      espn: "NY",
    },
  ],
  [
    "brooklyn-nets",
    {
      nba: "BKN",
      yahoo: "BKN",
      espn: "BKN",
    },
  ],
  [
    "oklahoma-city-thunder",
    {
      nba: "OKC",
      yahoo: "OKC",
      espn: "OKC",
    },
  ],
  [
    "orlando-magic",
    {
      nba: "ORL",
      yahoo: "ORL",
      espn: "ORL",
    },
  ],
  [
    "philadelphia-76ers",
    {
      nba: "PHI",
      yahoo: "PHI",
      espn: "PHI",
    },
  ],
  [
    "phoenix-suns",
    {
      nba: "PHX",
      yahoo: "PHO",
      espn: "PHX",
    },
  ],
  [
    "portland-trail-blazers",
    {
      nba: "POR",
      yahoo: "POR",
      espn: "POR",
    },
  ],
  [
    "san-antonio-spurs",
    {
      nba: "SAS",
      yahoo: "SA",
      espn: "SA",
    },
  ],
  [
    "sacramento-kings",
    {
      nba: "SAC",
      yahoo: "SAC",
      espn: "SAC",
    },
  ],
  [
    "toronto-raptors",
    {
      nba: "TOR",
      yahoo: "TOR",
      espn: "TOR",
    },
  ],
  [
    "utah-jazz",
    {
      nba: "UTA",
      yahoo: "UTH",
      espn: "UTAH",
    },
  ],
  [
    "washington-wizards",
    {
      nba: "WAS",
      yahoo: "WAS",
      espn: "WSH",
    },
  ],
]);

// [nbaAbbreviation, teamName]
const nbaAbbreviationToName: [string, string][] = [];
for (const [key, value] of abbreviationMap) {
  nbaAbbreviationToName.push([value.nba, key]);
}
export const getTeamFromNbaAbbreviation = (nbaAbbreviation: string): string => {
  const team = nbaAbbreviationToName.find((t) => t[0] === nbaAbbreviation);
  if (team) return team[1];
  console.error(
    `failed to get team name for NBA abbreviation ${nbaAbbreviation}`
  );
  return nbaAbbreviation;
};

// [espnAbbreviation, teamName]
const espnAbbreviationToName: [string, string][] = [];
for (const [key, value] of abbreviationMap) {
  espnAbbreviationToName.push([value.espn, key]);
}
export const getTeamFromEspnAbbreviation = (
  espnAbbreviation: string
): string => {
  const team = espnAbbreviationToName.find((t) => t[0] === espnAbbreviation);
  if (team) return team[1];
  console.error(
    `failed to get team name for ESPN abbreviation ${espnAbbreviation}`
  );
  return espnAbbreviation;
};

// `atlanta-hawks` => `Atlanta Hawks`
export const capitalizeTeamName = (team: string | undefined): string => {
  if (!team) return "";
  return team
    .split("-")
    .map((word) => `${word[0].toUpperCase()}${word.slice(1)}`)
    .join(" ");
};
