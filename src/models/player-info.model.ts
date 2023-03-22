import { BoxscorePlayer } from "./api/boxscore.model";
import { GamePlayerRestObject } from "./api/game.model";

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
        return this.getGameStats()?.batting?.summary || "";
    }

    public getGamePitchingSummary() {
        return this.getGameStats()?.pitching?.summary || "";
    }

    public getSeasonStats() {
        return this.boxscore.seasonStats;
    }

    public getSeasonBattingSummary() {
        let seasonStats = this.getSeasonStats()?.batting || {};        
        let avg = seasonStats.avg;
        let obp = seasonStats.obp;
        let slg = seasonStats.slg;

        let hr = seasonStats.homeRuns;
        let rbi = seasonStats.rbi;
        let k = seasonStats.strikeOuts;

        return `${avg}/${obp}/${slg} | ${hr} HR, ${rbi} RBI, ${k} K`;
    }

    public getSeasonPitchingSummary() {
        let seasonStats = this.getSeasonStats()?.pitching || {};
        let record = `${seasonStats.wins}-${seasonStats.losses}`;
        let era = seasonStats.era;
        let ip = seasonStats.inningsPitched;  

        return `${record}, ${era} ERA, ${ip} IP`;
    }
}