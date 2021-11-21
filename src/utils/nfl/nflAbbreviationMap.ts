interface TeamAbbreviation {
  yahoo: string;
  espn: string;
}

const abbreviationList: TeamAbbreviation[] = [
  { yahoo: "arizona-cardinals", espn: "ARI" },
  { yahoo: "atlanta-falcons", espn: "ATL" },
  { yahoo: "buffalo-bills", espn: "BUF" },
  { yahoo: "baltimore-ravens", espn: "BAL" },
  { yahoo: "carolina-panthers", espn: "CAR" },
  { yahoo: "cincinnati-bengals", espn: "CIN" },
  { yahoo: "cleveland-browns", espn: "CLE" },
  { yahoo: "chicago-bears", espn: "CHI" },
  { yahoo: "dallas-cowboys", espn: "DAL" },
  { yahoo: "denver-broncos", espn: "DEN" },
  { yahoo: "detroit-lions", espn: "DET" },
  { yahoo: "green-bay-packers", espn: "GB" },
  { yahoo: "houston-texans", espn: "HOU" },
  { yahoo: "indianapolis-colts", espn: "IND" },
  { yahoo: "kansas-city-chiefs", espn: "KC" },
  { yahoo: "las-vegas-raiders", espn: "LV" },
  { yahoo: "los-angeles-chargers", espn: "LAC" },
  { yahoo: "los-angeles-rams", espn: "LAR" },
  { yahoo: "jacksonville-jaguars", espn: "JAX" },
  { yahoo: "miami-dolphins", espn: "MIA" },
  { yahoo: "minnesota-vikings", espn: "MIN" },
  { yahoo: "new-england-patriots", espn: "NE" },
  { yahoo: "new-orleans-saints", espn: "NO" },
  { yahoo: "new-york-giants", espn: "NYG" },
  { yahoo: "new-york-jets", espn: "NYJ" },
  { yahoo: "philadelphia-eagles", espn: "PHI" },
  { yahoo: "pittsburgh-steelers", espn: "PIT" },
  { yahoo: "san-francisco-49ers", espn: "SF" },
  { yahoo: "seattle-seahawks", espn: "SEA" },
  { yahoo: "tampa-bay-buccaneers", espn: "TB" },
  { yahoo: "tennessee-titans", espn: "TEN" },
  { yahoo: "washington-football-team", espn: "WSH" },
];

// [espnAbbreviation, teamName]
const espnAbbreviationToName: [string, string][] = [];
for (const abbr of abbreviationList) {
  espnAbbreviationToName.push([abbr.espn, abbr.yahoo]);
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

export const getYahooAbbreviations = (): string[] =>
  Array.from(abbreviationList.values()).map((abbr) => abbr.yahoo);

// `philadelphia-eagles` => `Philadelphia Eagles`
export const capitalizeTeamName = (team: string | undefined): string => {
  if (!team) return "";
  return team
    .split("-")
    .map((word) => `${word[0].toUpperCase()}${word.slice(1)}`)
    .join(" ");
};
