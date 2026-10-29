# M11 migration runbook

This runbook covers the reviewed migration
`202610290001_add_m11_geography_profile_fields.sql`. Run it only through the
authorized Supabase migration workflow. Do not use application credentials or
the public client to perform schema changes.

## View compatibility

The migration appends `years_experience` and `spoken_languages` to
`active_public_providers` with `CREATE OR REPLACE VIEW`. Existing column names,
order, and types do not change. PostgreSQL therefore preserves the view object,
ownership, grants, options, comments, non-SELECT rules, and dependent objects.

The authorized Supabase migration runner applies each migration file as one
transaction. The SQL intentionally contains no embedded `BEGIN` or `COMMIT`,
because explicit transaction control can break the runner's atomicity. Any
failing statement therefore rolls back the file together. The migration does
not revoke or recreate existing view grants.

## Radius-pair legacy validation

The new `provider_records_mobile_radius_pair` check is added `NOT VALID` so
legacy rows with only one radius field do not block deployment. PostgreSQL
still enforces the check for new inserts and updates. The migration validates
the constraint automatically when no legacy violation exists.

After migration, an authorized operator should run these count-only checks:

```sql
select count(*) as invalid_radius_pair_count
from public.provider_records
where (service_base_zip is null) <> (service_radius_miles is null);

select convalidated
from pg_constraint
where conrelid = 'public.provider_records'::regclass
  and conname = 'provider_records_mobile_radius_pair';
```

If the count is nonzero, review each affected provider through an authorized
private workflow. Either supply the missing value from verified provider
information or clear both fields. Never infer a radius or base ZIP. Then run:

```sql
alter table public.provider_records
  validate constraint provider_records_mobile_radius_pair;
```

Validation scans only legacy rows and uses PostgreSQL's reduced-lock
`VALIDATE CONSTRAINT` path. Confirm `convalidated` is `true` before considering
the migration complete.

## Rollback requirements

To roll back, promote the reviewed down SQL to a new timestamped migration and
apply it through the same authorized migration runner. Do not paste or execute
it piecemeal in the SQL editor. The rollback refuses to continue when:

- a mobile provider depends only on radius coverage, because the prior location
  constraint cannot represent that row; or
- any provider has a non-null experience value or a nonempty language list,
  because dropping those columns would destroy data.

Before rollback, export affected profile values to an approved secure location
and obtain explicit authorization before clearing them. Radius-only providers
must receive verified explicit ZIP coverage before rollback. The rollback keeps
typed `NULL` profile columns on the public view so grants, options, rules, and
dependent objects remain intact while older application code continues to work.
