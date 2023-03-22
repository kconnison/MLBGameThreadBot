import cron from "node-schedule";
import { LoggerService } from "./services/logger.service";
import { date } from "./utils/date.utils";
import { GameThread } from "./models/game-thread.model";
import { DiscordService } from "./services/discord.service";
import { mlb } from "./services/mlb-stats.api";

const logger = new LoggerService("MLBGameThreadBot");
logger.debug("Initializing...");

// Initialize DiscordService instance
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
if( !DISCORD_TOKEN ) {
    logger.error("No Discord token found, unable to initialize DiscordService! Exiting...");
    process.exit();
}
const DISCORD_SERVICE = new DiscordService(DISCORD_TOKEN);

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
    DISCORD_SERVICE.setDevMode(true);

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
    let gamePks = (await mlb.schedule.getSchedule([], schedOpts)).dates?.at(0)?.games?.map(gm => { return gm.gamePk; }) || [];
    logger.debug(`${gamePks.length} game(s) scheduled today!`, gamePks);

    gamePks.forEach(async gamePk => {
        if( gamePk ) {            
            let gameThread = new GameThread(DISCORD_SERVICE, gamePk);
            gameThread.setDevMode(isDevMode);
            gameThread.post();
        }                
    });
}