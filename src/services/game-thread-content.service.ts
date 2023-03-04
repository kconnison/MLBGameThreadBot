import { bold, EmbedBuilder } from "@discordjs/builders";
import { APIEmbedField } from "discord.js";
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

            embed = this.addGameInfo(embed);

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

    private addGameInfo(embed: EmbedBuilder) {
        let fields: APIEmbedField[] = [];

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
        let media: any[] = this.gameInfo.getMedia();
        if( Object.keys(media).length > 0 ) {
            let homeTeamName = this.gameInfo.getHomeTeam().teamName;
            let awayTeamName = this.gameInfo.getAwayTeam().teamName;

            let tvListings = "None";
            let tvFeeds = ((media.find((med: any) => {
                return med.title == "MLBTV";
            }) || {})?.items || []);
            if( tvFeeds.length > 0 ) {
                tvListings = tvFeeds.map((feed: any) => {
                    let feedDesc = "";
                    let feedType = feed.mediaFeedType;
                    if( feedType == "HOME" ) {
                        feedDesc = bold(`${homeTeamName}:`);
                    } else if( feedType == "AWAY" ) {
                        feedDesc = bold(`${awayTeamName}:`);
                    } else if( feedType == "NATIONAL" ) {
                        feedDesc = bold("National:");
                    }
                    return `${feedDesc} ${feed.callLetters}`;        
                }).join("\n");
            }            

            let radioListings = "None";            
            let radioFeeds = ((media.find((med: any) => {
                return med.title == "Audio";
            }) || {})?.items || []);

            if( radioFeeds.length > 0 ) {
                radioListings = radioFeeds.map((feed: any) => {
                    let feedDesc = "";
                    let feedType = feed.type;
                    if( feedType == "HOME" ) {
                        feedDesc = bold(`${homeTeamName}:`);
                    } else if( feedType == "AWAY" ) {
                        feedDesc = bold(`${awayTeamName}:`);
                    } else if( feedType == "NATIONAL" ) {
                        feedDesc = bold("National:");
                    }
                    return `${feedDesc} ${feed.callLetters}`;        
                }).join("\n");
            }  

            fields.push({ name: "TV", value: tvListings, inline: true });
            fields.push({ name: "Radio", value: radioListings, inline: true });
        }

        // Add Game Info (Attendance/First Pitch/Length) if available
        let gameInfo = this.gameInfo.getGameInfo();
        if( Object.keys(gameInfo).length > 0 ) {
            let attendance = gameInfo.attendance;
            let firstPitch = date.format.HHMM(new Date(gameInfo.firstPitch));

            let duration = gameInfo.gameDurationMinutes;
            let gameLength = `${Math.floor(duration / 60)}:${ (duration % 60).toString().padStart(2,"0") }`

            let gameInfoValue = `${bold("Attendance:")} ${attendance}\n`
                + `${bold("First Pitch:")} ${firstPitch}\n`
                + `${bold("Length:")} ${gameLength}`
            fields.push({ name: "Game Info", value: gameInfoValue });
        }

        fields.push({ name: '\u200B', value: '\u200B' });
        return embed.addFields(fields);
    }
}