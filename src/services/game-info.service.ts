import MLBStatsAPI from "mlb-stats-typescript-api/output";
import { BoxscorePlayer } from "../models/api/boxscore.model";
import { BroadcastRestObject, GameBroadcastInfo } from "../models/api/game-broadcast.model";
import { GameContentRestObject } from "../models/api/game-content.model";
import { GamePlayerRestObject, GameRestObject } from "../models/api/game.model";
import { ScheduleRestGameObject } from "../models/api/schedule.model";
import { PlayerInfo } from "../models/player-info.model";
import { LoggerService } from "./logger.service";

export class GameInfoService {
    private logger: LoggerService;

    private scheduleObject: ScheduleRestGameObject | undefined;
    private gameObject: GameRestObject | undefined;
    private gameContentObject: GameContentRestObject | undefined;

    private broadcastInfo: GameBroadcastInfo | undefined;
    private playerInfo: Map<number, PlayerInfo> = new Map();
    private batterStats: { home: Map<number, any>, away: Map<number, any> } = { home: new Map(), away: new Map() };

    constructor() {
        this.logger = new LoggerService(GameInfoService.name);
    }

    get gamePk() {
        return this.gameObject?.gamePk || 0;
    }

    public async load(gamePk: number, timecode?: string) {
        this.logger.debug(`Loading game info for gamePk: ${gamePk} ...`);

        let pSchedule = MLBStatsAPI.ScheduleService.schedule(1, [gamePk], { hydrate: "broadcasts" });
        let pGameInfo = MLBStatsAPI.GameService.liveGameV1(gamePk, (timecode? { timecode } : {}));
        let pGameContent = MLBStatsAPI.GameService.content(gamePk);

        let schedule, gameInfo, gameContent;
        [schedule, gameInfo, gameContent] = await Promise.all([pSchedule, pGameInfo, pGameContent]);

        this.scheduleObject = schedule?.dates?.at(0)?.games?.at(0) || {};
        this.gameObject = gameInfo;
        this.gameContentObject = gameContent;

        this.parseBroadcasts(this.scheduleObject?.broadcasts || []);
        this.parsePlayerInfo(gameInfo);
        await this.parsePlayerStatsVsProbPitcher();

        return;
    }

    public async update(timecode?: string) {
        let gamePk = this.gamePk;

        let pGameInfo = MLBStatsAPI.GameService.liveGameV1(gamePk, (timecode? { timecode } : {}));
        let pGameContent = MLBStatsAPI.GameService.content(gamePk);
        [this.gameObject, this.gameContentObject] = await Promise.all([pGameInfo, pGameContent]);

        //call this again here in case lineups were not available on first load
        await this.parsePlayerStatsVsProbPitcher();

        this.updatePlayerBoxscores(this.gameObject);

        return;
    }

    public getDateTime() {
        return this.gameObject?.gameData?.datetime || {};
    }

    public getGameStatus() {
        return this.gameObject?.gameData?.status || {};
    }

    /**
     * Determine if game state is "Preview"
     * @returns 
     */
    public isGameStatePreview() {
        return (this.getGameStatus().abstractGameState == "Preview");
    }

    /**
     * Determine if game state is "Live"
     * @returns 
     */
    public isGameStateLive() {
        return (this.getGameStatus().abstractGameState == "Live");
    }

    /**
     * Determine if game state is "Final"
     * @returns 
     */
    public isGameStateFinal() {
        return (this.getGameStatus().abstractGameState == "Final");
    }

    public getHomeTeam() {
        return this.gameObject?.gameData?.teams?.home || {};
    }

    public getAwayTeam() {
        return this.gameObject?.gameData?.teams?.away || {};
    }

    public getVenue() {
        return this.gameObject?.gameData?.venue || {};
    }

    public getWeather() {
        return this.gameObject?.gameData?.weather || {};
    }

    public getGameInfo() {
        return this.gameObject?.gameData?.gameInfo || {};
    }

