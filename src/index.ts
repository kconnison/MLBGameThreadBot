import cron from "node-schedule";
import MLBStatsAPI from "mlb-stats-typescript-api/output";
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
let isDevMode = false;
if( process.env.NODE_ENV == 'production' ) {
    logger.debug("Running in PROD mode, scheduling daily job...");
    let gameScheduleJob = cron.scheduleJob({ hour: 5 }, () => {
        initializeGameThreads();
    });

} else {
    logger.debug("Running in DEV mode!");    
    isDevMode = true;

    const SCHEDULE_TIMECODE = process.env.DEV_TS_SCHEDULE || date.format.toTimecode(new Date());
    let dateOverride = date.format.fromTimecode(SCHEDULE_TIMECODE);
    initializeGameThreads(dateOverride);
}

/**
 * Initializes GameThreads from today's schedule
 */
async function initializeGameThreads(scheduleDate: Date = new Date()) {
    logger.debug(`Initializing game threads, schedule date is ${scheduleDate} ...`);
    
    let schedOpts = (TEAM_ID? { teamId: TEAM_ID, date: date.format.toMM_DD_YYYY(scheduleDate) } : {});
    let gamePks = (await MLBStatsAPI.ScheduleService.schedule(1, [], schedOpts)).dates?.at(0)?.games?.map(gm => { return gm.gamePk; }) || [];
    logger.debug(`${gamePks.length} game(s) scheduled today!`, gamePks);

    gamePks.forEach(async gamePk => {
        if( gamePk ) {            
            let gameThread = new GameThread(gamePk);
            gameThread.setDevMode(isDevMode);
            gameThread.post();
        }                
    });
}