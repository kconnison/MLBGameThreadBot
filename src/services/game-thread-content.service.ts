import { bold, EmbedBuilder, hyperlink } from "@discordjs/builders";
import { APIEmbedField, time } from "discord.js";
import { GameBroadcastFeeds } from "../models/api/game-broadcast.model";
import { content } from "../utils/content.utils";
import { date } from "../utils/date.utils";
import { GameInfoService } from "./game-info.service";
import { GameThreadStatsService } from "./game-thread-stats.service";
import { LoggerService } from "./logger.service";
import { StandingsService } from "./standings.service";

export class GameThreadContentService {
    private logger: LoggerService;
    private stats: GameThreadStatsService;
    private standings: StandingsService

    private lastLoggedAB: number = -1;

    constructor(private gameInfo: GameInfoService) {
        this.logger = new LoggerService(GameThreadContentService.name);

        this.stats = new GameThreadStatsService(gameInfo);
        this.standings = new StandingsService();
    }

    public initialize(gamePk: number, timecode?: string) {
        return this.gameInfo.load(gamePk, timecode).then(async () => {
            let leagueIds = new Set<number>();
            leagueIds.add((this.gameInfo.getHomeTeam().league?.id || 0));
            leagueIds.add((this.gameInfo.getAwayTeam().league?.id || 0));
            await this.standings.loadStandingsByDivision(Array.from(leagueIds));
        });
    }

