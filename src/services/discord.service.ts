import { ChannelType, Client, Collection, EmbedBuilder, Events, ForumChannel, GatewayIntentBits, ThreadAutoArchiveDuration, ThreadChannel } from "discord.js";
import { LoggerService } from "./logger.service";

const GAME_THREAD_CHANNEL_NAME = "mlb-game-threads";

export class DiscordService {
    private logger: LoggerService;
    private client: Client;

    private isDevMode: boolean = false;

    constructor(token: string) {
        this.logger = new LoggerService(DiscordService.name);

        this.client = new Client({intents: GatewayIntentBits.Guilds});
        this.client.once(Events.ClientReady, this.onReady);
        this.client.login(token);        
    }

    private onReady(c: Client) {
        console.debug(`[onReady] Client Ready! Logged in as ${c?.user?.tag}`);
    }

    public setDevMode(isDevMode: boolean) {
        this.isDevMode = isDevMode;
    }

    public async createThreads(name: string, embeds: EmbedBuilder[]) {
        let guilds = this.client.guilds.cache;
        if( this.isDevMode ) {   
            this.logger.debug("Running in DEV mode, only posting to Dev guild...");         
            let devGuildId = process.env.DEV_GUILD_ID || "";
            let devGuild = await this.client.guilds.fetch(devGuildId);
            guilds = new Collection();

            if( devGuild ) {
                guilds.set(devGuildId, devGuild);
            } else {
                this.logger.warn(`Dev Guild ${devGuildId} not found!`);
            }                
            
        }

        return guilds.map(async (guild) => {
            let pMLBGameChannel: Promise<ForumChannel>;
            let mlbGameChannel = (guild.channels.cache.find(channel => {
                return channel.name == GAME_THREAD_CHANNEL_NAME && channel.type == ChannelType.GuildForum;
            }) as ForumChannel);            

            if( !mlbGameChannel ) {
                this.logger.debug(`${GAME_THREAD_CHANNEL_NAME} channel not found, creating it...`);
                pMLBGameChannel = guild.channels.create({ 
                    name: GAME_THREAD_CHANNEL_NAME, 
                    type: ChannelType.GuildForum,
                    topic: "MLB Game Threads",
                    defaultAutoArchiveDuration: ThreadAutoArchiveDuration.OneDay
                });
            } else {
                this.logger.debug(`Found existing ${GAME_THREAD_CHANNEL_NAME} channel!`);
                pMLBGameChannel = Promise.resolve(mlbGameChannel);
            }
            
            return pMLBGameChannel.then((ch) => {
                return ch.threads.create({
                    name: name,
                    message: {
                        embeds: embeds
                    }
                });
            });
        });
    }

    
    public editThreads(threadRefs: ThreadChannel[], embeds: EmbedBuilder[]) {
        threadRefs.forEach(th => {
            this.logger.debug(`Fetching starting message for thread: ${th.id}`);
            th.fetchStarterMessage().then((msg) => {
                if( msg ) {
                    this.logger.debug(`Starting message found (${msg.id}), editing...`);
                    msg.edit({
                        embeds: embeds
                    }).then((msg) => {
                        this.logger.debug(`...starting message (${msg.id}) edited!`);

                    }).catch(err => {
                        this.logger.error(err);
                    });                    
                }
            });
        });
    }
}