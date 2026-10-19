# Scheduled selling prices

Activated in Supabase project `vojwfupyoathhvujwaqh` on 19 October 2026.
The `process-price-changes` Edge Function and `apply-scheduled-prices` Cron job
are live; an automatic run returned HTTP 200. The initial Dynafish Xiaonian
change from ₹10,499 to ₹11,999 is pending for 23 October 2026, 00:00 IST.
The admin frontend still needs its normal application deployment.

Admin Dashboard → **Scheduled Prices** (`/admin/price-schedules`). Search for a
product, enter the new price, and choose its effective date/time in **IST**.
One pending change is allowed per product. Use **Edit** in its history row to
change its new price or effective time. Applied, cancelled and failed rows are read-only.
Editing preserves the original price snapshot used for conflict detection.
Every product's price-increase strip follows its saved schedule automatically.
It uses the saved old/new prices and effective time, hides for price decreases
or unchanged prices, and disappears when the schedule is cancelled or fails.
Refresh the history to see the current outcome.

Each change sets the same selling price across the product, all size rows,
non-null colour prices, and an existing pre-order price. It leaves retail prices,
stock, shipping, and existing orders unchanged. Changes are atomic; a failed
update rolls back every price write and records the error. If prices or size rows
changed after scheduling, the schedule fails instead of overwriting those edits.
Review a failed schedule and create a replacement after resolving the cause.

## Deployment

1. Apply `20261019064914_scheduled_price_changes.sql`.
2. With approval to enable `pg_cron` and `pg_net`, apply
   `20261019064924_price_scheduler_cron.sql`.
   Also apply `20261019072246_edit_pending_price_schedules.sql` to enable edits
   and synchronise the public product announcement.
3. Deploy `functions/process-price-changes/index.ts` as `process-price-changes`
   with gateway JWT verification disabled. The function performs its own
   authentication: a random Vault token must match before the restricted,
   service-role-only database worker can run. No worker secret belongs in the UI.
4. As the database owner, configure the deployed URL:

   ```sql
   SELECT pricing_private.configure_scheduler(
     'https://YOUR_PROJECT_REF.supabase.co/functions/v1/process-price-changes'
   );
   ```

   This creates two Vault secrets and one idempotent Cron job, running every
   minute. Re-running setup preserves the token and updates the worker URL.
5. Verify the active `apply-scheduled-prices` job in Supabase Cron and inspect
   its run history plus Edge Function logs. An HTTP error leaves schedules
   pending for the next run. The admin history flags pending changes overdue
   by more than two minutes; the backend processes up to 25 due changes per run.
6. Deploy the frontend. Create the desired price change in the admin page;
   deploying the feature does not itself create a Dynafish schedule.

To pause processing, deactivate `apply-scheduled-prices` in Supabase Cron.
Pending changes catch up when the job resumes. A pending change can be cancelled
until the worker starts applying it; cancelling after execution cannot undo it.

## Validation

```sh
node --test supabase/tests/process_price_changes.test.mjs
python3 supabase/tests/build_price_schedule_test.py > /tmp/price-schedule-test.sql
python3 supabase/tests/build_price_cron_test.py > /tmp/price-cron-test.sql
```

Execute the generated SQL with a PostgreSQL connection supporting Supabase roles
and `auth.uid()`. Both scripts use temporary fixtures and roll back. The schedule
tests cover role restrictions, cancellation, immutable history, duplicate and
past-date rejection, conflict detection, atomic rollback, future dates and
idempotence. The Cron tests mock Vault, job creation and HTTP calls, and never
enable extensions or send network requests.
