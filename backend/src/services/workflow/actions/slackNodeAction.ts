/**
 * Slack Integration Node Executor
 *
 * Provides comprehensive Slack integration with multiple actions.
 * Each action interacts with Slack's Web API using encrypted credentials.
 */

import { ActionContext, ActionResult, BaseActionExecutor } from "./types";
import { WebClient } from "@slack/web-api";
import { decryptCredentials } from "../../../utils/encryption";
import { replacePlaceholders } from "../expressionEvaluator";

// ============================================
// TYPES
// ============================================

export type SlackAction =
    | 'post_message'
    | 'send_dm'
    | 'create_channel'
    | 'update_message'
    | 'add_reaction'
    | 'upload_file'
    | 'set_topic'
    | 'invite_to_channel';

interface SlackCredentials {
    botToken: string;              // OAuth Bot Token (encrypted)
    workspaceId?: string;          // Workspace ID
}

interface PostMessageConfig {
    channel: string;               // #channel-name or channel ID
    text: string;                  // Message text with {{placeholders}}
    blocks?: any[];                // Rich formatting blocks
    threadTs?: string;             // Reply in thread
    asUser?: boolean;
}

interface SendDMConfig {
    userId: string;                // User ID or {{variable}}
    text: string;
    blocks?: any[];
}

interface CreateChannelConfig {
    name: string;                  // Channel name
    isPrivate: boolean;
    description?: string;
}

interface UpdateMessageConfig {
    channel: string;
    messageTs: string;             // Message timestamp
    text: string;
}

interface AddReactionConfig {
    channel: string;
    timestamp: string;
    emoji: string;                 // Without colons, e.g., "thumbsup"
}

interface UploadFileConfig {
    channel: string;
    file: string;                  // File path or URL
    filename?: string;
    title?: string;
    initialComment?: string;
}

interface SetTopicConfig {
    channel: string;
    topic: string;
}

interface InviteToChannelConfig {
    channel: string;
    users: string[];               // Array of user IDs
}

export interface SlackNodeConfig {
    // Credentials (encrypted)
    credentials: {
        botToken: string;          // Encrypted
        workspaceId?: string;
    };

    // Selected Action
    action: SlackAction;

    // Action-specific configs
    postMessage?: PostMessageConfig;
    sendDm?: SendDMConfig;
    createChannel?: CreateChannelConfig;
    updateMessage?: UpdateMessageConfig;
    addReaction?: AddReactionConfig;
    uploadFile?: UploadFileConfig;
    setTopic?: SetTopicConfig;
    inviteToChannel?: InviteToChannelConfig;

    // Response handling
    responseVariable?: string;     // Store response in dataContext
}

// ============================================
// SLACK NODE EXECUTOR
// ============================================

export class SlackNodeExecutor extends BaseActionExecutor {
    async execute(context: ActionContext): Promise<ActionResult> {
        const { step, entity, enrollment } = context;
        const config = step.config as unknown as SlackNodeConfig;

        if (!config.credentials?.botToken) {
            return this.error("Slack bot token is required");
        }

        if (!config.action) {
            return this.error("Slack action is required");
        }

        // Initialize dataContext if needed
        if (!enrollment.dataContext) {
            enrollment.dataContext = { variables: {}, previousResults: {} };
        }
        if (!enrollment.dataContext.variables) {
            enrollment.dataContext.variables = {};
        }

        try {
            // Decrypt credentials
            const workspaceId = enrollment.workspaceId?.toString() || '';
            const credentials = this.decryptSlackCredentials(config.credentials, workspaceId);

            // Initialize Slack client
            const client = new WebClient(credentials.botToken);

            this.log(`📨 Executing Slack action: ${config.action}`);

            // Route to specific action handler
            let result: any;
            switch (config.action) {
                case 'post_message':
                    result = await this.postMessage(client, config, context);
                    break;
                case 'send_dm':
                    result = await this.sendDM(client, config, context);
                    break;
                case 'create_channel':
                    result = await this.createChannel(client, config, context);
                    break;
                case 'update_message':
                    result = await this.updateMessage(client, config, context);
                    break;
                case 'add_reaction':
                    result = await this.addReaction(client, config, context);
                    break;
                case 'upload_file':
                    result = await this.uploadFile(client, config, context);
                    break;
                case 'set_topic':
                    result = await this.setTopic(client, config, context);
                    break;
                case 'invite_to_channel':
                    result = await this.inviteToChannel(client, config, context);
                    break;
                default:
                    return this.error(`Unknown Slack action: ${config.action}`);
            }

            // Store response if configured
            if (config.responseVariable) {
                enrollment.dataContext.variables[config.responseVariable] = result;
                this.log(`💾 Stored response in variable: ${config.responseVariable}`);
            }

            this.log(`✅ Slack action completed successfully`);

            return this.success({
                action: config.action,
                response: result,
            });

        } catch (error: any) {
            this.log(`❌ Slack action failed: ${error.message}`);
            return this.error(`Slack ${config.action} failed: ${error.message}`);
        }
    }

