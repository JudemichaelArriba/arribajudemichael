import { unstable_rethrow } from 'next/navigation';

import Messages from '@/components/admin/messages/Messages';
import { getAdminMessages } from '@/features/admin/messages/queries';
import type {
    AdminMessageQuery,
    AdminMessagesPageDto,
} from '@/features/admin/messages/types';
import {
    ADMIN_MESSAGES_PAGE_SIZE,
    parseAdminMessageQuery,
} from '@/features/admin/messages/validation';

interface MessagesPageProps {
    searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function createUnavailablePageData(
    query: AdminMessageQuery,
): AdminMessagesPageDto {
    return {
        ...query,
        messages: [],
        counts: {
            total: 0,
            inbox: 0,
            unread: 0,
            starred: 0,
            archived: 0,
        },
        pageSize: ADMIN_MESSAGES_PAGE_SIZE,
        resultCount: 0,
        hasNewer: false,
        hasOlder: false,
    };
}

export default async function MessagesPage({ searchParams }: MessagesPageProps) {
    const query = parseAdminMessageQuery(await searchParams);
    let pageData = createUnavailablePageData(query);
    let unavailable = false;

    try {
        pageData = await getAdminMessages(query);
    } catch (error) {
        unstable_rethrow(error);
        unavailable = true;
    }

    return (
        <Messages
            pageData={pageData}
            referenceTime={new Date().toISOString()}
            unavailable={unavailable}
        />
    );
}
