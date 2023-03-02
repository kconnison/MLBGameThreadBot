import MLBStatsAPI from "mlb-stats-typescript-api/output";
import { GameRestObject } from "mlb-stats-typescript-api/output/src";
import { LoggerService } from "./logger.service";

export class GameInfoService {
    private logger: LoggerService;
    private gameInfo: GameRestObject | undefined;

    constructor() {
        this.logger = new LoggerService(GameInfoService.name);
    }

    get gamePk() {
        return this.gameInfo?.gamePk || 0;
    }

    get datetime() {
        return this.gameInfo?.gameData?.datetime || {};
    }

    get gameStatus() {
        return this.gameInfo?.gameData?.status || {};
    }

    get homeTeam() {
        return this.gameInfo?.gameData?.teams?.home || {};
    }

    get awayTeam() {
        return this.gameInfo?.gameData?.teams?.away || {};
    }

    get plays() {
        return this.gameInfo?.liveData?.plays || {};
    }

    get linescore() {
        return this.gameInfo?.liveData?.linescore || {};
    }

    get boxscore() {
        return this.gameInfo?.liveData?.boxscore || {};
    }

    public async load(gamePk: number) {
        this.logger.debug(`Loading game info for gamePk: ${gamePk} ...`);
        this.gameInfo = (await MLBStatsAPI.GameService.liveGameV1(gamePk));
        return this.gameInfo;        
    }

    public update() {
        this.load(this.gamePk);
    }
}