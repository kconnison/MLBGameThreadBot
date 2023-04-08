import { TeamStandingsRecordContainerRestObject } from "../models/api/standings.model";
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
}