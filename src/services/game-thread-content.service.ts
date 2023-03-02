import { bold, EmbedBuilder } from "@discordjs/builders";
import { GameInfoService } from "./game-info.service";
import { LoggerService } from "./logger.service";

export class GameThreadContentService {
    private logger: LoggerService;

    constructor(private gameInfo: GameInfoService) {
        this.logger = new LoggerService(GameThreadContentService.name);
    }

    public getThreadTitle() {
        let title = "";
        try {
            let homeTeam = this.gameInfo.homeTeam.teamName;
            let awayTeam = this.gameInfo.awayTeam.teamName;
            title += `${awayTeam} @ ${homeTeam}`

            let gDateTime = this.gameInfo.datetime.dateTime;
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

    public getSummaryEmbedContent() {
        let embed = null;
        try {
            embed = new EmbedBuilder()
                .setAuthor({ name: "Major League Baseball", iconURL: this.getSportIcon(1, 100), url: "https://www.mlb.com/" })
                .setTitle(this.getSummaryTitle())
                .setURL(this.getMLBGameDayLink())
                .setThumbnail(this.getMatchupIcon(100))
                .setDescription(this.getSummaryDescription())

        } catch(e) {
            this.logger.error(e);
        }
        return embed;
    }

    private getSummaryTitle() {
        let homeTeam = this.gameInfo.homeTeam;
        let homeNameRecord = `${homeTeam?.name} (${homeTeam?.record?.wins}-${homeTeam?.record?.losses})`;
        
        let awayTeam = this.gameInfo.awayTeam;
        let awayNameRecord = `${awayTeam?.name} (${awayTeam?.record?.wins}-${awayTeam?.record?.losses})`;

        return `${awayNameRecord} @ ${homeNameRecord}`;
    }

    private getSummaryDescription() {
        let gameAbstractState = this.gameInfo.gameStatus.abstractGameState;
        let gameDetailedState = `${bold("Game Status:")} ${this.gameInfo.gameStatus.detailedState}`;    

        // If game not in preview state, include score in description
        if( gameAbstractState != "Preview" ) {
            let homeScore = (this.gameInfo.linescore.teams?.home as any)?.runs;
            let homeTeamName = this.gameInfo.homeTeam.teamName;

            let awayScore = (this.gameInfo.linescore.teams?.away as any)?.runs;
            let awayTeamName = this.gameInfo.awayTeam.teamName;

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

            gameDetailedState += ` - ${bold("Score:")} ${maxScore}-${minScore} ${teamName}`
        }

        return gameDetailedState;
    }

    public getMatchupIcon(size: number) {
        let homeTeamId = this.gameInfo.homeTeam.id;
        let awayTeamId = this.gameInfo.awayTeam.id;

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

    public getMLBGameDayLink() {
        let gamePk = this.gameInfo.gamePk;
        return `https://www.mlb.com/gameday/${gamePk}/`;
    }
}