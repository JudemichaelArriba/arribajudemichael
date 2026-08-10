create extension if not exists pg_net
with schema extensions;


create or replace function public.notify_new_portfolio_message()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
    notification_url text;
    webhook_secret text;
    request_id bigint;
begin
    begin
        select decrypted_secret
        into notification_url
        from vault.decrypted_secrets
        where name = 'portfolio_notification_edge_function_url'
        limit 1;

        select decrypted_secret
        into webhook_secret
        from vault.decrypted_secrets
        where name = 'portfolio_notification_webhook_secret'
        limit 1;

        notification_url := pg_catalog.btrim(notification_url);
        webhook_secret := pg_catalog.btrim(webhook_secret);

        if notification_url is null
            or webhook_secret is null
            or notification_url = ''
            or webhook_secret = ''
        then
            raise warning
                'Portfolio message notification skipped: configuration unavailable. Message ID: %.',
                new.id;
            return new;
        end if;

        if notification_url !~ '^https://'
            or pg_catalog.length(notification_url) > 2048
            or pg_catalog.length(webhook_secret) > 2048
        then
            raise warning
                'Portfolio message notification skipped: configuration invalid. Message ID: %.',
                new.id;
            return new;
        end if;

        select net.http_post(
            url := notification_url,
            body := pg_catalog.jsonb_build_object(
                'type', 'INSERT',
                'table', 'messages',
                'schema', 'public',
                'record', pg_catalog.jsonb_build_object(
                    'id', new.id,
                    'sender_name', new.sender_name,
                    'sender_email', new.sender_email,
                    'message', new.message,
                    'received_at', new.received_at
                ),
                'old_record', null
            ),
            headers := pg_catalog.jsonb_build_object(
                'Content-Type', 'application/json',
                'x-notification-secret', webhook_secret
            ),
            timeout_milliseconds := 10000
        )
        into request_id;

        if request_id is null then
            raise warning
                'Portfolio message notification enqueue returned no request ID. Message ID: %.',
                new.id;
        end if;
    exception
        when others then
            raise warning
                'Portfolio message notification enqueue failed. Message ID: %.',
                new.id;
    end;

    return new;
end;
$$;


revoke all
on function public.notify_new_portfolio_message()
from public, anon, authenticated;


drop trigger if exists messages_notify_new_message_after_insert
on public.messages;


create trigger messages_notify_new_message_after_insert
after insert on public.messages
for each row
execute function public.notify_new_portfolio_message();
