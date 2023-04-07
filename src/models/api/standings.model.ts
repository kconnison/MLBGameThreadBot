export declare type StandingsRestObject = {
    records?: TeamStandingsRecordContainerRestObject[];
};

export declare type TeamStandingsRecordContainerRestObject = {
    standingsType?: string;
    lastUpdated?: string;
    sport?: SportRestObject;
    league?: LeagueRestObject;
    division?: DivisionRestObject;
    teamRecords?: TeamStandingsRecordRestObject[];
};

export declare type TeamStandingsRecordRestObject = {
    lastUpdated?: string;
    team?: TeamRestObject;
    season?: string;
    streak?: StreakRestObject;
    divisionRank?: string;
    leagueRank?: string;
    sportRank?: string;
    gamesPlayed?: number;
    gamesBack?: string;
    wildCardGamesBack?: string;
    leagueGamesBack?: string;
    springLeagueGamesBack?: string;
    sportGamesBack?: string;
    divisionGamesBack?: string;
    conferenceGamesBack?: string;
    leagueRecord?: WinLossRecordRestObject;
    records?: {
        splitRecords?: {
            wins?: number;
            losses?: number;
            type?: string;
            pct?: string;
        }[];
        divisionRecords?: {
            wins?: number;
            losses?: number;
            pct?: string;
            division?: {
                id?: number;
                name?: string;
                link?: string;
            }
        }[];
        overallRecords?: {
            wins?: number;
            losses?: number;
            type?: string;
            pct?: string;
        }[];
        leagueRecords: {
            wins?: number;
            losses?: number;
            pct?: string;
            league?: {
                id?: number;
                name?: string;
                link?: string;
            }
        }[];
        expectedRecords?: {
            wins?: number;
            losses?: number;
            type?: string;
            pct?: string;
        }[];
    };
    runsAllowed?: number;
    runsScored?: number;
    runDifferential?: number;
    divisionChamp?: boolean;
    divisionLeader?: boolean;
    hasWildcard?: boolean;
    clinched?: boolean;
    eliminationNumber?: string;
    wildCardEliminationNumber?: string;
    magicNumber?: string;
    wins?: number;
    losses?: number;
    winningPercentage?: string;
};

export declare type StreakRestObject = {
    streakType?: string;
    streakNumber?: number;
    streakCode?: string;
};

export declare type WinLossRecordRestObject = {
    wins?: number;
    losses?: number;
    ties?: number;
    pct?: string;
};

declare type SportRestObject = {
    id?: number;
    link?: string;
};

declare type LeagueRestObject = {
    id?: number;
    link?: string;
};

declare type DivisionRestObject = {
    id?: number;
    link?: string;
};

declare type TeamRestObject = {
    id?: number;
    name?: string;
    link?: string;    
};