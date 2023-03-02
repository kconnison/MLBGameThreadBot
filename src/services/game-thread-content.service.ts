import { bold, EmbedBuilder } from "@discordjs/builders";
import { GameRestObject } from "mlb-stats-typescript-api/output/src";
import { LoggerService } from "./logger.service";

export class GameThreadContentService {
    private logger: LoggerService;
    constructor() {
        this.logger = new LoggerService(GameThreadContentService.name);
    }

    public getThreadTitle(gameInfo: GameRestObject) {
        let title = "";
        try {
            let homeTeam = gameInfo.gameData?.teams?.home?.teamName;
            let awayTeam = gameInfo.gameData?.teams?.away?.teamName;
            title += `${awayTeam} @ ${homeTeam}`

            let gDateTime = gameInfo.gameData?.datetime?.dateTime;
            let gameDate = new Date(gDateTime || "");
            if( isNaN(gameDate.getTime()) ) {
                this.logger.warn("DateTime value from GameInfo is not a valid date:", gDateTime);

            } else {
                let wkday = gameDate.toLocaleDateString('en-US', { weekday: "short" });
                let month = gameDate.toLocaleDateString('en-US', { month: 'short' });
                let day = gameDate.getDate().toString().padStart(2,"0");
                let year = gameDate.getFullYear();

                let time = gameDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZoneName: 'short' }).replace(/\s+(?=(AM|PM))/, "");
                title += ` - ${wkday} ${day} ${month} ${year} @ ${time}`
            }

        } catch(e) {
            this.logger.error(e);
        }
        return title;
    }

    public getSummaryEmbedContent(gameInfo: GameRestObject) {
        let embed = null;
        try {
            embed = new EmbedBuilder()
                .setAuthor({ name: "Major League Baseball", iconURL: this.getSportIcon(1, 100) })
                .setTitle(this.getSummaryTitle(gameInfo))
                .setURL(this.getMLBGameDayLink(gameInfo.gamePk || 0))
                .setThumbnail(this.getMatchupIcon(gameInfo, 100))
                .setDescription(this.getSummaryDescription(gameInfo))

        } catch(e) {
            this.logger.error(e);
        }
        return embed;
    }

    private getSummaryTitle(gameInfo: GameRestObject) {
        let homeTeam = gameInfo.gameData?.teams?.home;
        let homeNameRecord = `${homeTeam?.name} (${homeTeam?.record?.wins}-${homeTeam?.record?.losses})`;
        
        let awayTeam = gameInfo.gameData?.teams?.away;
        let awayNameRecord = `${awayTeam?.name} (${awayTeam?.record?.wins}-${awayTeam?.record?.losses})`;

        return `${awayNameRecord} @ ${homeNameRecord}`;
    }

    private getSummaryDescription(gameInfo: GameRestObject) {
        let gameStatusCode = gameInfo.gameData?.status?.statusCode;
        let gameStatus = `${bold("Game Status:")} ${gameInfo.gameData?.status?.detailedState}`;
        
        // If game not in preview state, include score in description
        if( gameStatusCode != "P" ) {
            let homeScore = (gameInfo.liveData?.linescore?.teams?.home as any)?.runs;
            let homeTeamName = gameInfo.gameData?.teams?.home?.teamName;

            let awayScore = (gameInfo.liveData?.linescore?.teams?.away as any)?.runs;
            let awayTeamName = gameInfo.gameData?.teams?.away?.teamName;

            let minScore, maxScore, teamName;
            if(homeScore == awayScore) {
                minScore = homeScore;
                maxScore = awayScore;
                teamName = "";

            } else if( homeScore > awayScore ) {
                minScore = homeScore;
                maxScore = awayScore;
                teamName = homeTeamName;

            } else {
                minScore = awayScore;
                maxScore = homeScore;
                teamName = awayTeamName;
            }

            gameStatus += ` - ${bold("Score:")} ${maxScore}-${minScore} ${teamName}`
        }

        return gameStatus;
    }

    public getMatchupIcon(gameInfo: GameRestObject, size: number) {
        let homeTeamId = gameInfo.gameData?.teams?.home?.id;
        let awayTeamId = gameInfo.gameData?.teams?.away?.id;

        return `https://midfield.mlbstatic.com/v1/teams-matchup/${awayTeamId}-${homeTeamId}/ar_1:1/w_${size}`;
    }

    public getSportIcon(id: number, size: number) {
        return `https://midfield.mlbstatic.com/v1/sport/${id}/spots/${size}`;
    }

    public getLeagueIcon(id: number, size: number) {
        return `https://midfield.mlbstatic.com/v1/league/${id}/spots/${size}`;
    }

    public getTeamIcon(id: number, size: number) {
        return `https://midfield.mlbstatic.com/v1/team/${id}/spots/${size}`;
    }

    public getPlayerIcon(id: number, size: number) {
        return `https://midfield.mlbstatic.com/v1/people/${id}/spots/${size}`;
    }

    public getMLBGameDayLink(gamePk: number) {
        return `https://www.mlb.com/gameday/${gamePk}/`;
    }
}