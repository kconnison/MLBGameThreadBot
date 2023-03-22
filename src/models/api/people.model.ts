export declare type PeopleRestObject = {
    people: PersonRestObject[];
};

export declare type PersonRestObject = {
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
    active?: true,
    primaryPosition?: {
        code?: string;
        name?: string;
        type?: string;
        abbreviation?: string;
    },
    useName?: string;
    useLastName?: string;
    boxscoreName?: string;
    gender?: string;
    isPlayer?: true,
    isVerified?: true,
    draftYear?: number;
    stats?: PersonStats[];
    mlbDebutDate?: string;
    batSide?: {
        code?: string;
        description?: string;
    },
    pitchHand?: {
        code?: string;
        description?: string;
    },
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

export declare type PersonStats = {
    type?: {
        displayName?: string;
    },
    group?: {
        displayName?: string;
    },
    totalSplits?: number;
    exemptions?: [],
    splits?: PersonStatsSplit[];
};

export declare type PersonStatsSplit = {
    season?: string;
    stat?: {
        gamesPlayed?: number;
        groundOuts?: number;
        airOuts?: number;
        doubles?: number;
        triples?: number;
        homeRuns?: number;
        strikeOuts?: number;
        baseOnBalls?: number;
        intentionalWalks?: number;
        hits?: number;
        hitByPitch?: number;
        avg?: string;
        atBats?: number;
        obp?: string;
        slg?: string;
        ops?: string;
        groundIntoDoublePlay?: number;
        groundIntoTriplePlay?: number;
        numberOfPitches?: number;
        plateAppearances?: number;
        totalBases?: number;
        rbi?: number;
        leftOnBase?: number;
        sacBunts?: number;
        sacFlies?: number;
        babip?: string;
        groundOutsToAirouts?: string;
        catchersInterference?: number;
        atBatsPerHomeRun?: string;
    },
    team?: {
        id?: number;
        name?: string;
        link?: string;
    },
    opponent?: {
        id?: number;
        name?: string;
        link?: string;
    },
    gameType?: string;
    numTeams?: number;
    pitcher?: {
        id?: number;
        fullName?: string;
        link?: string;
        firstName?: string;
        lastName?: string;
    },
    batter?: {
        id?: number;
        fullName?: string;
        link?: string;
        firstName?: string;
        lastName?: string;
    }
};