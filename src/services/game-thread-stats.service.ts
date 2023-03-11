import { bold, underscore } from "@discordjs/builders";
import { LabelValuePair } from "mlb-stats-typescript-api/output/src";
import { GameStatsTableColumn, GameStatsTable } from "../models/game-stats-table.model";
import { PlayerInfo } from "../models/player-info.model";
import { GameInfoService } from "./game-info.service";

export class GameThreadStatsService {
    constructor(private gameInfo: GameInfoService) { }

    public buildProbablePitchersSummary() {
        let probablePitchers = this.gameInfo.getProbablePitchers();

        let homeTeamName = this.gameInfo.getHomeTeam().teamName || "";
        let hPitcher = probablePitchers.home;

        let awayTeamName = this.gameInfo.getAwayTeam().teamName || "";
        let aPitcher = probablePitchers.away;

        const buildPitcherDescription = (teamName: string, pitcher: PlayerInfo | undefined) => {
            if( pitcher ) {
                let pName = pitcher?.getProfile()?.fullName || "";
                let pSummary = pitcher?.getSeasonPitchingSummary();
                
                return `${bold(teamName)} - ${pName} (${pSummary})`;
            }       
            return `${bold(teamName)} - TBD`;
        };

        let pitchers = [buildPitcherDescription(awayTeamName, aPitcher), buildPitcherDescription(homeTeamName, hPitcher)];
        return pitchers.join("\n");
    }

    public buildProbablePitchersTable() {
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

        return table;
    }

    public buildStartingLineupSummary() {
        let homeBox = this.gameInfo.getBoxscore().teams?.home;
        let homeBattingOrder = homeBox?.battingOrder || [];
        let homeLineup = "";

        let awayBox = this.gameInfo.getBoxscore().teams?.away;
        let awayBattingOrder = awayBox?.battingOrder || [];
        let awayLineup = "";

        const mapStartingLineupRows = (id: number, i: number) => {
            let row = "";

            let playerInfo = this.gameInfo.getPlayerInfo(id);
            let stats = this.gameInfo.getBatterStatsVsProbPitcher(id);
            
            // add lineup number, player name, and position to row
            row += bold(`${i+1}) ${playerInfo?.getProfile().boxscoreName} - ${playerInfo?.getBoxscore().position?.abbreviation}`);            

            if( Object.keys(stats).length > 0  ) {
                let hits = stats?.hits != undefined? stats.hits : "-"
                let ab = stats?.atBats != undefined? stats.atBats : "-";
                let hr = stats?.homeRuns != undefined? stats.homeRuns : "-";
                let rbi = stats?.rbi != undefined? stats.rbi : "-";
                let k = stats?.strikeOuts != undefined? stats.strikeOuts : "-"; 

                row += `\n\t\t\t${hits}-${ab} | ${hr} HR, ${rbi} RBI, ${k} K`;
            }   
            
            return row;
        };

        homeLineup = homeBattingOrder.map(mapStartingLineupRows).join("\n");
        awayLineup = awayBattingOrder.map(mapStartingLineupRows).join("\n");

        return { home: homeLineup, away: awayLineup };
    }

    public buildStartingLineupTables() {
        let homeBox = this.gameInfo.getBoxscore().teams?.home;
        let homeBattingOrder = homeBox?.battingOrder || [];
        let homeLineupRows: any[][] = [];

        let awayBox = this.gameInfo.getBoxscore().teams?.away;
        let awayBattingOrder = awayBox?.battingOrder || [];
        let awayLineupRows: any[][] = [];

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

        return { home: homeLineupTable, away: awayLineupTable };
    }

