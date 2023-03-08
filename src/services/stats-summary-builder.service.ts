import { bold } from "@discordjs/builders";
import { PlayerInfo } from "../models/player-info.model";
import { GameInfoService } from "./game-info.service";

export class StatsSummaryBuilder {
    constructor(private gameInfo: GameInfoService) { }

    public buildProbablePitchersSummary() {
        let probablePitchers = this.gameInfo.getProbablePitchers();

        let homeTeamName = this.gameInfo.getHomeTeam().teamName || "";
        let hPitcher = probablePitchers.home;

        let awayTeamName = this.gameInfo.getAwayTeam().teamName || "";
        let aPitcher = probablePitchers.away;

        const buildPitcherDescription = (teamName: string, pitcher: PlayerInfo | undefined) => {
            if( pitcher ) {
                let pName = pitcher?.getProfile()?.fullName || "";
                let pSeasonStats = pitcher?.getSeasonStats()?.pitching || {};
                let pRecord = `${pSeasonStats.wins}-${pSeasonStats.losses}`;
                let pERA = pSeasonStats.era;
                let pIP = pSeasonStats.inningsPitched;  
                
                return `${bold(teamName)} - ${pName} (${pRecord}, ${pERA} ERA, ${pIP} IP)`;
            }       
            return `${bold(teamName)} - TBD`;
        };

        let pitchers = [buildPitcherDescription(awayTeamName, aPitcher), buildPitcherDescription(homeTeamName, hPitcher)];
        return pitchers.join("\n");
    }
}