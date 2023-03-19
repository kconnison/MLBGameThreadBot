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

        export function getPlayerProfileLink(playerId: number) {
            return `https://www.mlb.com/player/${playerId}`;
        }

        export function getHighlightVideoLink(slug: string) {
            return `https://www.mlb.com/video/${slug}`;
        }
    }

    export namespace colors {
        export function getTeamColor(id: number) {     
            if( !TEAM_COLORS_MAP.has(id) ) id = 0;
            return TEAM_COLORS_MAP.get(id) || 0xD3D3D3;
        }
    }
}

const TEAM_COLORS_MAP = new Map([
    [0, 0xD3D3D3], // Default
    [108, 0xBA0021], // LAA
    [109, 0xA71930], // AZ
    [110, 0xDF4601], // BAL
    [111, 0xBD3039], // BOS
    [112, 0x0E3386], // CHC
    [113, 0xC6011F], // CIN
    [114, 0x002B5C], // CLE
    [115, 0x33006F], // COL
    [116, 0x0C2C56], // DET
    [117, 0x002D62], // HOU
    [118, 0x004687], // KC
    [119, 0x005A9C], // LAD
    [120, 0xAB0003], // WSH
    [121, 0x002D72], // NYM    
    [133, 0x003831], // OAK
    [134, 0xFDB827], // PIT
    [135, 0x2F241D], // SD
    [136, 0x005C5C], // SEA
    [137, 0xFD5B1E], // SF
    [138, 0xC41E3A], // STL
    [139, 0x092C5C], // TB
    [140, 0x003278], // TEX
    [141, 0x134A8E], // TOR
    [142, 0x091F40], // MIN
    [143, 0xE81828], // PHI
    [144, 0x13274F], // ATL
    [145, 0xFFFFFF], // CWS
    [146, 0x00A3E0], // MIA
    [147, 0x132448], // NYY
    [158, 0x12284B]  // MIL
])