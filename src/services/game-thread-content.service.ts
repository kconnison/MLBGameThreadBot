import { bold, EmbedBuilder, hyperlink } from "@discordjs/builders";
import { APIEmbedField, time } from "discord.js";
import { GameBroadcastFeeds } from "../models/api/game-broadcast.model";
import { content } from "../utils/content.utils";
import { date } from "../utils/date.utils";
import { GameInfoService } from "./game-info.service";
import { GameThreadStatsService } from "./game-thread-stats.service";
import { LoggerService } from "./logger.service";

export class GameThreadContentService {
    private logger: LoggerService;
    private stats: GameThreadStatsService;

    private lastLoggedAB: number = -1;

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

    public getGameInfoEmbeds() {
        let embeds: EmbedBuilder[] = [];
        try {
            let gamePk = this.gameInfo.gamePk;
            let homeTeam = this.gameInfo.getHomeTeam();
            let homeTeamId = homeTeam.id || 0;
            let awayTeam = this.gameInfo.getAwayTeam();
            let awayTeamId = awayTeam.id || 0;

            const getBaseEmbed = () => {
                let baseColor = content.colors.getTeamColor(0);
                return new EmbedBuilder().setColor(baseColor);
            };

            let summaryFields: APIEmbedField[] = [];
            this.addGameInfo(summaryFields);

            let summaryEmbed = getBaseEmbed()
                .setAuthor({ name: "Major League Baseball", iconURL: content.icon.getSportIcon(1, 100), url: "https://www.mlb.com/" })
                .setTitle(this.getSummaryEmbedTitle())
                .setURL(content.link.getMLBGameDayLink(gamePk))
                .setThumbnail(content.icon.getMatchupIcon(homeTeamId, awayTeamId, 100))
                .setDescription(this.getSummaryEmbedDescription())
                .addFields(summaryFields)
                .addFields({ name: "Last Updated:", value: time() })
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
                

                let battingSummary = this.stats.buildLiveBattingStatsSummary();
                this.addTeamBoxscoreInfo(homeBoxscoreFields, awayBoxscoreFields);
                this.addLivePitchingStats(pitchingFields);                

                let scoreSummary = this.stats.buildScoreboardSummary();
                let scoreboardEmbed = getBaseEmbed().setDescription(scoreSummary);

                let awayBattingEmbed = getBaseEmbed()
                    .setAuthor({ name: awayTeam.name || "", iconURL: content.icon.getTeamIcon(awayTeamId, 100) })
                    .setDescription(battingSummary.away)
                    .setColor(content.colors.getTeamColor(awayTeamId))
                    .addFields(awayBoxscoreFields);
                let homeBattingEmbed = getBaseEmbed()
                    .setAuthor({ name: homeTeam.name || "", iconURL: content.icon.getTeamIcon(homeTeamId, 100) })
                    .setDescription(battingSummary.home)
                    .setColor(content.colors.getTeamColor(homeTeamId))
                    .addFields(homeBoxscoreFields);

                let pitchingEmbed = getBaseEmbed().setTitle("Pitching").addFields(pitchingFields);
                let boxscoreInfoEmbed = getBaseEmbed().setTitle("Game Info").setDescription(this.getGameBoxscoreInfo());
                embeds.push(scoreboardEmbed, awayBattingEmbed, homeBattingEmbed, pitchingEmbed, boxscoreInfoEmbed);

                // Add highlights (if they exist)   
                let highlights = this.getHighlights();
                if( highlights.length > 0 ) {
                    let highlightsEmbed = getBaseEmbed().setTitle("Highlights").setDescription(highlights);
                    embeds.push(highlightsEmbed);  
                }
            }

        } catch(e) {
            this.logger.error(e);
        }
        return embeds;
    }

    public getPlayByPlayMessages() {
        let messages: PlayByPlayMessage[] = [];
        try {
            const createEmbed = (playerId: number, description: string) => {
                let playerInfo = this.gameInfo.getPlayerInfo(playerId);
                let teamId = playerInfo?.getBoxscore().parentTeamId || 0;
                return new EmbedBuilder()
                    .setColor(content.colors.getTeamColor(teamId))
                    .setAuthor({ 
                        name: playerInfo?.getProfile().fullName || "", 
                        iconURL: content.icon.getPlayerIcon(playerId, 100), 
                        url: content.link.getPlayerProfileLink(playerId)
                    })
                    .setDescription(description);
            };

            let plays = this.gameInfo.getAllPlays().filter((p) => { return p.atBatIndex && p.atBatIndex > this.lastLoggedAB; });
            plays.forEach((play) => {
                // Only log the play if it is complete
                if( play?.about?.isComplete ) {
                    let playEmbeds = [];
                
                    // First check playEvents for substitutions, stolen bases, caught stealing, etc.
                    (play.playEvents || []).forEach((event: any) => {
                        if(event?.details && event?.details?.eventType) {
                            let eventType: string = event.details.eventType;
                            if ( eventType.includes("_substitution") || eventType.includes("stolen_base") || eventType.includes("caught_stealing") ) {
                                let playDescription = event.details.description.replace(/(.*:\s)/, (match: any) => bold(match));
                                playEmbeds.push(createEmbed(event.player.id, playDescription));
                            }
                        }
                    });
    
                    // Then create embed for the actual play itself
                    let halfInning = play.about.halfInning || "";          
                    let inningDescription = `${halfInning.charAt(0).toUpperCase() + halfInning.slice(1)}  ${this.getInningOrdinal(play.about?.inning || 0)},`
                        + ` ${play.count?.outs} Out(s)`;
                    let playDescription = `${inningDescription}\n\n${bold(play.result?.event+":")} ${play.result?.description}`;
                    if( play.about.isScoringPlay ) {
                        let homeAbbrev = this.gameInfo.getHomeTeam().abbreviation;
                        let homeScore = play.result?.homeScore || 0;                        
                        let awayAbbrev = this.gameInfo.getAwayTeam().abbreviation;
                        let awayScore = play.result?.awayScore || 0;

                        let scoreDescription = (homeScore > awayScore? `${homeScore}-${awayScore} ${homeAbbrev}` : 
                        (homeScore < awayScore? `${awayScore}-${homeScore} ${awayAbbrev}` : `${homeScore}-${awayScore}`));

                        playDescription += `\n\n${scoreDescription}`;
                    }

                    playEmbeds.push(createEmbed(play.matchup?.batter?.id || 0, playDescription));
                    messages.push({ isScoringPlay: (play.about.isScoringPlay || false), embeds: playEmbeds });
                    this.lastLoggedAB = play.atBatIndex || 0;
                }
            });

        } catch(e) {
            this.logger.error(e);
        }
        return messages;
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
                let inningState = linescore.inningState;
                let inningOrdinal = linescore.currentInningOrdinal;
                description += ` (${inningState} ${inningOrdinal})`
            }

            let homeScore = linescore.teams?.home?.runs || 0;
            let homeTeamName = this.gameInfo.getHomeTeam().teamName;

            let awayScore = linescore.teams?.away?.runs || 0;
            let awayTeamName = this.gameInfo.getAwayTeam().teamName;

            let scoreDescription = (homeScore > awayScore? `${homeScore}-${awayScore} ${homeTeamName}` : 
                (homeScore < awayScore? `${awayScore}-${homeScore} ${awayTeamName}` : `${homeScore}-${awayScore}`));
            description += ` | ${bold("Score:")} ${scoreDescription}`;
        }

        return description;
    }

    private addGameInfo(fields: APIEmbedField[]) {
        // Add Venue Info
        fields.push({ name: "Venue", value: this.gameInfo.getVenue().name || "" });

        // Add Weather Info
        let weather = this.gameInfo.getWeather();
        if( Object.keys(weather).length > 0 ) {
            let temp = this.gameInfo.getWeather().temp || "";
            let condition = this.gameInfo.getWeather().condition || "";
            let wind = this.gameInfo.getWeather().wind || "";
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
            let firstPitch = gameInfo.firstPitch? date.format.toHHMM(new Date(gameInfo.firstPitch)) : "";

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


    private addStartingLineup(fields: APIEmbedField[]) {
        let homeTeamName = this.gameInfo.getHomeTeam().teamName || "";
        let awayTeamName = this.gameInfo.getAwayTeam().teamName || "";

        let probablePitchers = this.gameInfo.getProbablePitchers();

        let lineups = this.stats.buildStartingLineupSummary();

        fields.push({ name: `${awayTeamName} Lineup vs ${probablePitchers.home?.getProfile().boxscoreName || ""}`, value: lineups.away });
        this.addSpacer(fields);
        fields.push({ name: `${homeTeamName} Lineup vs ${probablePitchers.away?.getProfile().boxscoreName || ""}`, value: lineups.home });        
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


    private addLivePitchingStats(fields: APIEmbedField[]) {
        let homeTeamName = this.gameInfo.getHomeTeam().teamName || "";
        let awayTeamName = this.gameInfo.getAwayTeam().teamName || "";

        let pitchingSummary = this.stats.buildLivePitchingStatsSummary();

        fields.push({ name: `${awayTeamName} Pitchers`, value: pitchingSummary.away });
        fields.push({ name: `${homeTeamName} Pitchers`, value: pitchingSummary.home });             
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

    private getHighlights() {
        let highlights = this.gameInfo.getHighlights();
        if( highlights.length > 0 ) {
            const mapHighlights = (highlight: any) => {
                let url = content.link.getHighlightVideoLink(highlight.slug);
                let linkTitle = `${highlight.title} (${highlight.duration})`;
                return hyperlink(linkTitle, url);
            };

            return highlights.map(mapHighlights).join("\n");
        }
        return "";
    }

    private addSpacer(fields: APIEmbedField[]) {
        fields.push({ name: '\u200B', value: '\u200B' });
    }

    private getInningOrdinal(n: number) {
        let ord = 'th';
        if (n % 10 == 1 && n % 100 != 11) {
          ord = 'st';
        } else if (n % 10 == 2 && n % 100 != 12) {
          ord = 'nd';
        } else if (n % 10 == 3 && n % 100 != 13) {
          ord = 'rd';
        }      
        return n + ord;
    }
}

export interface PlayByPlayMessage {
    isScoringPlay: boolean; 
    embeds: EmbedBuilder[];
}