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

Opening the email link does not consume it. The reviewer explicitly submits the
verification page, and the database atomically checks expiry and prior use.
Verified reviews remain private until an allow-listed Supabase Auth administrator
records an approval and private reason. Email verification is never described as
purchase, repair, or service verification.

## Rollback

Promote the reviewed down SQL to a new timestamped migration. It aborts while
review rows exist. Before rollback, export private review and moderation data to
an approved secure location, obtain explicit authorization, and remove it with a
separate reviewed data migration. The rollback can then remove the empty review
tables, functions, views, and enum without touching provider records.
