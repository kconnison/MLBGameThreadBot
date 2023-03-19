import { DiscordService } from "../services/discord.service";
import { GameInfoService } from "../services/game-info.service";
import { GameThreadContentService } from "../services/game-thread-content.service";
import { LoggerService } from "../services/logger.service";
import { date } from "../utils/date.utils";
import cron, { Range, RecurrenceRule } from "node-schedule";
import { ThreadChannel } from "discord.js";

export class GameThread {
    private logger: LoggerService;
    private gameInfo: GameInfoService;
    private content: GameThreadContentService;

    private discordThreadRefs: ThreadChannel[] = [];

    private isDevMode: boolean = false;

    constructor(private discord: DiscordService, private gamePk: number) {
        this.logger = new LoggerService(GameThread.name);
        this.gameInfo = new GameInfoService();
        this.content = new GameThreadContentService(this.gameInfo);
    }
    
    public setDevMode(isDevMode: boolean) {
        this.isDevMode = isDevMode;
    }

    /**
     * Posts the thread to Discord & schedules job to update it
     */
    public post() {
        let timecode;
        if( this.isDevMode ) {
            timecode = process.env.DEV_TS_SCHEDULE || date.format.toTimecode(new Date());
        }

        this.gameInfo.load(this.gamePk, timecode).then(async () => {
            this.createDiscordThreads();
            this.scheduleUpdateJob();
        });
    }

    /**
     * Creates a new Discord thread for the game
     */
    private createDiscordThreads() {
        let title = this.content.getThreadTitle();
        let embeds = this.content.getGameInfoEmbeds();

        this.discord.createThreads(title, embeds).then((pThreadRefs) => {
            Promise.all(pThreadRefs).then(threadRefs => {
                this.discordThreadRefs = threadRefs;
            })
        });
    }

    /**
     * Schedules a job to update the Discord thread during the game
     */
    private scheduleUpdateJob() {
        let updateJob: cron.Job;
        const updateCallback = (timecode?: string) => {
            this.logger.debug("Updating thread content...");

            return this.gameInfo.update(timecode).then(() => {
                this.discord.editThreads(this.discordThreadRefs, this.content.getGameInfoEmbeds());
                this.discord.postMessages(this.discordThreadRefs, this.content.getPlayByPlayMessages());
            });
        }; 

        // When running in Dev mode, assume there is an environment variable
        // with a list of timecodes to use for updates
        if( this.isDevMode ) {
            let UPDATE_TIMECODES = (process.env.DEV_TS_UPDATE || "").split(",");
            updateJob = cron.scheduleJob({second: new Range(0, 59, 20)}, async() => {
                if( UPDATE_TIMECODES.length > 0 ) {
                    let timecode = UPDATE_TIMECODES.shift();
                    await updateCallback(timecode);
                } else {
                    updateJob.cancel();
                }
            });

        // Otherwise start a job to check for updates per the Preview config
        // Once game is live, reschedule the job per the Live config
        } else {
            const DEFAULT_UPDATE_CONFIG = JSON.stringify({ preview: 10, live: 2 });
            const UPDATE_INTERVAL_CONFIG = JSON.parse(process.env.GAME_UPDATE_INTERVAL || DEFAULT_UPDATE_CONFIG);
            let hasSetLiveSchedule = false;            

            let schedule = new RecurrenceRule();
            schedule.minute = new Range(0, 59, UPDATE_INTERVAL_CONFIG?.preview);

            this.logger.debug(`Scheduling job to check for updates every ${UPDATE_INTERVAL_CONFIG?.preview} minutes...`);
            updateJob = cron.scheduleJob(schedule, async() => {
                await updateCallback();
                if( this.gameInfo.isGameStateLive() && hasSetLiveSchedule ) {
                    this.logger.debug(`Game is in Live state, rescheduling job to check for updates every ${UPDATE_INTERVAL_CONFIG?.live} minutes...`);
                    schedule.minute = new Range(0, 59, UPDATE_INTERVAL_CONFIG.live);
                    hasSetLiveSchedule = updateJob.reschedule(schedule);
                    this.logger.debug(`Updated to Live schedule: ${hasSetLiveSchedule}`);
                }
            });
        }
    }
}