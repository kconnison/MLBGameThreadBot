import { bold, codeBlock, EmbedBuilder } from "@discordjs/builders";
import { APIEmbedField } from "discord.js";
import { content } from "../utils/content.utils";
import { date } from "../utils/date.utils";
import { GameBroadcastFeeds, GameInfoService } from "./game-info.service";
import { GameThreadStatsService } from "./game-thread-stats.service";
import { LoggerService } from "./logger.service";

export class GameThreadContentService {
    private logger: LoggerService;
    private stats: GameThreadStatsService;

    constructor(private gameInfo: GameInfoService) {
        this.logger = new LoggerService(GameThreadContentService.name);

        this.stats = new GameThreadStatsService(gameInfo);
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

                let time = date.format.toHHMM(gameDate);
                title += ` - ${wkday} ${day} ${month} ${year} @ ${time}`
            }

        } catch(e) {
            this.logger.error(e);
        }
        return title;
    }

    public getEmbeds() {
        let embeds = [];
        try {
            let gamePk = this.gameInfo.gamePk;
            let homeTeam = this.gameInfo.getHomeTeam();
            let homeTeamId = homeTeam.id || 0;
            let awayTeam = this.gameInfo.getAwayTeam();
            let awayTeamId = awayTeam.id || 0;

            const getBaseEmbed = () => {
                return new EmbedBuilder().setColor(0x72767D);
            };

            let summaryFields: APIEmbedField[] = [];
            this.addGameInfo(summaryFields);

            let summaryEmbed = getBaseEmbed()
                .setAuthor({ name: "Major League Baseball", iconURL: content.icon.getSportIcon(1, 100), url: "https://www.mlb.com/" })
                .setTitle(this.getSummaryEmbedTitle())
                .setURL(content.link.getMLBGameDayLink(gamePk))
                .setThumbnail(content.icon.getMatchupIcon(homeTeamId, awayTeamId, 100))
                .setDescription(this.getSummaryEmbedDescription())
                .addFields(summaryFields);
            embeds.push(summaryEmbed);

            this.logger.debug(`GamePK: ${gamePk}; Game State: ${this.gameInfo.getGameStatus().abstractGameState}`);

            // If game in Preview state, show probable pitchers 
            // & starting lineup w/ stats against probable pitcher
            if( this.gameInfo.isGameStatePreview() ) {        
                let lineupFields: APIEmbedField[] = [];                
                this.addStartingLineup(lineupFields);

                let pitcherEmbed = getBaseEmbed()
                    .setTitle("Probable Pitchers (Season Stats)")
                    .setDescription(this.stats.buildProbablePitchersSummary());
                let lineupEmbed = getBaseEmbed()
                    .setTitle("Starting Lineups vs Probable Pitchers")
                    .addFields(lineupFields);

                embeds.push(pitcherEmbed, lineupEmbed);

            // Game is Live/Final, show in-game stats table
            // & other in-game information
            } else {
                let awayBoxscoreFields: APIEmbedField[] = [];
                let homeBoxscoreFields: APIEmbedField[] = [];
                let pitchingFields: APIEmbedField[] = [];
                let scoreHighlightFields: APIEmbedField[] = [];

                let battingSummary = this.stats.buildLiveBattingStatsSummary();
                this.addTeamBoxscoreInfo(homeBoxscoreFields, awayBoxscoreFields);
                this.addLivePitchingStats(pitchingFields);                

                this.addScoringPlays(scoreHighlightFields);
                this.addHighlights(scoreHighlightFields);

                let scoreSummary = this.stats.buildScoreboardSummary();
                let scoreboardEmbed = getBaseEmbed().setDescription(scoreSummary);

                let awayBattingEmbed = getBaseEmbed()
                    .setTitle(awayTeam.teamName || "")
                    .setDescription(battingSummary.away)
                    .addFields(awayBoxscoreFields);
                let homeBattingEmbed = getBaseEmbed()
                    .setTitle(homeTeam.teamName || "")
                    .setDescription(battingSummary.home)
                    .addFields(homeBoxscoreFields);

                let pitchingEmbed = getBaseEmbed().setTitle("Pitching").addFields(pitchingFields);
                let boxscoreInfoEmbed = getBaseEmbed().setTitle("Game Info").setDescription(this.getGameBoxscoreInfo());
                let scoreHighlightsEmbed = getBaseEmbed().addFields(scoreHighlightFields);

                embeds.push(scoreboardEmbed, awayBattingEmbed, homeBattingEmbed, pitchingEmbed, boxscoreInfoEmbed, scoreHighlightsEmbed);
            }

        } catch(e) {
            this.logger.error(e);
        }
        return embeds;
    }

    private getSummaryEmbedTitle() {
        let homeTeam = this.gameInfo.getHomeTeam();
        let homeNameRecord = `${homeTeam?.name} (${homeTeam?.record?.wins}-${homeTeam?.record?.losses})`;
        
        let awayTeam = this.gameInfo.getAwayTeam();
        let awayNameRecord = `${awayTeam?.name} (${awayTeam?.record?.wins}-${awayTeam?.record?.losses})`;

        return `${awayNameRecord} @ ${homeNameRecord}`;
    }

    private getSummaryEmbedDescription() {
        let description = `${bold("Game Status:")} ${this.gameInfo.getGameStatus().detailedState}`;    

        // If game not in preview state, include score in description
        if( !this.gameInfo.isGameStatePreview() ) {
            let linescore = this.gameInfo.getLinescore();

            // If game is live, include current inning
            if( this.gameInfo.isGameStateLive() ) {      
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

        fields.push({ name: '\u200B', value: '\u200B' });

        // Add TV/Radio Info
        this.addBroadcastInfo(fields);

        // Add Game Info (Attendance/First Pitch/Length) if available
        let gameInfo = this.gameInfo.getGameInfo();
        if( Object.keys(gameInfo).length > 0 ) {
            let attendance = gameInfo.attendance;
            let firstPitch = date.format.toHHMM(new Date(gameInfo.firstPitch));

            let duration = gameInfo.gameDurationMinutes;
            let gameLength = (duration? `${Math.floor(duration / 60)}:${ (duration % 60).toString().padStart(2,"0") }` : "");

            let gameInfoValue = (attendance? `${bold("Attendance:")} ${attendance}\n` : "")
                + `${bold("First Pitch:")} ${firstPitch}\n`
                + (gameLength? `${bold("Length:")} ${gameLength}`: "")
            fields.push({ name: "Game Info", value: gameInfoValue });
        }        
    }

    private addBroadcastInfo(fields: APIEmbedField[]) {
        let homeTeamName = this.gameInfo.getHomeTeam().teamName;
        let awayTeamName = this.gameInfo.getAwayTeam().teamName;
        let broadcasts = this.gameInfo.getBroadcasts();

        const formatBroadcastFeeds = (broadcastFeeds: GameBroadcastFeeds) => {
            let feeds = [];
            if( broadcastFeeds.national.length > 0 ) {
                feeds.push(`${bold("National:")} ${broadcastFeeds.national.join(", ")}`);
            }
            if( broadcastFeeds.away.length > 0 ) {
                feeds.push(`${bold(`${awayTeamName}:`)} ${broadcastFeeds.away.join(", ")}`);
            }  
            if( broadcastFeeds.home.length > 0 ) {
                feeds.push(`${bold(`${homeTeamName}:`)} ${broadcastFeeds.home.join(", ")}`);
            }    
            if( feeds.length == 0 ) feeds.push("None");

            return feeds.join("\n");
        };
        
        fields.push({ name: "TV", value: formatBroadcastFeeds(broadcasts.tv), inline: true });
        fields.push({ name: "Radio", value: formatBroadcastFeeds(broadcasts.radio), inline: true }); 
    }

    private addProbablePitchers(fields: APIEmbedField[]) {
        let probablePitchersSummary = this.stats.buildProbablePitchersSummary();
        fields.push({ name: "Probable Pitchers (Season Stats)", value: probablePitchersSummary });
    }

    /**
     * Adds code block table with probable pitcher stats
     * 
     * **NOTE:** Code blocks don't display well on mobile,
     * but leaving this here in case Discord ever has better support for tables
     * @param fields 
     */
    private addProbablePitchersTable(fields: APIEmbedField[]) {
        let table = this.stats.buildProbablePitchersTable();
        fields.push({ name: "Probable Pitchers (Season Stats)", value: codeBlock(table.toString()) })
    }

    private addStartingLineup(fields: APIEmbedField[]) {
        let homeTeamName = this.gameInfo.getHomeTeam().teamName || "";
        let awayTeamName = this.gameInfo.getAwayTeam().teamName || "";

        let probablePitchers = this.gameInfo.getProbablePitchers();

        let lineups = this.stats.buildStartingLineupSummary();

        fields.push({ name: `${awayTeamName} Lineup vs ${probablePitchers.home?.getProfile().boxscoreName || ""}`, value: lineups.away });
        this.addSpacer(fields);
        fields.push({ name: `${homeTeamName} Lineup vs ${probablePitchers.away?.getProfile().boxscoreName || ""}`, value: lineups.home });        
    }

    /**
     * Adds code block table with starting lineups vs probable pitchers stats
     * 
     * **NOTE:** Code blocks don't display well on mobile,
     * but leaving this here in case Discord ever has better support for tables     
     * @param fields 
     */
    private addStartingLineupTable(fields: APIEmbedField[]) {
        let homeTeamName = this.gameInfo.getHomeTeam().teamName || "";
        let awayTeamName = this.gameInfo.getAwayTeam().teamName || "";

        let probablePitchers = this.gameInfo.getProbablePitchers();

        let tables = this.stats.buildStartingLineupTables();

        fields.push({ name: `${awayTeamName} Lineup vs ${probablePitchers.home?.getProfile().boxscoreName || "TBD"}`, value: codeBlock(tables.away.toString()) });
        fields.push({ name: `${homeTeamName} Lineup vs ${probablePitchers.away?.getProfile().boxscoreName || "TBD"}`, value: codeBlock(tables.home.toString()) });
    }

    private addScoreboard(fields: APIEmbedField[]) {
        let summary = this.stats.buildScoreboardSummary();

        fields.push({ name: "Score", value: summary });
    }

    private addTeamBoxscoreInfo(homeFields: APIEmbedField[], awayFields: APIEmbedField[]) {
        let boxscoreInfoSummary = this.stats.buildTeamBoxscoreInfoSummary();

        boxscoreInfoSummary.away.forEach((summary) => {
            awayFields.push({ name: summary.title, value: summary.body });
        });
        
        boxscoreInfoSummary.home.forEach((summary) => {
            homeFields.push({ name: summary.title, value: summary.body });
        });   
    }

    /**
     * Adds code block table with live batting stats
     * 
     * **NOTE:** Code blocks don't display well on mobile,
     * but leaving this here in case Discord ever has better support for tables       
     * @param fields 
     */
    private addLiveBattingStatsTable(fields: APIEmbedField[]) {
        let homeTeamName = this.gameInfo.getHomeTeam().teamName || "";
        let awayTeamName = this.gameInfo.getAwayTeam().teamName || "";

        let tables = this.stats.buildLiveBattingStatsTables();

        fields.push({ name: `${awayTeamName} Batters`, value: codeBlock(tables.away.toString()) });
        fields.push({ name: `${homeTeamName} Batters`, value: codeBlock(tables.home.toString()) });
    }

    private addLivePitchingStats(fields: APIEmbedField[]) {
        let homeTeamName = this.gameInfo.getHomeTeam().teamName || "";
        let awayTeamName = this.gameInfo.getAwayTeam().teamName || "";

        let pitchingSummary = this.stats.buildLivePitchingStatsSummary();

        fields.push({ name: `${awayTeamName} Pitchers`, value: pitchingSummary.away });
        fields.push({ name: `${homeTeamName} Pitchers`, value: pitchingSummary.home });             
    }

    /**
     * Adds code block table with live pitching stats
     * 
     * **NOTE:** Code blocks don't display well on mobile,
     * but leaving this here in case Discord ever has better support for tables       
     * @param fields 
     */
    private addLivePitchingStatsTable(fields: APIEmbedField[]) {
        let homeTeamName = this.gameInfo.getHomeTeam().teamName || "";
        let awayTeamName = this.gameInfo.getAwayTeam().teamName || "";

        let tables = this.stats.buildLivePitchingStatsTables();

        fields.push({ name: `${awayTeamName} Pitchers`, value: codeBlock(tables.away.toString()) });
        fields.push({ name: `${homeTeamName} Pitchers`, value: codeBlock(tables.home.toString()) });
    }

    private getGameBoxscoreInfo() {
        // Filter out items from boxscore info that are already included elsewhere
        return (this.gameInfo.getBoxscore()?.info || []).filter(info => {
            let hasValue = info.value != undefined;            
            return hasValue && !["Weather", "Wind", "First pitch", "T", "Att", "Venue"].includes(info.label || "");
        }).map(info => {
            return `${bold(info.label || "")}: ${info.value}`;
        }).join("\n");
    }

    private addScoringPlays(fields: APIEmbedField[]) {
        fields.push({ name: "Scoring Plays", value: "< COMING SOON >" });
    }

    private addHighlights(fields: APIEmbedField[]) {
        fields.push({ name: "Highlights", value: "< COMING SOON >" });
    }

    private addSpacer(fields: APIEmbedField[]) {
        fields.push({ name: '\u200B', value: '\u200B' });
    }
}