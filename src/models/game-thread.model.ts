import { DiscordService } from "../services/discord.service";
import { GameInfoService } from "../services/game-info.service";
import { GameThreadContentService } from "../services/game-thread-content.service";
import { LoggerService } from "../services/logger.service";

export class GameThread {
    private logger: LoggerService;
    private discord: DiscordService;
    private gameInfo: GameInfoService;
    private content: GameThreadContentService;

    constructor(private gamePk: number) {
        this.logger = new LoggerService(GameThread.name);
        this.discord = new DiscordService();
        this.gameInfo = new GameInfoService();
        this.content = new GameThreadContentService(this.gameInfo);
    }
    
    /**
     * Posts the thread to Discord & schedules job to update it
     */
    public post() {
        this.gameInfo.load(this.gamePk).then(() => {
            this.createDiscordThread();
            this.scheduleUpdateJob();
        });
    }

    /**
     * Creates a new Discord thread for the game
     */
    private createDiscordThread() {
        let title = this.content.getThreadTitle();
        let summaryEmbed = this.content.getSummaryEmbedContent();

        this.logger.debug(title, summaryEmbed);
    }

    /**
     * Schedules a job to update the Discord thread during the game
     */
    private scheduleUpdateJob() {

    }
}