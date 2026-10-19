-- Up Migration
CREATE TABLE app.lead_items (
  lead_id uuid NOT NULL REFERENCES app.leads(id) ON DELETE CASCADE,
  product_id text NOT NULL CHECK (product_id IN (
    'ethiopia-yirgacheffe', 'colombia-huila', 'brazil-cerrado', 'drip-assortment'
  )),
  quantity smallint NOT NULL CHECK (quantity BETWEEN 1 AND 99),
  unit_price_kopecks integer NOT NULL CHECK (unit_price_kopecks > 0),
  total_price_kopecks integer GENERATED ALWAYS AS (quantity * unit_price_kopecks) STORED,
  PRIMARY KEY (lead_id, product_id)
);

-- Preserve accepted snapshots exactly, including prices predating the current catalog.
INSERT INTO app.lead_items (lead_id, product_id, quantity, unit_price_kopecks)
SELECT id, product_id, quantity, unit_price_kopecks FROM app.leads
WHERE product_id IN ('ethiopia-yirgacheffe', 'colombia-huila', 'brazil-cerrado', 'drip-assortment');

-- Down Migration
-- Older applications cannot represent multiple lines. Refuse to silently discard them.
LOCK TABLE app.lead_items IN ACCESS EXCLUSIVE MODE;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM app.lead_items GROUP BY lead_id HAVING count(*) > 1) THEN
    RAISE EXCEPTION 'Cannot roll back lead items while multi-item leads exist';
  END IF;
END $$;

-- Project canonical singleton snapshots before removing the additive table.
UPDATE app.leads l SET product_id = i.product_id, quantity = i.quantity, unit_price_kopecks = i.unit_price_kopecks
FROM app.lead_items i WHERE i.lead_id = l.id;

DROP TABLE app.lead_items;
