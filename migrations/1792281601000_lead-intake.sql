-- Up Migration
CREATE TABLE app.leads (
  id uuid PRIMARY KEY,
  accepted_at timestamptz NOT NULL,
  name text NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 100),
  phone text NOT NULL CHECK (phone ~ '^\+375[0-9]{9}$'),
  interest text NOT NULL CHECK (interest IN ('subscription', 'one-time', 'question')),
  comment text CHECK (char_length(comment) <= 2000),
  product_id text CHECK (product_id IN (
    'ethiopia-yirgacheffe', 'colombia-huila', 'brazil-cerrado', 'drip-assortment', 'subscription'
  )),
  attribution jsonb NOT NULL DEFAULT '{}'::jsonb
    CHECK (jsonb_typeof(attribution) = 'object' AND octet_length(attribution::text) <= 16384),
  CHECK (product_id IS NULL OR interest = 'question'
    OR (product_id = 'subscription' AND interest = 'subscription')
    OR (product_id <> 'subscription' AND interest = 'one-time'))
);
CREATE INDEX leads_phone_accepted_at_idx ON app.leads (phone, accepted_at DESC);

CREATE TABLE app.notification_outbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL UNIQUE REFERENCES app.leads(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'sent', 'failed')),
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  created_at timestamptz NOT NULL,
  next_attempt_at timestamptz NOT NULL,
  locked_until timestamptz,
  lock_token uuid,
  sent_at timestamptz,
  last_error text CHECK (char_length(last_error) <= 500),
  CHECK ((status = 'processing' AND locked_until IS NOT NULL AND lock_token IS NOT NULL)
    OR (status <> 'processing' AND locked_until IS NULL AND lock_token IS NULL)),
  CHECK ((status = 'sent' AND sent_at IS NOT NULL) OR (status <> 'sent' AND sent_at IS NULL))
);
CREATE INDEX notification_outbox_pending_idx ON app.notification_outbox (next_attempt_at, created_at)
  WHERE status = 'pending';
CREATE INDEX notification_outbox_processing_idx ON app.notification_outbox (locked_until)
  WHERE status = 'processing';

-- Down Migration
DROP TABLE app.notification_outbox;
DROP TABLE app.leads;
