export declare type GameContentRestObject = {
    editorial?: {};
    media?: {};
    highlights?: {
        scoreboard?: {};
        gameCenter?: {};
        milestone?: {};
        highlights?: {
            items?: GameContentHightlightItem[];
        };
        live?: {
            items?: []
        };
        scoreboardPreview?: {
            items?: [];
        };
    };
    summary: {
        hasPreviewArticle?: boolean;
        hasRecapArticle?: boolean;
        hasWrapArticle?: boolean;
        hasHighlightsVideo?: boolean;
    };
    gameNotes: {};
};

export declare type GameContentHightlightItem = {
    type?: string;
    state?: string;
    date?: string;
    id?: string;
    headline?: string;
    seoTitle?: string;
    slug?: string;
    keywordsAll?: { 
        type?: string;
        value?: string; 
        displayName?: string; 
    }[];
    keywordsDisplay?: [];
    image?: {
        title?: string;
        altText?: string;
        templateUrl?: string;
        cuts?: {
            aspectRatio?: string;
            height?: number;
            width?: number;
            src?: string;
            at2x?: string;
            at3x?: string;
        }[];
    };
    noIndex?: boolean;
    mediaPlaybackId?: string;
    title?: string;
    description?: string;
    duration?: string;
    mediaPlaybackUrl?: string;
    playbacks?: {
        name?: string;
        url?: string;
        width?: string;
        height?: string;
    }[];
};