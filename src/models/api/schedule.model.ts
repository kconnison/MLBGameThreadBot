import { BroadcastRestObject } from "./game-broadcast.model";

export declare type ScheduleRestObject = {
    copyright?: string;
    totalItems?: number;
    totalEvents?: number;
    totalGames?: number;
    totalGamesInProgress?: number;
    dates?: Array<ScheduleRestDateObject>;
};
export declare type ScheduleRestDateObject = {
    date?: string;
    totalItems?: number;
    totalEvents?: number;
    totalGames?: number;
    totalGamesInProgress?: number;
    games?: Array<ScheduleRestGameObject>;
    events?: Array<any>;
};
export declare type GameStatusCode = "S" | "P" | "I" | "F" | "D" | "DI";
export declare type GameDetailedState = "Scheduled" | "Pre-Game" | "In Progress" | "Finished" | "Postponed";
export declare type AbstractGameCode = "P" | "L" | "F";
export declare type AbstractGameState = "Preview" | "Live" | "Final";
export declare type GameStatus = {
    abstractGameState?: AbstractGameState;
    codedGameState?: GameStatusCode;
    detailedState?: GameDetailedState;
    statusCode?: GameStatusCode;
    startTimeTBD?: boolean;
    abstractGameCode?: AbstractGameCode;
    reason?: string;
};
export declare type ScheduleRestGameObject = {
    gamePk?: number;
    link?: string;
    gameType?: string;
    season?: string;
    gameDate?: string;
    officialDate?: string;
    rescheduleDate?: string;
    rescheduleGameDate?: string;
    rescheduledFrom?: string;
    rescheduledFromDate?: string;
    status?: GameStatus;
    teams?: {
        away?: ScheduleRestTeamObject;
        home?: ScheduleRestTeamObject;
    };
    venue?: {
        id?: number;
        name?: string;
        link?: string;
    };
    broadcasts?: BroadcastRestObject[];
    content?: {
        link?: string;
    };
    gameNumber?: number;
    publicFacing?: boolean;
    doubleHeader?: string;
    gamedayType?: string;
    tiebreaker?: string;
    calendarEventID?: string;
    seasonDisplay?: string;
    dayNight?: string;
    scheduledInnings?: number;
    reverseHomeAwayStatus?: boolean;
    inningBreakLength?: number;
    gamesInSeries?: number;
    seriesGameNumber?: number;
    seriesDescription?: string;
    recordSource?: string;
    ifNecessary?: string;
    ifNecessaryDescription?: string;
};
export declare type ScheduleRestTeamObject = {
    leagueRecord?: {
        wins?: number;
        losses?: number;
        pct?: string;
    };
    score?: number;
    team?: {
        id?: number;
        name?: string;
        link?: string;
    };
    splitSquad?: boolean;
    seriesNumber?: number;
};