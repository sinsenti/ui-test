-- Up Migration
ALTER TABLE app.leads
  ADD COLUMN quantity smallint,
  ADD COLUMN unit_price_kopecks integer,
  ADD COLUMN total_price_kopecks integer GENERATED ALWAYS AS (quantity * unit_price_kopecks) STORED;

-- Legacy product leads did not record quantity. Treat each as one package at
-- the catalog price in effect before this migration; other contexts stay null.
UPDATE app.leads SET quantity = 1, unit_price_kopecks = CASE product_id
  WHEN 'ethiopia-yirgacheffe' THEN 3200
  WHEN 'colombia-huila' THEN 2900
  WHEN 'brazil-cerrado' THEN 2600
  WHEN 'drip-assortment' THEN 1800
END
WHERE product_id IN ('ethiopia-yirgacheffe', 'colombia-huila', 'brazil-cerrado', 'drip-assortment');

ALTER TABLE app.leads ADD CONSTRAINT leads_quantity_price_check CHECK (
  CASE WHEN product_id IN ('ethiopia-yirgacheffe', 'colombia-huila', 'brazil-cerrado', 'drip-assortment')
    THEN quantity IS NOT NULL AND quantity BETWEEN 1 AND 99
      AND unit_price_kopecks IS NOT NULL AND unit_price_kopecks > 0
    ELSE quantity IS NULL AND unit_price_kopecks IS NULL
  END
);

-- Down Migration
ALTER TABLE app.leads
  DROP CONSTRAINT leads_quantity_price_check,
  DROP COLUMN total_price_kopecks,
  DROP COLUMN unit_price_kopecks,
  DROP COLUMN quantity;
