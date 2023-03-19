import { ChannelType, Client, Collection, EmbedBuilder, Events, ForumChannel, GatewayIntentBits, PermissionsBitField, SortOrderType, ThreadAutoArchiveDuration, ThreadChannel } from "discord.js";
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

        return guilds.map((guild) => {
            return guild.channels.fetch()
            .then((channels) => {
                let existingThreadChannel = channels.find(channel => {
                    return channel?.name == GAME_THREAD_CHANNEL_NAME && channel?.type == ChannelType.GuildForum;
                });
                if( existingThreadChannel ) return (existingThreadChannel as ForumChannel);

            }).then((channel) => {
                if( !channel ) {
                    this.logger.debug(`[GUILD_${guild.id}] ${GAME_THREAD_CHANNEL_NAME} channel not found, creating it...`);
                    return guild.channels.create({ 
                        name: GAME_THREAD_CHANNEL_NAME, 
                        type: ChannelType.GuildForum,
                        topic: "MLB Game Threads",
                        defaultAutoArchiveDuration: ThreadAutoArchiveDuration.OneDay,
                        defaultSortOrder: SortOrderType.CreationDate,
                        permissionOverwrites: [
                            { 
                                id: guild.client.user.id,
                                allow: [
                                    PermissionsBitField.Flags.CreatePublicThreads,
                                    PermissionsBitField.Flags.ManageThreads
                                ]
                            },
                            {
                                id: guild.roles.everyone,
                                deny: [
                                    PermissionsBitField.Flags.CreatePublicThreads,
                                    PermissionsBitField.Flags.CreatePrivateThreads,
                                    PermissionsBitField.Flags.ManageThreads
                                ]
                            }
                        ]
                    });

                } else {
                    this.logger.debug(`[GUILD_${guild.id}] Found existing ${GAME_THREAD_CHANNEL_NAME} channel!`);
                    return channel;
                }

            }).then((channel) => {
                return channel.threads.create({
                    name: name,
                    message: {
                        embeds: embeds
                    }
                });
            });
        });
    }

    
    public editThreads(threadRefs: ThreadChannel[], embeds: EmbedBuilder[]) {
        threadRefs.forEach(thread => {
            this.logger.debug(`[THREAD_${thread.id}] Fetching starting message...`);
            thread.fetchStarterMessage()
            .then((msg) => {
                if( msg ) {
                    this.logger.debug(`[THREAD_${thread.id}] Starting message found, editing...`);
                    msg.edit({
                        embeds: embeds
                    }).then(() => {
                        this.logger.debug(`[THREAD_${thread.id}] ...starting message edited successfully!`);

                    }).catch(err => {
                        this.logger.error(err);
                    });                

                } else {
                    this.logger.warn(`[THREAD_${thread.id}] Starting message not found!`);
                }
            });
        });
    }


    public postMessages(threadRefs: ThreadChannel[], messageEmbeds: EmbedBuilder[][]) {
        threadRefs.forEach(thread => {
            messageEmbeds.forEach(async embeds => {
                await thread.send({
                    embeds: embeds
                }).catch(error => {
                    this.logger.error(error);
                });
            });
        });
    }
}