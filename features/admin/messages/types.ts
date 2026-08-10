import type {
    Tables,
    TablesInsert,
    TablesUpdate,
} from '@/lib/models/database.types';

export type Message = Tables<'messages'>;
export type MessageUpdate = TablesUpdate<'messages'>;
export type ContactBan = Tables<'contact_bans'>;
export type ContactBanInsert = TablesInsert<'contact_bans'>;
export type ContactBanUpdate = TablesUpdate<'contact_bans'>;
export type MessageFilter = 'inbox' | 'unread' | 'starred' | 'archived';
export type MessageSecurityStatus = 'normal' | 'flagged';
export type BanDuration = '24h' | '7d' | '30d' | 'permanent';
export type BanSourceField = 'duration' | 'reason';
export type BanSourceActionCode =
    | 'already_banned'
    | 'no_active_ban'
    | 'source_unavailable'
    | 'message_unavailable'
    | 'validation_error'
    | 'operation_failed';

export interface AdminMessageDto {
    readonly id: string;
    readonly senderName: string;
    readonly senderEmail: string;
    readonly message: string;
    readonly receivedAt: string;
    readonly isRead: boolean;
    readonly isStarred: boolean;
    readonly isArchived: boolean;
    readonly securityStatus: MessageSecurityStatus;
    readonly isSourceBanned: boolean;
}

export interface AdminMessageCounts {
    readonly total: number;
    readonly inbox: number;
    readonly unread: number;
    readonly starred: number;
    readonly archived: number;
}

export interface AdminMessageQuery {
    readonly filter: MessageFilter;
    readonly search: string;
    readonly page: number;
}

export interface AdminMessagesPageDto extends AdminMessageQuery {
    readonly messages: AdminMessageDto[];
    readonly counts: AdminMessageCounts;
    readonly pageSize: number;
    readonly resultCount: number;
    readonly hasNewer: boolean;
    readonly hasOlder: boolean;
}

export interface MessageActionResult {
    readonly status: 'success' | 'error';
    readonly message: string;
}

export interface BanSourceInput {
    readonly messageId: string;
    readonly duration: BanDuration;
    readonly reason: string;
}

export type BanSourceFieldErrors = Partial<Record<BanSourceField, string>>;

export interface BanSourceActionResult extends MessageActionResult {
    readonly code?: BanSourceActionCode;
    readonly fieldErrors?: BanSourceFieldErrors;
}
