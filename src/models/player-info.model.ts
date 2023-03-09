import { BoxscorePlayer, GamePlayerRestObject } from "mlb-stats-typescript-api/output/src";

export class PlayerInfo {
    private boxscore: BoxscorePlayer = {};

    constructor(private profile: GamePlayerRestObject) {
        return this;
    }

    public getProfile() {
        return this.profile;
    }

    public getBoxscore() {
        return this.boxscore;
    }

    public setBoxscore(newBoxscore: BoxscorePlayer) {
        this.boxscore = newBoxscore;
        return this;
    }

    public getGameStats() {
        return this.boxscore.stats;
    }

    public getGameBattingSummary() {
        return "";
    }

    public getGamePitchingSummary() {
        return "";
    }

    public getSeasonStats() {
        return this.boxscore.seasonStats;
    }

    public getSeasonBattingSummary() {
        return "";
    }

    public getSeasonPitchingSummary() {
        let seasonStats = this.getSeasonStats()?.pitching || {};
        let record = `${seasonStats.wins}-${seasonStats.losses}`;
        let era = seasonStats.era;
        let ip = seasonStats.inningsPitched;  

        return `${record}, ${era} ERA, ${ip} IP`;
    }
}