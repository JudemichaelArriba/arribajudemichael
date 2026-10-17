drop trigger if exists messages_notify_new_message_after_insert on public.messages;
drop function if exists public.notify_new_portfolio_message();


alter table public.contact_bans
    drop constraint if exists contact_bans_source_message_id_fkey;


drop table if exists public.messages;

delete from vault.secrets
where name in (
    'portfolio_notification_edge_function_url',
    'portfolio_notification_webhook_secret'
);
