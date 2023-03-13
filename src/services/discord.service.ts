import { ChannelType, Client, Collection, EmbedBuilder, Events, ForumChannel, GatewayIntentBits, ThreadAutoArchiveDuration } from "discord.js";
import { LoggerService } from "./logger.service";

const GAME_THREAD_CHANNEL_NAME = "mlb-game-threads";

export class DiscordService {
    private logger: LoggerService;
    private client: Client;

    private isDevMode: boolean = false;

    constructor(token: string) {
        this.logger = new LoggerService(DiscordService.name);
        this.client =  new Client({intents: GatewayIntentBits.Guilds});

        this.client.once(Events.ClientReady, this.onReady);

        this.client.login(token);        
    }

    private onReady(c: Client) {
        this.logger.debug(`[onReady] Client Ready! Logged in as ${c?.user?.tag}`);
    }

    public setDevMode(isDevMode: boolean) {
        this.isDevMode = isDevMode;
    }

    public async createThreads(name: string, embeds: EmbedBuilder[]) {
        let guilds = this.client.guilds.cache;
        if( this.isDevMode ) {
            let devGuildId = process.env.DEV_GUILD_ID || "";
            let devGuild = await this.client.guilds.fetch(devGuildId);
            
            guilds = new Collection();
            guilds.set(devGuildId, devGuild);
        }

        return guilds.map(async (guild) => {
            let mlbGameChannel: ForumChannel | undefined = (guild.channels.cache.find(channel => {
                return channel.name == GAME_THREAD_CHANNEL_NAME && channel.type == ChannelType.GuildForum;
            }) as ForumChannel);

            if( !mlbGameChannel ) {
                mlbGameChannel = await guild.channels.create({ 
                    name: GAME_THREAD_CHANNEL_NAME, 
                    type: ChannelType.GuildForum,
                    topic: "MLB Game Threads",
                    defaultAutoArchiveDuration: ThreadAutoArchiveDuration.OneDay
                });
            } 
            
            return mlbGameChannel.threads.create({
                name: name,
                message: {
                    embeds: embeds
                }
            });
        });
    }
}