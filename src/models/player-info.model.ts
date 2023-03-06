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

    public getSeasonStats() {
        return this.boxscore.seasonStats;
    }
}