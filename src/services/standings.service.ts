import { bold } from "discord.js";
import { GameTeamRestObject } from "../models/api/game.model";
import { TeamStandingsRecordContainerRestObject, TeamStandingsRecordRestObject } from "../models/api/standings.model";
import { LoggerService } from "./logger.service";
import { mlb } from "./mlb-stats.api";

export class StandingsService {    
    private logger: LoggerService;
    public byDivision: Map<number, TeamStandingsRecordContainerRestObject> = new Map();    

    constructor() {
        this.logger = new LoggerService(StandingsService.name);
    }

    public loadStandingsByDivision(leagueIds: number[]) {
        this.logger.debug(`Loading standings for league(s): ${leagueIds}`);
        return mlb.standings.getStandingsByDivision(leagueIds).then((standings) => {
            standings.records?.forEach((record) => {
                this.byDivision.set((record.division?.id || 0), record);
            });
        })
    }

    public buildDivisionStandingsSummary(awayTeam: GameTeamRestObject, homeTeam: GameTeamRestObject) {
        let summary = "";
        const mapDivisionTeamRecordRow = (rec: TeamStandingsRecordRestObject) => {
            let recSummary = `${rec.divisionRank}) ${rec.team?.name}\n> ${rec.wins}-${rec.losses}`
            + (!rec.divisionLeader? ` (${rec.divisionGamesBack} GB, E#: ${rec.eliminationNumber})` 
            + `\n> WC Rank: ${rec.wildCardRank} (${rec.wildCardGamesBack} GB, E#: ${rec.wildCardEliminationNumber})` : ``);

            // if record is for either team, bold it
            if( rec.team?.id == awayTeam.id || rec.team?.id == homeTeam.id ) {
                recSummary = bold(recSummary);
            }

            return recSummary;
        };

        let awayDivisionStandings = this.byDivision.get(awayTeam.division?.id || 0);
        summary += `${bold(awayDivisionStandings?.division?.name || "")}\n`
        summary += awayDivisionStandings?.teamRecords?.map(mapDivisionTeamRecordRow).join("\n");

        // if home team is in different division then map summary, otherwise skip it
        if( homeTeam.division?.id != awayTeam.division?.id ) {
            summary += "\n\n\n";

            let homeDivisionStandings = this.byDivision.get(homeTeam.division?.id || 0);
            summary += `${bold(homeDivisionStandings?.division?.name || "")}\n`
            summary += homeDivisionStandings?.teamRecords?.map(mapDivisionTeamRecordRow).join("\n");
        }

        return summary;
    }
}