    public update(timecode?: string) {
        return this.gameInfo.update(timecode);
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

                // If start time is TBD use firstPitch time if available
                let time = date.format.toHHMM(gameDate);
                if( this.gameInfo.getGameStatus().startTimeTBD ) {
                    let firstPitch = this.gameInfo.getGameInfo().firstPitch;
                    if( firstPitch ) {
                        time = date.format.toHHMM(new Date(firstPitch));
                    } else {
                        time = "TBD";
                    }
                }

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

            this.logger.debug(`GamePK: ${gamePk}; Game State: ${this.gameInfo.getGameStatus().detailedState}`);

            // Only show additional info if game still scheduled
            if( !this.gameInfo.isGameStatePostponed() ) {
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
                    let standingsEmbed = getBaseEmbed()
                        .setTitle("Standings")
                        .setDescription(this.standings.buildDivisionStandingsSummary(this.gameInfo.getAwayTeam(), this.gameInfo.getHomeTeam()));

                    embeds.push(pitcherEmbed, lineupEmbed, standingsEmbed);

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
                        .setAuthor({ name: awayTeam.name || "\u200B", iconURL: content.icon.getTeamIcon(awayTeamId, 100) })
                        .setDescription(battingSummary.away)
                        .setColor(content.colors.getTeamColor(awayTeamId))
                        .addFields(awayBoxscoreFields);
                    let homeBattingEmbed = getBaseEmbed()
                        .setAuthor({ name: homeTeam.name || "\u200B", iconURL: content.icon.getTeamIcon(homeTeamId, 100) })
                        .setDescription(battingSummary.home)
                        .setColor(content.colors.getTeamColor(homeTeamId))
                        .addFields(homeBoxscoreFields);

                    let pitchingEmbed = getBaseEmbed().setTitle("Pitching").addFields(pitchingFields);
                    let boxscoreInfoEmbed = getBaseEmbed().setTitle("Game Info").setDescription(this.getGameBoxscoreInfo());
                    embeds.push(scoreboardEmbed, awayBattingEmbed, homeBattingEmbed, pitchingEmbed, boxscoreInfoEmbed);

                    // Add highlights (only during live game, if they exist)   
                    if( this.gameInfo.isGameStateLive() ) {
                        let highlights = this.getHighlights();
                        if( highlights.length > 0 ) {
                            let highlightsEmbed = getBaseEmbed().setTitle("Highlights").setDescription(highlights);
                            embeds.push(highlightsEmbed);  
                        }
                    }
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
            const canLogPlayEvent = (event: any) => {
                let eventType: string = event.details.eventType; 
                let isLoggableEventType = (eventType.includes("_substitution") || eventType.includes("stolen_base") 
                    || eventType.includes("caught_stealing") || eventType.includes("balk") 
                    || eventType.includes("wild_pitch") || eventType.includes("passed_ball")
                    || (eventType.includes("pickoff") && event.details.isOut) || eventType.includes("error"));
                    
                return isLoggableEventType || event.details.isScoringPlay;
            };

            const buildScoreDescription = (homeScore: number, awayScore: number) => {
                let homeAbbrev = this.gameInfo.getHomeTeam().abbreviation || "";
                let awayAbbrev = this.gameInfo.getAwayTeam().abbreviation || "";

                return this.buildScoreDescription(homeScore, homeAbbrev, awayScore, awayAbbrev);
            };

            const createEmbed = (playerId: number, description: string) => {
                let playerInfo = this.gameInfo.getPlayerInfo(playerId);
                if( playerInfo ) {
                    let teamId = playerInfo?.getBoxscore().parentTeamId || 0;
                    return new EmbedBuilder()
                        .setColor(content.colors.getTeamColor(teamId))
                        .setAuthor({ 
                            name: playerInfo?.getProfile().fullName || "\u200B", 
                            iconURL: content.icon.getPlayerIcon(playerId, 100), 
                            url: content.link.getPlayerProfileLink(playerId)
                        })
                        .setDescription(description);
                }
            };

            let plays = this.gameInfo.getAllPlays().slice((this.lastLoggedAB + 1));
            plays.forEach((play, i) => {
                // Only log the play if it is complete
                if( play?.about?.isComplete ) {
                    let embeds = [];
                
                    // First check playEvents for substitutions, stolen bases, caught stealing, etc.
                    (play.playEvents || []).forEach((event) => {
                        if(event?.details && event?.details?.eventType) {                                                    
                            if ( canLogPlayEvent(event) ) {
                                let playDescription = (event.details.description || "").replace(/(.*:\s)/, (match: any) => bold(match));

                                // if event is a scoring play, add score to message
                                if( event.details.isScoringPlay ) {
                                    let homeScore = event.details.homeScore || 0;                                                
                                    let awayScore = event.details.awayScore || 0;
                                    let scoreDescription = buildScoreDescription(homeScore, awayScore);
                                    playDescription += `\n\n${scoreDescription}`;
                                }

                                let playEventEmbed = createEmbed(event.player?.id || 0, playDescription);
                                if(playEventEmbed) embeds.push(playEventEmbed);
                            }
                        }
                    });
    
                    // Then create embed for the actual play itself
                    let playDescription = `${bold(play.result?.event+":")} ${play.result?.description}\n\n`;
                    if( play.about.isScoringPlay ) {                        
                        let homeScore = play.result?.homeScore || 0;                                                
                        let awayScore = play.result?.awayScore || 0;
                        let scoreDescription = buildScoreDescription(homeScore, awayScore);
                        playDescription += `${scoreDescription} | `;
                    }

                    let halfInning = play.about.halfInning || "";          
                    let inningDescription = `${halfInning.charAt(0).toUpperCase() + halfInning.slice(1)}  ${this.getInningOrdinal(play.about?.inning || 0)},`
                        + ` ${play.count?.outs} Out(s)`;
                    playDescription += `${inningDescription}`;
                    
                    let playEmbed = createEmbed(play.matchup?.batter?.id || 0, playDescription);
                    if(playEmbed) embeds.push(playEmbed);
                    
                    if( embeds.length > 0 ) {
                        messages.push({ isScoringPlay: (play.about.isScoringPlay || false), embeds: embeds });
                        this.lastLoggedAB = play.atBatIndex || i;
                    }
                }
            });

        } catch(e) {
            this.logger.error(e);
        }
        return messages;
    }

    public getFinalScoreMessage() {
        let linescore = this.gameInfo.getLinescore();
        let homeScore = linescore.teams?.home?.runs || 0;
        let homeTeamName = this.gameInfo.getHomeTeam().teamName || "";
        let awayScore = linescore.teams?.away?.runs || 0;
        let awayTeamName = this.gameInfo.getAwayTeam().teamName || "";

        let embeds = [];

        let scoreDescription = this.buildScoreDescription(homeScore, homeTeamName, awayScore, awayTeamName);
        let finalScoreEmbed = new EmbedBuilder()
            .setColor(content.colors.getTeamColor(0))
            .setDescription(`${bold("Final:")} ${scoreDescription}`);
        embeds.push(finalScoreEmbed);
        
        // post highlights (if they exist)
        let highlights = this.getHighlights();
        if( highlights.length > 0 ) {
            let highlightsEmbed = new EmbedBuilder()
                .setColor(content.colors.getTeamColor(0))
                .setTitle("Highlights")
                .setDescription(highlights);
            embeds.push(highlightsEmbed);
        }

        return { isScoringPlay: true, embeds: embeds };
    }

