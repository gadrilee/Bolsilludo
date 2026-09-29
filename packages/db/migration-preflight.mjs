import { readFile } from 'node:fs/promises';
import postgres from 'postgres';

const envText = await readFile(new URL('../../apps/web/.env.local', import.meta.url), 'utf8');
const databaseUrlLine = envText.split(/\r?\n/).find((line) => line.trimStart().startsWith('DATABASE_URL='));

if (!databaseUrlLine) throw new Error('DATABASE_URL is not configured');

const databaseUrl = databaseUrlLine.slice(databaseUrlLine.indexOf('=') + 1).trim().replace(/^['"]|['"]$/g, '');
const sql = postgres(databaseUrl, { max: 1, connect_timeout: 10, ssl: 'require' });

try {
  const [tables] = await sql.unsafe(`
    select
      to_regclass('public.budget_members') is not null as budget_members,
      to_regclass('public.budget_invitations') is not null as budget_invitations,
      to_regclass('public.transactions') is not null as transactions,
      to_regclass('supabase_migrations.schema_migrations') is not null as migration_history
  `);

  if (!tables.budget_members || !tables.budget_invitations || !tables.transactions) {
    throw new Error('One or more required tables are missing');
  }

  const [duplicateMemberships] = await sql.unsafe(`
    select count(*)::int as count
    from (
      select budget_id, user_id
      from public.budget_members
      group by budget_id, user_id
      having count(*) > 1
    ) duplicates
  `);
  const [invalidMemberRoles] = await sql.unsafe(`
    select count(*)::int as count
    from public.budget_members
    where role not in ('owner', 'admin', 'editor', 'viewer')
  `);
  const [invalidInvitationRoles] = await sql.unsafe(`
    select count(*)::int as count
    from public.budget_invitations
    where role not in ('admin', 'editor', 'viewer')
  `);
  const transferColumns = await sql.unsafe(`
    select column_name
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'transactions'
      and column_name in ('transfer_group_id', 'transfer_peer_id')
    order by column_name
  `);
  const migrationVersions = tables.migration_history
    ? await sql.unsafe(`
      select version
      from supabase_migrations.schema_migrations
      where version in ('20260929000000', '20260929000001')
      order by version
    `)
    : [];
  const constraints = await sql.unsafe(`
    select conname, convalidated
    from pg_constraint
    where conname in (
      'budget_members_role_allowed',
      'budget_invitations_role_allowed',
      'transactions_transfer_columns_paired',
      'transactions_transfer_peer_fk'
    )
    order by conname
  `);
  const indexes = await sql.unsafe(`
    select indexname
    from pg_indexes
    where schemaname = 'public'
      and indexname in ('budget_members_budget_user_uq', 'transactions_transfer_group_idx')
    order by indexname
  `);

  console.log(JSON.stringify({
    tables,
    duplicateMembershipKeys: duplicateMemberships.count,
    invalidMemberRoles: invalidMemberRoles.count,
    invalidInvitationRoles: invalidInvitationRoles.count,
    transferColumns: transferColumns.map((column) => column.column_name),
    constraints,
    indexes: indexes.map((index) => index.indexname),
    migrationHistoryPresent: tables.migration_history,
    appliedMigrationVersions: migrationVersions.map((row) => row.version),
  }));
} finally {
  await sql.end();
}