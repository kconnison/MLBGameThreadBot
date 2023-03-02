import cron, { Range } from "node-schedule";
import MLBStatsAPI from "mlb-stats-typescript-api/output";
import { GameRestObject } from "mlb-stats-typescript-api/output/src";
import { LoggerService } from "./services/logger.service";
import { date } from "./utils/date.utils";
import { GameThread } from "./models/game-thread.model";

const logger = new LoggerService("MLBGameThreadBot");
logger.debug("Initializing...");

// Determine if Bot is focused on a single team
const TEAM_ID = process.env.TEAM_ID? parseInt(process.env.TEAM_ID) : null;
if( TEAM_ID ) {
    logger.debug("TEAM_ID: ", TEAM_ID);
}

// If running in PROD mode, schedule daily job
if( process.env.NODE_ENV == 'production' ) {
    logger.debug("Running in PROD mode, scheduling daily job...");
    let gameScheduleJob = cron.scheduleJob({ hour: 5 }, () => {
        initializeGameThreads();
    });

} else {
    logger.debug("Running in DEV mode!");
    initializeGameThreads();
}

/**
 * Initializes GameThreads from today's schedule
 */
async function initializeGameThreads() {
    let today = new Date();
    logger.debug("Loading schedule...");
    
    let schedOpts = (TEAM_ID? { teamId: TEAM_ID, date: date.format.MM_DD_YYYY(today) } : {});
    let gamePks = (await MLBStatsAPI.ScheduleService.schedule(1, [], schedOpts)).dates?.at(0)?.games?.map(gm => { return gm.gamePk; }) || [];
    logger.debug(`${gamePks.length} game(s) scheduled today!`, gamePks);

    gamePks.forEach(async gamePk => {
        if( gamePk ) {
            let gameInfo = (await MLBStatsAPI.GameService.liveGameV1(gamePk));
            let gameThread = new GameThread(gameInfo);
            gameThread.post();
        }                
    });
}