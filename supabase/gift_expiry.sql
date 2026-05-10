-- Add expires_at to gifts table
ALTER TABLE gifts ADD COLUMN IF NOT EXISTS expires_at timestamptz NULL;

-- Add distribution type to gifts table ('even' = equal share, 'random' = hongbao-style)
ALTER TABLE gifts ADD COLUMN IF NOT EXISTS distribution text NOT NULL DEFAULT 'even';

-- Add label column to friends table (used for Feature 7)
ALTER TABLE friends ADD COLUMN IF NOT EXISTS label text NULL;

-- recurring_executions table (used for Feature 5)
CREATE TABLE IF NOT EXISTS recurring_executions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recurring_payment_id uuid NOT NULL REFERENCES recurring_payments(id) ON DELETE CASCADE,
  executed_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL CHECK (status IN ('success', 'failed')),
  tx_signature text NULL,
  error text NULL
);

-- cron_runs table (used for Feature 8)
CREATE TABLE IF NOT EXISTS cron_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ran_at timestamptz NOT NULL DEFAULT now(),
  payments_attempted integer NOT NULL DEFAULT 0,
  payments_succeeded integer NOT NULL DEFAULT 0,
  payments_failed integer NOT NULL DEFAULT 0,
  duration_ms integer NULL
);