    public getProbablePitchers() {
        let probablePitchers = this.gameObject?.gameData?.probablePitchers || {};
        let homePitcherId = probablePitchers.home?.id || 0;
        let homePitcher = this.getPlayerInfo(homePitcherId);

        let awayPitcherId = probablePitchers.away?.id || 0;
        let awayPitcher = this.getPlayerInfo(awayPitcherId);        

        return { home: homePitcher, away: awayPitcher };
    }

    public getBatterStatsVsProbPitcher(id: number) {
        if( this.batterStats.home.has(id) ) {
            return this.batterStats.home.get(id);
        }
        return this.batterStats.away.get(id);
    }

    private getPlays() {
        return this.gameObject?.liveData?.plays || {};
    }

    public getAllPlays() {
        return this.getPlays().allPlays || [];
    }

    public getScoringPlays() {
        let retScoringPlays: any[] = [];
        let allPlays = this.getPlays().allPlays 
        let scoringPlays = (this.getPlays().scoringPlays as number[]);
        
        scoringPlays?.forEach(pIndex => {
            retScoringPlays.push(allPlays?.at(pIndex));
        });

        return retScoringPlays;
    }

    public getHighlights() {
        let highlights: any[] = this.gameContentObject?.highlights?.highlights?.items || [];
        return highlights.sort((a,b) => {
            let aDt = new Date(a.date);
            let bDt = new Date(b.date);
            return (a < b? -1 : (a > b? 1 : 0));
        });
    }

    public getLinescore() {
        return this.gameObject?.liveData?.linescore || {};
    }

    public getBoxscore() {
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

        broadcasts.forEach((broadcast: BroadcastRestObject) => {
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

    private async parsePlayerStatsVsProbPitcher() {
        let probablePitchers = this.getProbablePitchers();

        let homeBox = this.getBoxscore().teams?.home;
        let homeBattingOrder = homeBox?.battingOrder || [];

        let awayBox = this.getBoxscore().teams?.away;
        let awayBattingOrder = awayBox?.battingOrder || [];

        // If we have a lineup and there is nothing in the map,
        // then call the API and build the map
        if( homeBattingOrder.length > 0 && probablePitchers.away && this.batterStats.home.size == 0 ) {
            this.logger.debug("Home batting order present AND no stats loaded; loading stats...");
            let awayPitchId = probablePitchers.away?.getProfile().id || 0;
            this.batterStats.home = await this.loadBatterStatsVsProbPitcher(homeBattingOrder, awayPitchId);
        }
        if( awayBattingOrder.length > 0 && probablePitchers.home && this.batterStats.away.size == 0 ) {
            this.logger.debug("Away batting order present AND no stats loaded; loading stats...");
            let homePitchId = probablePitchers.home?.getProfile().id || 0;
            this.batterStats.away = await this.loadBatterStatsVsProbPitcher(awayBattingOrder, homePitchId);
        }
    }

    /**
     * Fetch batter stats vs specific pitcher
     * @param batterIds 
     * @param pitcherId 
     * @returns 
     */
    private async loadBatterStatsVsProbPitcher(batterIds: number[], pitcherId: number) {
        // Using direct URL since MLBStatsAPI does not currently have a method for this
        let personIds = batterIds.join(",");
        let hydration = `stats(group=[hitting],type=[vsPlayer],opposingPlayerId=${pitcherId},sportId=1)`;
        let url = `https://statsapi.mlb.com/api/v1/people/?personIds=${personIds}&hydrate=${hydration}`;

        this.logger.debug("Fetching batter stats vs pitcher: ", url);

        let stats = new Map<number, any>();
        return fetch(url).then(response => response.json()).then((response) => {
            (response?.people || []).forEach((p: any) => {
                let vsPlayerTotal = (p?.stats || []).find((s: any) => { return s?.type?.displayName == "vsPlayerTotal"; });
                let hittingStats = (vsPlayerTotal?.splits?.at(0)?.stat || {});
                stats.set(p.id, hittingStats);
            });
            return stats;

        }).catch((e) => {
            this.logger.error(e);
            return stats;
        });
    }    
}