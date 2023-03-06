import { bold, codeBlock, EmbedBuilder } from "@discordjs/builders";
import { APIEmbedField } from "discord.js";
import { GameStatsTable, GameStatsTableColumn } from "../models/game-stats-table.model";
import { content } from "../utils/content.utils";
import { date } from "../utils/date.utils";
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
            let homeTeam = this.gameInfo.getHomeTeam().teamName;
            let awayTeam = this.gameInfo.getAwayTeam().teamName;
            title += `${awayTeam} @ ${homeTeam}`

            let gDateTime = this.gameInfo.getDateTime().dateTime;
            let gameDate = new Date(gDateTime || "");
            if( isNaN(gameDate.getTime()) ) {
                this.logger.warn("DateTime value from GameInfo is not a valid date:", gDateTime);

            } else {
                let wkday = gameDate.toLocaleDateString('en-US', { weekday: "short" });
                let month = gameDate.toLocaleDateString('en-US', { month: 'short' });
                let day = gameDate.getDate().toString().padStart(2,"0");
                let year = gameDate.getFullYear();

                let time = date.format.HHMM(gameDate);
                title += ` - ${wkday} ${day} ${month} ${year} @ ${time}`
            }

        } catch(e) {
            this.logger.error(e);
        }
        return title;
    }

    public getSummaryEmbedContent() {
        let embeds = [];
        try {
            let gamePk = this.gameInfo.gamePk;
            let homeTeamId = this.gameInfo.getHomeTeam().id || 0;
            let awayTeamId = this.gameInfo.getAwayTeam().id || 0;

            let embed = new EmbedBuilder()
                .setAuthor({ name: "Major League Baseball", iconURL: content.icon.getSportIcon(1, 100), url: "https://www.mlb.com/" })
                .setTitle(this.getSummaryTitle())
                .setURL(content.link.getMLBGameDayLink(gamePk))
                .setThumbnail(content.icon.getMatchupIcon(homeTeamId, awayTeamId, 100))
                .setDescription(this.getSummaryDescription())

            let fields: APIEmbedField[] = [];
            this.addGameInfo(fields);

            // If game in Preview state, add probable pitchers
            if( true ) {//this.gameInfo.isGameStatusPreview() ) {
                this.addProbablePitchers(fields);
            }

            embed = embed.addFields(fields)
            embeds.push(embed);

        } catch(e) {
            this.logger.error(e);
        }
        return embeds;
    }

    private getSummaryTitle() {
        let homeTeam = this.gameInfo.getHomeTeam();
        let homeNameRecord = `${homeTeam?.name} (${homeTeam?.record?.wins}-${homeTeam?.record?.losses})`;
        
        let awayTeam = this.gameInfo.getAwayTeam();
        let awayNameRecord = `${awayTeam?.name} (${awayTeam?.record?.wins}-${awayTeam?.record?.losses})`;

        return `${awayNameRecord} @ ${homeNameRecord}`;
    }

    private getSummaryDescription() {
        let description = `${bold("Game Status:")} ${this.gameInfo.getGameStatus().detailedState}`;    

        // If game not in preview state, include score in description
        if( !this.gameInfo.isGameStatusPreview() ) {
            let linescore = this.gameInfo.getLinescore();

            // If game is live, include current inning
            if( this.gameInfo.isGameStatusLive() ) {      
                let inningState = (linescore as any).inningState;
                let inningOrdinal = (linescore as any).currentInningOrdinal;
                description += ` (${inningState} ${inningOrdinal})`
            }

            let homeScore = (linescore.teams?.home as any)?.runs;
            let homeTeamName = this.gameInfo.getHomeTeam().teamName;

            let awayScore = (linescore.teams?.away as any)?.runs;
            let awayTeamName = this.gameInfo.getAwayTeam().teamName;

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

            description += ` | ${bold("Score:")} ${maxScore}-${minScore} ${teamName}`
        }

        return description;
    }

    private addGameInfo(fields: APIEmbedField[]) {
        // Add Venue Info
        fields.push({ name: "Venue", value: this.gameInfo.getVenue().name || "" });

        // Add Weather Info
        let weather = this.gameInfo.getWeather();
        if( Object.keys(weather).length > 0 ) {
            let temp = this.gameInfo.getWeather().temp;
            let condition = this.gameInfo.getWeather().condition;
            let wind = this.gameInfo.getWeather().wind;
            fields.push({ name: "Weather", value: `${temp}\u00B0 F, ${condition}`, inline: true });
            fields.push({ name: "Wind", value: wind, inline: true });
        }

        // Add TV/Radio Info
        this.addBroadcastInfo(fields);

        // Add Game Info (Attendance/First Pitch/Length) if available
        let gameInfo = this.gameInfo.getGameInfo();
        if( Object.keys(gameInfo).length > 0 ) {
            let attendance = gameInfo.attendance;
            let firstPitch = date.format.HHMM(new Date(gameInfo.firstPitch));

            let duration = gameInfo.gameDurationMinutes;
            let gameLength = (duration? `${Math.floor(duration / 60)}:${ (duration % 60).toString().padStart(2,"0") }` : "");

            let gameInfoValue = (attendance? `${bold("Attendance:")} ${attendance}\n` : "")
                + `${bold("First Pitch:")} ${firstPitch}\n`
                + (gameLength? `${bold("Length:")} ${gameLength}`: "")
            fields.push({ name: "Game Info", value: gameInfoValue });
        }

        fields.push({ name: '\u200B', value: '\u200B' });
    }

    private addBroadcastInfo(fields: APIEmbedField[]) {
        let homeTeamName = this.gameInfo.getHomeTeam().teamName;
        let awayTeamName = this.gameInfo.getAwayTeam().teamName;
        let broadcasts = this.gameInfo.getBroadcasts();

        // Get TV feeds
        let tvBroadcasts = broadcasts.tv;
        let tvFeeds = [];
        if( tvBroadcasts.national.length > 0 ) {
            tvFeeds.push(`${bold("National:")} ${tvBroadcasts.national.join(", ")}`);
        }
        if( tvBroadcasts.away.length > 0 ) {
            tvFeeds.push(`${bold(`${awayTeamName}:`)} ${tvBroadcasts.away.join(", ")}`);
        }  
        if( tvBroadcasts.home.length > 0 ) {
            tvFeeds.push(`${bold(`${homeTeamName}:`)} ${tvBroadcasts.home.join(", ")}`);
        }    
        if( tvFeeds.length == 0 ) tvFeeds.push("None");

        // Get Radio feeds
        let radioBroadcasts = broadcasts.radio;
        let radioFeeds = [];
        if( radioBroadcasts.national.length > 0 ) {
            radioFeeds.push(`${bold("National:")} ${radioBroadcasts.national.join(", ")}`);
        }
        if( radioBroadcasts.away.length > 0 ) {
            radioFeeds.push(`${bold(`${awayTeamName}:`)} ${radioBroadcasts.away.join(", ")}`);
        }  
        if( radioBroadcasts.home.length > 0 ) {
            radioFeeds.push(`${bold(`${homeTeamName}:`)} ${radioBroadcasts.home.join(", ")}`);
        }
        if( radioFeeds.length == 0 ) radioFeeds.push("None");
        
        fields.push({ name: "TV", value: tvFeeds.join("\n"), inline: true });
        fields.push({ name: "Radio", value: radioFeeds.join("\n"), inline: true }); 
    }

    private addProbablePitchers(fields: APIEmbedField[]) {
        let probablePitchers = this.gameInfo.getProbablePitchers();

        let homeTeamName = this.gameInfo.getHomeTeam().teamName || "";
        let homePitcher = probablePitchers.home;

        let homePitcherName = homePitcher?.getProfile()?.fullName || "";
        let homePitcherSeasonStats = homePitcher?.getSeasonStats()?.pitching || {};
        let homePitcherRecord = `${homePitcherSeasonStats.wins}-${homePitcherSeasonStats.losses}`;
        let homePitcherERA = homePitcherSeasonStats.era;
        let homePitcherIP = homePitcherSeasonStats.inningsPitched;


        let awayTeamName = this.gameInfo.getAwayTeam().teamName || "";
        let awayPitcher = probablePitchers.away;
        
        let awayPitcherName = awayPitcher?.getProfile()?.fullName || "";
        let awayPitcherSeasonStats = awayPitcher?.getSeasonStats()?.pitching || {};
        let awayPitcherRecord = `${awayPitcherSeasonStats.wins}-${awayPitcherSeasonStats.losses}`;
        let awayPitcherERA = awayPitcherSeasonStats.era;
        let awayPitcherIP = awayPitcherSeasonStats.inningsPitched;
        
        // Set width of Team Name column
        const teamColWidthBuffer = 5;
        let teamColWidth = homeTeamName.length + teamColWidthBuffer;
        if( homeTeamName.length < awayTeamName.length ) {
            teamColWidth = awayTeamName.length + teamColWidthBuffer;
        }

        // Set width of Pitcher Name column
        const nameColWidthBuffer = 5;
        let nameColWidth = homePitcherName.length + nameColWidthBuffer;
        if( homePitcherName.length < awayPitcherName.length ) {
            nameColWidth = awayPitcherName.length + nameColWidthBuffer;
        }

        let columns: GameStatsTableColumn[] = [
            { label: "Team", width: teamColWidth },
            { label: "Pitcher", width: nameColWidth },
            { label: "Record", width: 8, align: "right" },
            { label: "ERA", width: 6, align: "right" },
            { label: "IP", width: 7, align: "right" }
        ];
        let table = new GameStatsTable()
            .setColumns(columns)
            .setRows([
                [awayTeamName, awayPitcherName, awayPitcherRecord, awayPitcherERA, awayPitcherIP],
                [homeTeamName, homePitcherName, homePitcherRecord, homePitcherERA, homePitcherIP]
            ]);

        fields.push({ name: "Probable Pitchers", value: codeBlock(table.toString()) })
    }
}