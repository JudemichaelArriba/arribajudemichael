import type {
    Tables,
    TablesUpdate,
} from '@/lib/models/database.types';

export type Message = Tables<'messages'>;
export type MessageUpdate = TablesUpdate<'messages'>;
export type MessageFilter = 'inbox' | 'unread' | 'starred' | 'archived';
export type MessageSecurityStatus = 'normal' | 'flagged';

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
