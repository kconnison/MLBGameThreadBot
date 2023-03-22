export declare type GameBroadcastInfo = {
    tv: GameBroadcastFeeds;
    radio: GameBroadcastFeeds;
}

export declare type GameBroadcastFeeds = {
    home: BroadcastRestObject[];
    away: BroadcastRestObject[];
    national: BroadcastRestObject[];
}

export declare type BroadcastRestObject = {
    id: number;
    name: string;
    type: "AM" | "FM" | "TV";
    language: string;
    homeAway: string;
    isNational?: boolean;
    callSign: string;
    videoResolution?: {
        code: string;
        resolutionShort: string;
        resolutionFull: string;
    }
};