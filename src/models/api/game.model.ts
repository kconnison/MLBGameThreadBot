import { BoxscoreRestObject } from "./boxscore.model";
import { GameStatus } from "./schedule.model";

export declare type GameRestObject = {
    copyright?: string;
    gamePk?: number;
    link?: string;
    metaData?: {
        wait?: number;
        timeStamp?: string;
        gameEvents?: [];
        logicalEvents?: [];
    };
    gameData?: {
        game?: {
            pk?: number;
            type?: string;
            doubleHeader?: string;
            id?: number;
            gamedayType?: string;
            tiebreaker?: string;
            gameNumber?: number;
            calendarEventID?: string;
            season?: string;
            seasonDisplay?: string;
        };
        datetime?: {
            dateTime?: string;
            originalDate?: string;
            officialDate?: string;
            dayNight?: string;
            time?: string;
            ampm?: string;
        };
        status?: GameStatus;
        teams?: {
            away?: GameTeamRestObject;
            home?: GameTeamRestObject;
        };
        players?: GamePlayerRestObject[];
        venue?: {
            id?: number;
            name?: string;
            link?: string;
            location?: {
                address1?: string;
                city?: string;
                state?: string;
                stateAbbrev?: string;
                postalCode?: string;
                country?: string;
            };
            timeZone?: {
                id?: number;
                offset?: number;
                tz?: string;
            };
            fieldInfo?: {
                capacity?: number;
                turfType?: string;
                roofType?: string;
                leftLine?: number;
                leftCenter?: number;
                center?: number;
                rightCenter?: number;
                rightLine?: number;
            };
            active?: boolean;
        };
        officialVenue?: {
            id?: number;
            link?: string;
        };
        weather?: {
            condition?: string;
            temp?: string;
            wind?: string;
        };
        gameInfo?: {
            attendance?: number;
            firstPitch?: string;
            gameDurationMinutes?: number;
        };
        review?: {
            hasChallenges?: boolean;
            away?: {
                used?: number;
                remaining?: number;
            };
            home?: {
                used?: number;
                remaining?: number;
            };
        };
        flags?: {
            noHitter?: boolean;
            perfectGame?: boolean;
            awayTeamNoHitter?: boolean;
            awayTeamPerfectGame?: boolean;
            homeTeamNoHitter?: boolean;
            homeTeamPerfectGame?: boolean;
        };
        alerts?: [];
        probablePitchers?: {
            home?: {
                id?: number;
                fullName?: string;
                link?: string;
            };
            away?: {
                id?: number;
                fullName?: string;
                link?: string;
            };
        };
    };
    liveData?: {
        plays?: {
            allPlays?: GamePlayRestObject[];
            currentPlay?: GamePlayRestObject;
            scoringPlays?: number[];
            playsByInning?: {
                startIndex?: number;
                endIndex?: number;
                top?: number[];
                bottom?: number[];
                hits?: {
                    home?: []
                    away?: [];
                };
            }[];
        };
        linescore?: {
            currentInning?: number;
            currentInningOrdinal?: string;
            inningState?: string;
            inningHalf?: string;
            isTopInning?: boolean;
            scheduledInnings?: number;
            innings?: {
                num?: number;
                ordinalNum?: string;
                home?: {
                    runs?: number;
                    hits?: number;
                    errors?: number;
                    leftOnBase?: number;
                };
                away?: {
                    runs?: number;
                    hits?: number;
                    errors?: number;
                    leftOnBase?: number;                    
                };
            }[];
            teams?: {
                home?: {
                    runs?: number;
                    hits?: number;
                    errors?: number;
                    leftOnBase?: number;
                };
                away?: {
                    runs?: number;
                    hits?: number;
                    errors?: number;
                    leftOnBase?: number;                    
                };
            };
            defense?: {
                team?: {
                    id?: number;
                    name?: string;
                    link?: string;
                };
            };
            offense?: {
                team?: {
                    id?: number;
                    name?: string;
                    link?: string;
                };
            };
        };
        boxscore?: BoxscoreRestObject;
    };
};
export declare type GamePlayerRestObject = {
    id?: number;
    fullName?: string;
    link?: string;
    firstName?: string;
    lastName?: string;
    primaryNumber?: string;
    birthDate?: string;
    currentAge?: number;
    birthCity?: string;
    birthStateProvince?: string;
    birthCountry?: string;
    height?: string;
    weight?: number;
    active?: boolean;
    primaryPosition?: {
        code?: string;
        name?: string;
        type?: string;
        abbreviation?: string;
    };
    useName?: string;
    middleName?: string;
    boxscoreName?: string;
    gender?: string;
    isPlayer?: boolean;
    isVerified?: boolean;
    draftYear?: number;
    mlbDebutDate?: string;
    batSide?: {
        code?: string;
        description?: string;
    };
    pitchHand?: {
        code?: string;
        description?: string;
    };
    nameFirstLast?: string;
    nameSlug?: string;
    firstLastName?: string;
    lastFirstName?: string;
    lastInitName?: string;
    initLastName?: string;
    fullFMLName?: string;
    fullLFMName?: string;
    strikeZoneTop?: number;
    strikeZoneBottom?: number;
};
export declare type GameTeamRestObject = {
    allStarStatus?: string;
    id?: number;
    name?: string;
    link?: string;
    season?: number;
    venue?: IdNameLinkRestObject;
    teamCode?: string;
    fileCode?: string;
    abbreviation?: string;
    teamName?: string;
    locationName?: string;
    firstYearOfPlay?: string;
    league?: IdNameLinkRestObject;
    division?: IdNameLinkRestObject;
    sport?: {
        id?: number;
        link?: string;
        name?: string;
    };
    shortName?: string;
    record?: {
        gamesPlayed?: number;
        wildCardGamesBack?: string;
        leagueGamesBack?: string;
        springLeagueGamesBack?: string;
        sportGamesBack?: string;
        divisionGamesBack?: string;
        conferenceGamesBack?: string;
        leagueRecord?: {
            wins?: number;
            losses?: number;
            ties?: number;
            pct?: string;
        };
        records?: {};
        divisionLeader?: boolean;
        wins?: number;
        losses?: number;
        winningPercentage?: string;
    };
    parentOrgName?: string;
    parentOrgId?: number;
    franchiseName?: string;
    clubName?: string;
    active?: boolean;
};
export declare type GamePlayRestObject = {
    result?: {
        type?: string;
        event?: string;
        eventType?: string;
        description?: string;
        rbi?: number;
        awayScore?: number;
        homeScore?: number;
        isOut?: boolean;
    };
    about?: {
        atBatIndex?: number;
        halfInning?: string;
        isTopInning?: boolean;
        inning?: number;
        startTime?: string;
        endTime?: string;
        isComplete?: boolean;
        isScoringPlay?: boolean;
        hasReview?: boolean;
        hasOut?: boolean;
        captivatingIndex?: number;
    };
    count?: {
        balls?: number;
        strikes?: number;
        outs?: number;
    };
    matchup?: {
        batter?: {
            id?: number;
            fullName?: string;
            link?: string;
        };
        batSide?: {
            code?: string;
            description?: string;
        };
        pitcher?: {
            id?: number;
            fullName?: string;
            link?: string;
        };
        pitchHand?: {
            code?: string;
            description?: string;
        };        
    };
    pitchIndex?: number[];
    actionIndex?: number[];
    runnerIndex?: number[];
    runners?: [];
    playEvents?: {
        details?: {
            description?: string;
            event?: string;
            eventType?: string;
            awayScore?: number;
            homeScore?: number;
            isScoringPlay?: boolean;
            isOut?: boolean;
            hasReview?: boolean;           
        };
        count?: {
            balls?: number;
            strikes?: number;
            outs?: number;
        };
        index?: number;
        startTime?: string;
        endTime?: string;
        isPitch?: boolean;
        type?: string;
        player?: {
            id?: number;
            link?: string;
        };
    }[];
    playEndTime?: string;
    atBatIndex?: number;
};

export declare type IdNameLinkRestObject = {
    id?: number;
    name?: string;
    link?: string;
};
