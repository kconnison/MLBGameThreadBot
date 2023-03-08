import { bold, codeBlock, EmbedBuilder } from "@discordjs/builders";
import { APIEmbedField } from "discord.js";
import { GameStatsTable, GameStatsTableColumn } from "../models/game-stats-table.model";
import { PlayerInfo } from "../models/player-info.model";
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

                let time = date.format.toHHMM(gameDate);
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

            this.logger.debug(`Game State: ${this.gameInfo.getGameStatus().abstractGameState}`)

            // If game in Preview state, show probable pitchers 
            // & starting lineup w/ stats against probable pitcher
            if( this.gameInfo.isGameStatePreview() ) {                
                this.addProbablePitchers(fields);
                this.addStartingLineup(fields);

            // Game is Live/Final, show in-game stats table
            // & other in-game information
            } else {
                this.addLiveBattingStats(fields);
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

        fields.push({ name: "Probable Pitchers (Season Stats)", value: codeBlock(table.toString()) })
    }

    private addStartingLineup(fields: APIEmbedField[]) {
        let homeTeamName = this.gameInfo.getHomeTeam().teamName || "";
        let homeBox = this.gameInfo.getBoxscore().teams?.home;
        let homeBattingOrder = homeBox?.battingOrder || [];
        let homeLineupRows: any[][] = [];

        let awayTeamName = this.gameInfo.getAwayTeam().teamName || "";
        let awayBox = this.gameInfo.getBoxscore().teams?.away;
        let awayBattingOrder = awayBox?.battingOrder || [];
        let awayLineupRows: any[][] = [];

        let probablePitchers = this.gameInfo.getProbablePitchers();

        let playerNameColWidth = 0;
        const nameColWidthBuffer = 5;

        let columns: GameStatsTableColumn[] = [
            { label: "", width: 0 },
            { label: "AVG", width: 7, align: "right" },
            { label: "OPS", width: 7, align: "right" },
            { label: "AB", width: 4, align: "right" },
            { label: "HR", width: 4, align: "right" },
            { label: "RBI", width: 4, align: "right" },
            { label: "K", width: 4, align: "right" }
        ];        

        const buildStartingLineupRow = (id: number, i: number) => {
            let playerInfo = this.gameInfo.getPlayerInfo(id);
            let stats = this.gameInfo.getBatterStatsVsProbPitcher(id);

            let playerName = `${i+1} ${playerInfo?.getProfile().boxscoreName} - ${playerInfo?.getBoxscore().position?.abbreviation}`;
            let avg = stats?.avg || "-";
            let ops = stats?.ops || "-";
            let ab = stats?.atBats != undefined? stats.atBats : "-";
            let hr = stats?.homeRuns != undefined? stats.homeRuns : "-";
            let rbi = stats?.rbi != undefined? stats.rbi : "-";
            let k = stats?.strikeOuts != undefined? stats.strikeOuts : "-";
    
            return [playerName, avg, ops, ab, hr, rbi, k];
        };

        const mapStartingLineupRows = (id: number, i: number) => {
            let row = buildStartingLineupRow(id, i);
            if(row.at(0).length > playerNameColWidth) playerNameColWidth = row.at(0).length;
            return row;
        };

        if( awayBattingOrder.length > 0 ) {        
            awayLineupRows = awayBattingOrder.map(mapStartingLineupRows);
        }

        if( homeBattingOrder.length > 0 ) {
            homeLineupRows = homeBattingOrder.map(mapStartingLineupRows);
        }              

        // Update name column width
        columns[0].width = (playerNameColWidth+nameColWidthBuffer);

        let awayLineupTable = new GameStatsTable()
            .setColumns(columns)
            .setRows(awayLineupRows);
        
        let homeLineupTable = new GameStatsTable()
            .setColumns(columns)
            .setRows(homeLineupRows);

        fields.push({ name: `${awayTeamName} Lineup vs ${probablePitchers.home?.getProfile().boxscoreName || ""}`, value: codeBlock(awayLineupTable.toString()) });
        fields.push({ name: `${homeTeamName} Lineup vs ${probablePitchers.away?.getProfile().boxscoreName || ""}`, value: codeBlock(homeLineupTable.toString()) });
    }

    private addLiveBattingStats(fields: APIEmbedField[]) {
        let homeTeamName = this.gameInfo.getHomeTeam().teamName || "";
        let homeBox = this.gameInfo.getBoxscore().teams?.home;
        let homeBatters = homeBox?.batters || [];

        let awayTeamName = this.gameInfo.getAwayTeam().teamName || "";
        let awayBox = this.gameInfo.getBoxscore().teams?.away;
        let awayBatters = awayBox?.batters || [];

        let playerNameColWidth = 0;
        const nameColWidthBuffer = 5;

        let columns: GameStatsTableColumn[] = [
            { label: "", width: 3 }, // Lineup Number
            { label: "", width: 0 }, // Player Name
            { label: "AB", width: 3, align: "right" },
            { label: "R", width: 3, align: "right" },
            { label: "H", width: 3, align: "right" },
            { label: "RBI", width: 5, align: "right" },
            { label: "BB", width: 4, align: "right" },
            { label: "K", width: 3, align: "right" },
            { label: "LOB", width: 5, align: "right" },
            //{ label: "AVG", width: 6, align: "right" },
            //{ label: "OBP", width: 6, align: "right" },
            //{ label: "SLG", width: 6, align: "right" }
        ]; 

        const buildStatsRow = (id: number) => {
            let playerInfo = this.gameInfo.getPlayerInfo(id);
            let profile = playerInfo?.getProfile();
            let box = playerInfo?.getBoxscore();
            let stats = (playerInfo?.getGameStats()?.batting as any);
            let seasonStats = playerInfo?.getSeasonStats()?.batting;

            // Confirm stats exist before building row
            if( Object.keys(stats).length > 0 ) {
                let battingOrder = parseInt((box as any).battingOrder || "0");
                let lineupNbr = (battingOrder % 100 == 0)? (battingOrder / 100).toString() : "";
    
                let positions = (box as any).allPositions.map((pos: any) => { return pos.abbreviation; });
                let namePos = `${stats.note || ""}${profile?.boxscoreName} - ${positions.join("-")}`;
    
                let ab = stats.atBats;
                let runs = stats.runs;
                let hits = stats.hits;
                let rbi = stats.rbi;
                let bb = stats.baseOnBalls;
                let k = stats.strikeOuts;
                let lob = stats.leftOnBase;
                                
                let avg = seasonStats?.avg;
                let obp = seasonStats?.obp;
                let slg = seasonStats?.slg;
    
                return [lineupNbr, namePos, ab, runs, hits, rbi, bb, k, lob]; //, avg, obp, slg];
            }
            return [];
        };

        const mapStatsRows = (id: number) => {
            let statRow = buildStatsRow(id);
            if(statRow.length > 0 && statRow.at(1).length > playerNameColWidth) playerNameColWidth = statRow.at(1).length;
            return statRow;  
        };       
        
        const isNotEmpty = (row: any[]) => { return row.length > 0; };

        let awayStatRows = awayBatters.map(mapStatsRows).filter(isNotEmpty);
        let homeStatRows = homeBatters.map(mapStatsRows).filter(isNotEmpty);

        // Update name column width
        columns[1].width = (playerNameColWidth+nameColWidthBuffer);

        let awayStatTable = new GameStatsTable().setColumns(columns).setRows(awayStatRows);
        let homeStatTable = new GameStatsTable().setColumns(columns).setRows(homeStatRows);

        fields.push({ name: `${awayTeamName} Batters`, value: codeBlock(awayStatTable.toString()) });
        fields.push({ name: `${homeTeamName} Batters`, value: codeBlock(homeStatTable.toString()) });
    }
}