    // ============================================
    // ACTION HANDLERS
    // ============================================

    /**
     * Post message to a channel
     */
    private async postMessage(
        client: WebClient,
        config: SlackNodeConfig,
        context: ActionContext
    ): Promise<any> {
        if (!config.postMessage) {
            throw new Error("Post message configuration is required");
        }

        const { channel, text, blocks, threadTs, asUser } = config.postMessage;

        // Replace placeholders in text
        const finalText = this.replacePlaceholdersInContext(text, context);
        const finalChannel = this.replacePlaceholdersInContext(channel, context);

        const result = await client.chat.postMessage({
            channel: finalChannel,
            text: finalText,
            blocks: blocks,
            thread_ts: threadTs,
            as_user: asUser,
        });

        return {
            ts: result.ts,
            channel: result.channel,
            message: result.message,
        };
    }

    /**
     * Send direct message to a user
     */
    private async sendDM(
        client: WebClient,
        config: SlackNodeConfig,
        context: ActionContext
    ): Promise<any> {
        if (!config.sendDm) {
            throw new Error("Send DM configuration is required");
        }

        const { userId, text, blocks } = config.sendDm;

        // Replace placeholders
        const finalUserId = this.replacePlaceholdersInContext(userId, context);
        const finalText = this.replacePlaceholdersInContext(text, context);

        // Open conversation with user
        const conversation = await client.conversations.open({
            users: finalUserId,
        });

        if (!conversation.channel?.id) {
            throw new Error("Failed to open DM conversation");
        }

        // Send message
        const result = await client.chat.postMessage({
            channel: conversation.channel.id,
            text: finalText,
            blocks: blocks,
        });

        return {
            ts: result.ts,
            channel: result.channel,
            userId: finalUserId,
        };
    }

    /**
     * Create a new channel
     */
    private async createChannel(
        client: WebClient,
        config: SlackNodeConfig,
        context: ActionContext
    ): Promise<any> {
        if (!config.createChannel) {
            throw new Error("Create channel configuration is required");
        }

        const { name, isPrivate, description } = config.createChannel;

        // Replace placeholders
        const finalName = this.replacePlaceholdersInContext(name, context);
        const finalDescription = description
            ? this.replacePlaceholdersInContext(description, context)
            : undefined;

        const result = await client.conversations.create({
            name: finalName,
            is_private: isPrivate,
        });

        // Set topic/description if provided
        if (finalDescription && result.channel?.id) {
            await client.conversations.setTopic({
                channel: result.channel.id,
                topic: finalDescription,
            });
        }

        return {
            channelId: result.channel?.id,
            channelName: result.channel?.name,
            isPrivate: result.channel?.is_private,
        };
    }

    /**
     * Update an existing message
     */
    private async updateMessage(
        client: WebClient,
        config: SlackNodeConfig,
        context: ActionContext
    ): Promise<any> {
        if (!config.updateMessage) {
            throw new Error("Update message configuration is required");
        }

        const { channel, messageTs, text } = config.updateMessage;

        // Replace placeholders
        const finalChannel = this.replacePlaceholdersInContext(channel, context);
        const finalText = this.replacePlaceholdersInContext(text, context);
        const finalTs = this.replacePlaceholdersInContext(messageTs, context);

        const result = await client.chat.update({
            channel: finalChannel,
            ts: finalTs,
            text: finalText,
        });

        return {
            ts: result.ts,
            channel: result.channel,
            updated: true,
        };
    }

