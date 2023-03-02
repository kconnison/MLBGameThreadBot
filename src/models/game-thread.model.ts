import { GameRestObject } from "mlb-stats-typescript-api/output/src";
import { DiscordService } from "../services/discord.service";
import { GameThreadContentService } from "../services/game-thread-content.service";
import { LoggerService } from "../services/logger.service";

export class GameThread {
    private logger: LoggerService;
    private discord: DiscordService;
    private content: GameThreadContentService;

    constructor(private gameInfo: GameRestObject) {
        this.logger = new LoggerService(GameThread.name);
        this.discord = new DiscordService();
        this.content = new GameThreadContentService();
    }
    
    /**
     * Posts the thread to Discord & schedules job to update it
     */
    public post() {
        this.createDiscordThread();
        this.scheduleUpdateJob();
    }

    /**
     * Creates a new Discord thread for the game
     */
    private createDiscordThread() {
        let title = this.content.getThreadTitle(this.gameInfo);
        let summaryEmbed = this.content.getSummaryEmbedContent(this.gameInfo);

        this.logger.debug(title, summaryEmbed);
    }

    /**
     * Schedules a job to update the Discord thread during the game
     */
    private scheduleUpdateJob() {

    }
}