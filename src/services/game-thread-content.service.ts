import { bold, EmbedBuilder, hyperlink } from "@discordjs/builders";
import { APIEmbedField } from "discord.js";
import { content } from "../utils/content.utils";
import { date } from "../utils/date.utils";
import { GameBroadcastFeeds, GameInfoService } from "./game-info.service";
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

    public getEmbeds() {
        let embeds: EmbedBuilder[] = [];
        try {
            let gamePk = this.gameInfo.gamePk;
            let homeTeam = this.gameInfo.getHomeTeam();
            let homeTeamId = homeTeam.id || 0;
            let awayTeam = this.gameInfo.getAwayTeam();
            let awayTeamId = awayTeam.id || 0;

            const getBaseEmbed = () => {
                return new EmbedBuilder();
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
                

                let battingSummary = this.stats.buildLiveBattingStatsSummary();
                this.addTeamBoxscoreInfo(homeBoxscoreFields, awayBoxscoreFields);
                this.addLivePitchingStats(pitchingFields);                

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
                embeds.push(scoreboardEmbed, awayBattingEmbed, homeBattingEmbed, pitchingEmbed, boxscoreInfoEmbed);

                // Add scoring plays & highlights (if they exist)
                let scoreHighlightFields: APIEmbedField[] = [];
                this.addScoringPlays(scoreHighlightFields);
                this.addHighlights(scoreHighlightFields);
                if( scoreHighlightFields.length > 0 ) {
                    let scoreHighlightsEmbed = getBaseEmbed().setTitle("Scoring Plays & Highlights").addFields(scoreHighlightFields);
                    embeds.push(scoreHighlightsEmbed);   
                }             
            }

        } catch(e) {
            this.logger.error(e);
        }
        return embeds;
    }

    public getPlayByPlayMessageEmbeds() {
        let embeds: EmbedBuilder[][] = [];
        try {
            const createEmbed = (playerId: number, description: string) => {
                let playerInfo = this.gameInfo.getPlayerInfo(playerId);
                return new EmbedBuilder().setAuthor({ 
                    name: playerInfo?.getProfile().fullName || "", 
                    iconURL: content.icon.getPlayerIcon(playerId, 100), 
                    url: content.link.getPlayerProfileLink(playerId)
                }).setDescription(description);
            };

            let plays = this.gameInfo.getAllPlays().filter((p) => { return p.atBatIndex > this.lastLoggedAB; });
            plays.forEach((play) => {
                // Only log the play if it is complete
                if( play?.about?.isComplete ) {
                    let playEmbeds = [];
                
                    // First check playEvents for substitutions, stolen bases, caught stealing, etc.
                    (play.playEvents || []).forEach((event: any) => {
                        if(event?.details && event?.details?.eventType) {
                            let eventType: string = event.details.eventType;
                            if ( eventType.includes("_substitution") || eventType.includes("stolen_base") || eventType.includes("caught_stealing") ) {
                                playEmbeds.push(createEmbed(event.player.id, event.details.description));
                            }
                        }
                    });
    
                    // Then create embed for the actual play itself
                    let playDescription = `${bold(play.result.event)}: ${play.result.description}`;
                    playEmbeds.push(createEmbed(play.matchup.batter.id, playDescription));

                    embeds.push(playEmbeds);
                    this.lastLoggedAB = play.atBatIndex;
                }
            });

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

    private addScoringPlays(fields: APIEmbedField[]) {
        let scoringPlays = this.gameInfo.getScoringPlays();
        if( scoringPlays.length > 0 ) {
            let homeAbbrev = this.gameInfo.getHomeTeam().abbreviation;
            let awayAbbrev = this.gameInfo.getAwayTeam().abbreviation;
            const mapScoringPlays = (play: any) => {
                let halfInning: string = play.about.halfInning;          
                let inningDescription = `${halfInning.charAt(0).toUpperCase() + halfInning.slice(1)} ${play.about.inning}`;
    
                let playDescription = play.result.description;
                
                let homeScore = play.result.homeScore;
                let awayScore = play.result.awayScore;
                let scoreDescription = (homeScore > awayScore? `${homeScore}-${awayScore} ${homeAbbrev}` : 
                    (homeScore < awayScore? `${awayScore}-${homeScore} ${awayAbbrev}` : `${homeScore}-${awayScore}`));
    
                return `${inningDescription} - ${playDescription} - ${scoreDescription}`;
            };
    
            let scoringPlaysValue = scoringPlays.map(mapScoringPlays).join("\n");
            fields.push({ name: "Scoring Plays", value: scoringPlaysValue });
        }
    }

    private addHighlights(fields: APIEmbedField[]) {
        let highlights = this.gameInfo.getHighlights();
        if( highlights.length > 0 ) {
            const mapHighlights = (highlight: any) => {
                let url = highlight.playbacks[0].url;
                let linkTitle = `${highlight.title} (${highlight.duration})`;
                return hyperlink(linkTitle, url);
            };

            let highlightsValue = highlights.map(mapHighlights).join("\n");
            fields.push({ name: "Highlights", value: highlightsValue });
        }
    }

    private addSpacer(fields: APIEmbedField[]) {
        fields.push({ name: '\u200B', value: '\u200B' });
    }
}