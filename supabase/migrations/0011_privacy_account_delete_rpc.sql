-- Transactional privacy account deletion helper.
-- Called only from server-side service-role code. Keeps destructive app-data
-- cleanup and auth-user deletion in one database transaction.

create or replace function public.delete_account_cascade(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  -- Deleting memories creates memories_history snapshots via trigger; clear them
  -- before deleting auth.users so non-FK audit rows do not survive account deletion.
  delete from public.memories where user_id = p_user_id;
  delete from public.memories_history where user_id = p_user_id;
  delete from auth.users where id = p_user_id;
end;
$$;

revoke all on function public.delete_account_cascade(uuid) from public;
grant execute on function public.delete_account_cascade(uuid) to service_role;