    public buildLiveBattingStatsSummary() {
        let homeBox = this.gameInfo.getBoxscore().teams?.home;
        let homeBatters = homeBox?.batters || [];
        let homeBattingStats = "";
        let homeBattingNotes = (homeBox?.note || []);        

        let awayBox = this.gameInfo.getBoxscore().teams?.away;
        let awayBatters = awayBox?.batters || [];
        let awayBattingStats = "";
        let awayBattingNotes = (awayBox?.note || []);

        const mapLiveBattingStatsRow = (id: number) => {
            let playerInfo = this.gameInfo.getPlayerInfo(id);
            let profile = playerInfo?.getProfile();
            let box = playerInfo?.getBoxscore();
            let stats = (playerInfo?.getGameStats()?.batting as any) || {};

            let battingOrder = parseInt((box as any).battingOrder || "0");
            let lineupNbr = (battingOrder % 100 == 0)? `${(battingOrder / 100).toString()}) ` : "\t";

            let positions = (box as any).allPositions.map((pos: any) => { return pos.abbreviation; });
            let namePos = `${stats.note || ""}${profile?.boxscoreName} - ${positions.join("-")}`;

            return `${lineupNbr}${namePos}\t\t${playerInfo?.getGameBattingSummary()}`;
        };

        const mapBattingNotes = (note: LabelValuePair) => { return `${note.label}-${note.value}`; };

        homeBattingStats = homeBatters.map(mapLiveBattingStatsRow).join("\n");
        if( homeBattingNotes.length > 0 ) homeBattingStats += `\n\n${homeBattingNotes.map(mapBattingNotes).join("\n")}`;

        awayBattingStats = awayBatters.map(mapLiveBattingStatsRow).join("\n");
        if( awayBattingNotes.length > 0 ) awayBattingStats += `\n\n${awayBattingNotes.map(mapBattingNotes).join("\n")}`;

        return { home: homeBattingStats, away: awayBattingStats };
    }

    public buildLiveBattingStatsTables() {
        let homeBox = this.gameInfo.getBoxscore().teams?.home;
        let homeBatters = homeBox?.batters || [];

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
            { label: "AVG", width: 6, align: "right" },
            { label: "OBP", width: 6, align: "right" },
            { label: "SLG", width: 6, align: "right" }
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
    
                return [lineupNbr, namePos, ab, runs, hits, rbi, bb, k, lob, avg, obp, slg];
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

        return { home: homeStatTable, away: awayStatTable };
    }

    public buildLivePitchingStatsSummary() {
        let homeBox = this.gameInfo.getBoxscore().teams?.home;
        let homePitchers = homeBox?.pitchers || [];
        let homePitchingStats = "";

        let awayBox = this.gameInfo.getBoxscore().teams?.away;
        let awayPitchers = awayBox?.pitchers || [];
        let awayPitchingStats = "";

        const mapLivePitchingStatsRow = (id: number) => {
            let playerInfo = this.gameInfo.getPlayerInfo(id);
            let profile = playerInfo?.getProfile();
            let stats = (playerInfo?.getGameStats()?.pitching as any);
            return `${profile?.boxscoreName}${stats?.note? ` ${stats.note}` : ""}\t\t${playerInfo?.getGamePitchingSummary()}`;
        };

        homePitchingStats = homePitchers.map(mapLivePitchingStatsRow).join("\n");
        awayPitchingStats = awayPitchers.map(mapLivePitchingStatsRow).join("\n");

        return { home: homePitchingStats, away: awayPitchingStats };
    }

    // TODO
    public buildLivePitchingStatsTables() {
        let homeStatsTable = new GameStatsTable();
        let awayStatsTable = new GameStatsTable();

        return { home: homeStatsTable, away: awayStatsTable };
    }

    public buildBoxscoreInfoSummary() {
        let homeBox = this.gameInfo.getBoxscore().teams?.home;
        let homeBoxInfo = "";

        let awayBox = this.gameInfo.getBoxscore().teams?.away;
        let awayBoxInfo = "";

        const mapBoxscoreInfoRow = (info: { title?: string; fieldList?: LabelValuePair[] }) => {
            let title = underscore(bold(info.title || ""));
            let body = (info.fieldList || []).map(fl => {
                return `${bold(fl.label || "")}: `
            }).join("\n");
            return `${title}\n${body}`;
        };

        homeBoxInfo = (homeBox?.info || []).map(mapBoxscoreInfoRow).join("\n\n");
        awayBoxInfo = (awayBox?.info || []).map(mapBoxscoreInfoRow).join("\n\n");

        return { home: homeBoxInfo, away: awayBoxInfo };
    }
}