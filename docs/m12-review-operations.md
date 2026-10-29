# M12 review operations

M12 remains inactive until its migration is reviewed and applied through the
authorized Supabase migration runner. Do not paste the migration piecemeal.

## Production prerequisites

Configure these server-only values in the Production environment without
placing their values in source control:

- `RESEND_API_KEY`
- `REVIEW_EMAIL_FROM`, using a sender on a verified Resend domain
- `REVIEW_ABUSE_HASH_KEY`, generated from at least 32 random bytes

`NEXT_PUBLIC_SITE_URL` must be the final HTTPS origin so verification links do
not point to a preview deployment. Until all values exist, the review action
fails closed before creating a review and never claims that email was sent.

## Security model

The browser cannot write review tables or invoke review RPCs. The application
server validates input, creates a random 256-bit token, stores only its SHA-256
hash, and HMAC-hashes email/IP rate-limit identifiers. The database then
enforces active-provider eligibility, one review per provider/email, five
attempts per IP per hour, and three attempts per email per day.

On Vercel, the rate-limit identity accepts only one syntactically valid address
from Vercel's overwritten `x-vercel-forwarded-for` header. Ordinary
`x-forwarded-for` is ignored. Non-Vercel, missing, malformed, and proxy-chain
inputs use one conservative shared bucket. Per-identity advisory transaction
locks serialize the database check and counter insert.

Opening the email link does not consume it. The reviewer explicitly submits the
verification page, and the database atomically checks expiry and prior use.
Verified reviews remain private until an allow-listed Supabase Auth administrator
records an approval and private reason. Email verification is never described as
purchase, repair, or service verification.

The email URL carries its token in the fragment, which browsers do not send in
the HTTP request. The verification page removes the fragment immediately and
sets a `no-referrer` policy before the reviewer submits the token.

Moderation uses a two-step authorization contract. The authenticated admin
session inserts a two-minute, RLS-bound nonce for its own `auth.uid()`. The
service-role moderation RPC consumes that nonce once, derives attribution from
it, and re-checks that the allowlist row is still enabled. The RPC never accepts
an administrator ID from its caller.

## Delivery recovery

A submission succeeds only after the email provider accepts the message and the
database marks that exact token as sent. Provider rejection, mark failure, and
cleanup failure never produce a success response. Unsent or expired
`pending-email` state can be replaced atomically under the same advisory locks,
which invalidates the older token and permits a legitimate retry. A sent,
unexpired token remains protected by duplicate enforcement. Resend receives an
idempotency key derived from the token hash.

## Rollback

Promote the reviewed down SQL to a new timestamped migration. It aborts while
review rows exist. Before rollback, export private review and moderation data to
an approved secure location, obtain explicit authorization, and remove it with a
separate reviewed data migration. The rollback can then remove the empty review
tables, functions, views, and enum without touching provider records.
