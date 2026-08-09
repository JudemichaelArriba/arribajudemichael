import Messages from '@/components/admin/messages/Messages';
import { MOCK_MESSAGES } from '@/components/admin/messages/messages.data';
import { requireUser } from '@/lib/auth/requireUser';

export default async function MessagesPage() {
    await requireUser();

    return (
        <Messages
            initialMessages={MOCK_MESSAGES}
            referenceTime={new Date().toISOString()}
        />
    );
}