    private getSummaryEmbedTitle() {
        let homeTeam = this.gameInfo.getHomeTeam();
        let homeNameRecord = `${homeTeam?.name} (${homeTeam?.record?.wins}-${homeTeam?.record?.losses})`;
        
        let awayTeam = this.gameInfo.getAwayTeam();
        let awayNameRecord = `${awayTeam?.name} (${awayTeam?.record?.wins}-${awayTeam?.record?.losses})`;

        return `${awayNameRecord} @ ${homeNameRecord}`;
    }

    private getSummaryEmbedDescription() {
        let description = "";

        // If game is part of doubleheader, include which game it is
        if( this.gameInfo.getGameMetadata().doubleHeader == "Y" ) {
            description += `Doubleheader - Game ${this.gameInfo.getGameMetadata().gameNumber}\n`;
        }

        description += `${bold("Game Status:")} ${this.gameInfo.getGameStatus().detailedState}`;    
        
        // If game postponed, include reason & reschedule date
        if( this.gameInfo.isGameStatePostponed() ) {
            description += ` - ${this.gameInfo.getGameStatus().reason || "(No Reason Given)"}`;

            let gRescheduleDate = this.gameInfo.getRescheduleDate();
            let rescheduleDate = new Date(gRescheduleDate || "");
            if( isNaN(rescheduleDate.getTime()) ) {
                this.logger.warn("RescheduleDate value from GameInfo is not a valid date:", gRescheduleDate);

            } else {
                let wkday = rescheduleDate.toLocaleDateString('en-US', { weekday: "short" });
                let month = rescheduleDate.toLocaleDateString('en-US', { month: 'short' });
                let day = rescheduleDate.getDate().toString().padStart(2,"0");
                let year = rescheduleDate.getFullYear();

                let time = (this.gameInfo.getGameStatus().startTimeTBD? "TBD" : date.format.toHHMM(rescheduleDate));
                description += `\n${bold("Reschedule Date:")} ${wkday} ${day} ${month} ${year} @ ${time}`
            }

        // If game in Live/Final state, include score in description
        } else if( this.gameInfo.isGameStateLive() || this.gameInfo.isGameStateFinal() ) {
            let linescore = this.gameInfo.getLinescore();

            // If game is live, include current inning
            if( this.gameInfo.isGameStateLive() ) {      
                let inningState = linescore.inningState;
                let inningOrdinal = linescore.currentInningOrdinal;
                let outs = linescore.outs;
                description += ` - ${inningState} ${inningOrdinal}${outs? `, ${outs} Out(s)` : ``}`;
            }

            let homeScore = linescore.teams?.home?.runs || 0;
            let homeTeamName = this.gameInfo.getHomeTeam().teamName || "";

            let awayScore = linescore.teams?.away?.runs || 0;
            let awayTeamName = this.gameInfo.getAwayTeam().teamName || "";

            let scoreDescription = this.buildScoreDescription(homeScore, homeTeamName, awayScore, awayTeamName);
            description += ` | ${bold("Score:")} ${scoreDescription}`;
        }

        return description;
    }

    private addGameInfo(fields: APIEmbedField[]) {
        // Add Venue Info
        fields.push({ name: "Venue", value: this.gameInfo.getVenue().name || "\u200B" });

        // Add Weather Info
        let weather = this.gameInfo.getWeather();
        if( Object.keys(weather).length > 0 ) {
            let temp = this.gameInfo.getWeather().temp || "\u200B";
            let condition = this.gameInfo.getWeather().condition || "\u200B";
            let wind = this.gameInfo.getWeather().wind || "\u200B";
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
        
        fields.push({ name: '\u200B', value: '\u200B' });
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

        fields.push({ name: `${awayTeamName} Lineup vs ${probablePitchers.home?.getProfile().boxscoreName || "TBD"}`, value: lineups.away });
        this.addSpacer(fields);
        fields.push({ name: `${homeTeamName} Lineup vs ${probablePitchers.away?.getProfile().boxscoreName || "TBD"}`, value: lineups.home });        
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

    private buildScoreDescription(homeScore: number, homeTeam: string, awayScore: number, awayTeam: string) {
        return (homeScore > awayScore? `${homeScore}-${awayScore} ${homeTeam}` : 
                (homeScore < awayScore? `${awayScore}-${homeScore} ${awayTeam}` : `${homeScore}-${awayScore}`));
    }
}

export interface PlayByPlayMessage {
    isScoringPlay: boolean; 
    embeds: EmbedBuilder[];
}