    /**
     * Add emoji reaction to a message
     */
    private async addReaction(
        client: WebClient,
        config: SlackNodeConfig,
        context: ActionContext
    ): Promise<any> {
        if (!config.addReaction) {
            throw new Error("Add reaction configuration is required");
        }

        const { channel, timestamp, emoji } = config.addReaction;

        // Replace placeholders
        const finalChannel = this.replacePlaceholdersInContext(channel, context);
        const finalTimestamp = this.replacePlaceholdersInContext(timestamp, context);
        const finalEmoji = this.replacePlaceholdersInContext(emoji, context);

        await client.reactions.add({
            channel: finalChannel,
            timestamp: finalTimestamp,
            name: finalEmoji,
        });

        return {
            channel: finalChannel,
            timestamp: finalTimestamp,
            emoji: finalEmoji,
            added: true,
        };
    }

    /**
     * Upload file to a channel
     */
    private async uploadFile(
        client: WebClient,
        config: SlackNodeConfig,
        context: ActionContext
    ): Promise<any> {
        if (!config.uploadFile) {
            throw new Error("Upload file configuration is required");
        }

        const { channel, file, filename, title, initialComment } = config.uploadFile;

        // Replace placeholders
        const finalChannel = this.replacePlaceholdersInContext(channel, context);
        const finalFile = this.replacePlaceholdersInContext(file, context);
        const finalFilename = filename
            ? this.replacePlaceholdersInContext(filename, context)
            : undefined;
        const finalTitle = title
            ? this.replacePlaceholdersInContext(title, context)
            : undefined;
        const finalComment = initialComment
            ? this.replacePlaceholdersInContext(initialComment, context)
            : undefined;

        // Note: This is a simplified implementation
        // In production, you'd need to handle file reading from path/URL
        const result = await client.files.upload({
            channels: finalChannel,
            file: Buffer.from(finalFile), // Simplified - would need proper file handling
            filename: finalFilename,
            title: finalTitle,
            initial_comment: finalComment,
        });

        return {
            fileId: result.file?.id,
            filename: result.file?.name,
            uploaded: true,
        };
    }

    /**
     * Set channel topic
     */
    private async setTopic(
        client: WebClient,
        config: SlackNodeConfig,
        context: ActionContext
    ): Promise<any> {
        if (!config.setTopic) {
            throw new Error("Set topic configuration is required");
        }

        const { channel, topic } = config.setTopic;

        // Replace placeholders
        const finalChannel = this.replacePlaceholdersInContext(channel, context);
        const finalTopic = this.replacePlaceholdersInContext(topic, context);

        const result = await client.conversations.setTopic({
            channel: finalChannel,
            topic: finalTopic,
        });

        return {
            channel: finalChannel,
            topic: result.topic,
            updated: true,
        };
    }

    /**
     * Invite users to a channel
     */
    private async inviteToChannel(
        client: WebClient,
        config: SlackNodeConfig,
        context: ActionContext
    ): Promise<any> {
        if (!config.inviteToChannel) {
            throw new Error("Invite to channel configuration is required");
        }

        const { channel, users } = config.inviteToChannel;

        // Replace placeholders
        const finalChannel = this.replacePlaceholdersInContext(channel, context);
        const finalUsers = users.map(userId =>
            this.replacePlaceholdersInContext(userId, context)
        );

        const result = await client.conversations.invite({
            channel: finalChannel,
            users: finalUsers.join(','),
        });

        return {
            channel: finalChannel,
            invitedUsers: finalUsers,
            invited: true,
        };
    }

    // ============================================
    // HELPERS
    // ============================================

    /**
     * Decrypt Slack credentials
     */
    private decryptSlackCredentials(
        encryptedCredentials: any,
        workspaceId: string
    ): SlackCredentials {
        try {
            // If already decrypted (for development/testing)
            if (typeof encryptedCredentials.botToken === 'string' &&
                encryptedCredentials.botToken.startsWith('xoxb-')) {
                return encryptedCredentials as SlackCredentials;
            }

            // Decrypt using workspace-specific key
            return decryptCredentials(encryptedCredentials.botToken, workspaceId);
        } catch (error: any) {
            throw new Error(`Failed to decrypt Slack credentials: ${error.message}`);
        }
    }

    /**
     * Replace placeholders in a string using workflow context
     */
    private replacePlaceholdersInContext(
        template: string,
        context: ActionContext
    ): string {
        const { entity, enrollment } = context;

        const placeholderContext = {
            ...entity,
            ...(enrollment.dataContext?.variables || {}),
        };

        // Include loop context if active
        if (enrollment.dataContext?.loopContext) {
            placeholderContext.item = enrollment.dataContext.loopContext.currentItem;
            placeholderContext.index = enrollment.dataContext.loopContext.currentIndex;
        }

        return replacePlaceholders(template, placeholderContext);
    }
}
