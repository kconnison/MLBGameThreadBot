import { GameContentRestObject } from "../models/api/game-content.model";
import { GameRestObject } from "../models/api/game.model";
import { PeopleRestObject } from "../models/api/people.model";
import { ScheduleRestObject } from "../models/api/schedule.model";
import { StandingsRestObject } from "../models/api/standings.model";
import { http } from "../utils/http.utils";

export namespace mlb {
    const baseURL = "https://statsapi.mlb.com/api";

    export namespace game {
        export function getLiveGameV1(gamePk: number, options: { timecode?: string; } = {}) {
            let url = `${baseURL}/v1.1/game/${gamePk}/feed/live`;
            let optionKeys = Object.keys(options);
            if( optionKeys.length > 0 ) {
                url += "?";
                optionKeys.forEach(opt => {
                    url += `&${opt}=${(options as any)[opt]}`;
                });
            }

            return http.get<GameRestObject>(url);
        }

        export function getContent(gamePk: number) {
            let url = `${baseURL}/v1/game/${gamePk}/content`;
            return http.get<GameContentRestObject>(url);
        }
    }

    export namespace people {
        export function getPersonStatsAgainst(personIds: number[], opposingPlayerId: number) {
            let url = `${baseURL}/v1/people/`;
            let hydration = `stats(group=[hitting],type=[vsPlayer],opposingPlayerId=${opposingPlayerId},sportId=1)`;
            url += `?personIds=${personIds.join(",")}&hydrate=${hydration}`;
            return http.get<PeopleRestObject>(url);
        }
    }

    export namespace schedule {
        export function getSchedule(gamePks: number[] = [], options: { teamId?: number; date?: string; hydrate?: string; } = {}) {
            let url = `${baseURL}/v1/schedule?sportId=1`;
            if( gamePks.length > 0 ) {
                url += `&gamePk=${gamePks.join(",")}`;
            }
            Object.keys(options).forEach((opt) => {
                url += `&${opt}=${(options as any)[opt]}`;
            });
            
            return http.get<ScheduleRestObject>(url);
        }
    }

    export namespace standings {
        export function getStandingsByDivision(leagueIds: number[]) {
            let url = `${baseURL}/v1/standings?leagueId=${leagueIds.join(",")}&standingsTypes=byDivision&hydrate=division`;
            return http.get<StandingsRestObject>(url);
        }
    }
}