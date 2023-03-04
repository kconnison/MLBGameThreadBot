import MLBStatsAPI from "mlb-stats-typescript-api/output";
import { GameContentRestObject, GameRestObject } from "mlb-stats-typescript-api/output/src";
import { LoggerService } from "./logger.service";

export class GameInfoService {
    private logger: LoggerService;
    private gameInfo: GameRestObject | undefined;
    private gameContent: GameContentRestObject | undefined;

    constructor() {
        this.logger = new LoggerService(GameInfoService.name);
    }

    get gamePk() {
        return this.gameInfo?.gamePk || 0;
    }

    getDateTime() {
        return this.gameInfo?.gameData?.datetime || {};
    }

    getGameStatus() {
        return this.gameInfo?.gameData?.status || {};
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
        return this.gameInfo?.gameData?.teams?.home || {};
    }

    getAwayTeam() {
        return this.gameInfo?.gameData?.teams?.away || {};
    }

    getPlayers() {
        return this.gameInfo?.gameData?.players || {};
    }

    getVenue() {
        return this.gameInfo?.gameData?.venue || {};
    }

    getWeather() {
        return (this.gameInfo?.gameData?.weather as any) || {};
    }

    getGameInfo() {
        return (this.gameInfo?.gameData?.gameInfo as any) || {};
    }

    getPlays() {
        return this.gameInfo?.liveData?.plays || {};
    }

    getLinescore() {
        return this.gameInfo?.liveData?.linescore || {};
    }

    getBoxscore() {
        return this.gameInfo?.liveData?.boxscore || {};
    }

    getMedia() {
        return (this.gameContent as any)?.media?.epg || []
    }

    public async load(gamePk: number) {
        this.logger.debug(`Loading game info for gamePk: ${gamePk} ...`);

        let pGameInfo = MLBStatsAPI.GameService.liveGameV1(gamePk);
        let pGameContent = MLBStatsAPI.GameService.content(gamePk);
        [this.gameInfo, this.gameContent] = await Promise.all([pGameInfo, pGameContent]);
        return;        
    }

    public update() {
        this.load(this.gamePk);
    }
}