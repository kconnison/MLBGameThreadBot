export namespace content {
    export namespace icon {
        export function getMatchupIcon(homeTeamId: number, awayTeamId: number, size: number) {
            return `https://midfield.mlbstatic.com/v1/teams-matchup/${awayTeamId}-${homeTeamId}/ar_1:1/w_${size}`;
        }
    
        export function getSportIcon(id: number, size: number) {
            return `https://midfield.mlbstatic.com/v1/sport/${id}/spots/${size}`;
        }
    
        export function getLeagueIcon(id: number, size: number) {
            return `https://midfield.mlbstatic.com/v1/league/${id}/spots/${size}`;
        }
    
        export function getTeamIcon(id: number, size: number) {
            return `https://midfield.mlbstatic.com/v1/team/${id}/spots/${size}`;
        }
    
        export function getPlayerIcon(id: number, size: number) {
            return `https://midfield.mlbstatic.com/v1/people/${id}/spots/${size}`;
        }
    }

    export namespace link {
        export function getMLBGameDayLink(gamePk: number) {
            return `https://www.mlb.com/gameday/${gamePk}/`;
        }
    }
}