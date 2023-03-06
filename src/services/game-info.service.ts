import MLBStatsAPI from "mlb-stats-typescript-api/output";
import { BoxscorePlayer, BroadcastRestObject, GameContentRestObject, GamePlayerRestObject, GameRestObject, ScheduleRestGameObject } from "mlb-stats-typescript-api/output/src";
import { PlayerInfo } from "../models/player-info.model";
import { LoggerService } from "./logger.service";

export class GameInfoService {
    private logger: LoggerService;

    private scheduleObject: ScheduleRestGameObject | undefined;
    private gameObject: GameRestObject | undefined;
    private gameContentObject: GameContentRestObject | undefined;

    private broadcastInfo: GameBroadcastInfo | undefined;
    private playerInfo: Map<number, PlayerInfo> = new Map();

    constructor() {
        this.logger = new LoggerService(GameInfoService.name);
    }

    get gamePk() {
        return this.gameObject?.gamePk || 0;
    }

    public async load(gamePk: number) {
        this.logger.debug(`Loading game info for gamePk: ${gamePk} ...`);

        let pSchedule = MLBStatsAPI.ScheduleService.schedule(1, [gamePk], { hydrate: "broadcasts" });
        let pGameInfo = MLBStatsAPI.GameService.liveGameV1(gamePk);
        let pGameContent = MLBStatsAPI.GameService.content(gamePk);

        let schedule, gameInfo, gameContent;
        [schedule, gameInfo, gameContent] = await Promise.all([pSchedule, pGameInfo, pGameContent]);

        this.scheduleObject = schedule?.dates?.at(0)?.games?.at(0) || {};
        this.gameObject = gameInfo;
        this.gameContentObject = gameContent;

        this.parseBroadcasts((this.scheduleObject as any)?.broadcasts);
        this.parsePlayerInfo(gameInfo);

        return;
    }

    public async update() {
        let gamePk = this.gamePk;

        let pGameInfo = MLBStatsAPI.GameService.liveGameV1(gamePk);
        let pGameContent = MLBStatsAPI.GameService.content(gamePk);
        [this.gameObject, this.gameContentObject] = await Promise.all([pGameInfo, pGameContent]);

        this.updatePlayerBoxscores(this.gameObject);

        return;
    }

    getDateTime() {
        return this.gameObject?.gameData?.datetime || {};
    }

    getGameStatus() {
        return this.gameObject?.gameData?.status || {};
    }

    /**
     * Determine if game status is "Preview"
     * @returns 
     */
    isGameStatusPreview() {
        return (this.getGameStatus().abstractGameState == "Preview");
    }

    /**
     * Determine if game status is "Live"
     * @returns 
     */
    isGameStatusLive() {
        return (this.getGameStatus().abstractGameState == "Live");
    }

    /**
     * Determine if game status is "Final"
     * @returns 
     */
    isGameStatusFinal() {
        return (this.getGameStatus().abstractGameState == "Final");
    }

    getHomeTeam() {
        return this.gameObject?.gameData?.teams?.home || {};
    }

    getAwayTeam() {
        return this.gameObject?.gameData?.teams?.away || {};
    }

    getVenue() {
        return this.gameObject?.gameData?.venue || {};
    }

    getWeather() {
        return (this.gameObject?.gameData?.weather as any) || {};
    }

    getGameInfo() {
        return (this.gameObject?.gameData?.gameInfo as any) || {};
    }

    getProbablePitchers() {
        let probablePitchers = (this.gameObject?.gameData?.probablePitchers as any) || {};
        let homePitcherId = probablePitchers.home?.id;
        let homePitcher = this.getPlayerInfo(homePitcherId);

        let awayPitcherId = probablePitchers.away?.id;
        let awayPitcher = this.getPlayerInfo(awayPitcherId);        

        return { home: homePitcher, away: awayPitcher };
    }

    getPlays() {
        return this.gameObject?.liveData?.plays || {};
    }

    getLinescore() {
        return this.gameObject?.liveData?.linescore || {};
    }

    getBoxscore() {
        return this.gameObject?.liveData?.boxscore || {};
    }

    public getPlayerInfo(id: number) {
        return this.playerInfo.get(id);
    }

    public getBroadcasts(): GameBroadcastInfo {
        let defaultInfo = { 
            tv: { home: [], away: [], national: [] }, 
            radio: { home: [], away: [], national: [] }
        };
        return this.broadcastInfo || defaultInfo;
    }

    private parseBroadcasts(broadcasts: BroadcastRestObject[]) {
        let broadcastInfo: any = { 
            tv: { home: [], away: [], national: [] }, 
            radio: { home: [], away: [], national: [] }
        };

        broadcasts.forEach((broadcast: any) => {
            let isNational = broadcast.isNational;
            let market = (isNational? "national" : broadcast.homeAway);

            if( ["AM", "FM"].includes(broadcast.type) ) {
                broadcastInfo.radio[market].push(broadcast.name);
            } else if( ["TV"].includes(broadcast.type) ) {
                broadcastInfo.tv[market].push(broadcast.name);
            }
        });

        this.broadcastInfo = broadcastInfo;
    }

    private parsePlayerInfo(gameInfo: GameRestObject) {
        let homePlayerBoxscores = gameInfo.liveData?.boxscore?.teams?.home?.players || {};
        let awayPlayerBoxscores = gameInfo.liveData?.boxscore?.teams?.away?.players || {};
        let playerBoxscores: any = {
            ...homePlayerBoxscores,
            ...awayPlayerBoxscores
        };

        let players: any = gameInfo.gameData?.players || {};
        for (let id in players) {
            let playerProfile: GamePlayerRestObject = players[id];
            let playerBoxscore: BoxscorePlayer = playerBoxscores[id];

            let playerId = playerProfile.id || 0;
            let playerInfo = new PlayerInfo(playerProfile).setBoxscore(playerBoxscore);
            this.playerInfo.set(playerId, playerInfo);
        }
    }

    private updatePlayerBoxscores(gameInfo: GameRestObject) {
        let homePlayerBoxscores = gameInfo.liveData?.boxscore?.teams?.home?.players || {};
        let awayPlayerBoxscores = gameInfo.liveData?.boxscore?.teams?.away?.players || {};
        let playerBoxscores: any = {
            ...homePlayerBoxscores,
            ...awayPlayerBoxscores
        };

        for (let id in playerBoxscores) {
            let playerBoxscore: BoxscorePlayer = playerBoxscores[id];
            let playerId = playerBoxscore.person?.id || 0;

            this.playerInfo.get(playerId)?.setBoxscore(playerBoxscore);
        }
    }
}

interface GameBroadcastInfo {
    tv: GameBroadcastFeeds;
    radio: GameBroadcastFeeds;
}

interface GameBroadcastFeeds {
    home: BroadcastRestObject[];
    away: BroadcastRestObject[];
    national: BroadcastRestObject[];
}