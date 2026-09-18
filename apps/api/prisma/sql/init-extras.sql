-- Grovia — schema guarantees Prisma cannot express.
--
-- Append this file to the end of the generated init migration:
--     cat prisma/sql/init-extras.sql >> prisma/migrations/*_init/migration.sql
--
-- Everything here is part of the schema, not an optimisation. The application
-- is written assuming these constraints hold; without them, concurrent
-- checkouts oversell and the search endpoint has nothing to query.

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ── Full-text search ────────────────────────────────────────────────────────
-- Prisma creates "searchVector" as a plain nullable tsvector. Replace it with a
-- STORED generated column so it can never drift from the row it describes and
-- the application never has to remember to update it.
ALTER TABLE "Product" DROP COLUMN IF EXISTS "searchVector";
ALTER TABLE "Product"
  ADD COLUMN "searchVector" tsvector GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce("name", '')), 'A') ||
    setweight(to_tsvector('english', coalesce("brand", '')), 'B') ||
    setweight(to_tsvector('english', coalesce("description", '')), 'C')
  ) STORED;

CREATE INDEX "Product_searchVector_idx" ON "Product" USING GIN ("searchVector");

-- Trigram indexes give typo tolerance ("tomatto" -> "Tomato"), which plain FTS
-- cannot do. Use word_similarity() (the %> operator), not similarity():
-- similarity() scores the whole string, so "panner" against "Fresh Paneer"
-- scores 0.250 and is missed, while word_similarity() scores 0.429 and hits.
-- Measured against the seed catalog, 0.42 is the threshold that keeps the real
-- matches and drops the noise:
--     SET pg_trgm.word_similarity_threshold = 0.42;
CREATE INDEX "Product_name_trgm_idx"  ON "Product" USING GIN ("name" gin_trgm_ops);
CREATE INDEX "Product_brand_trgm_idx" ON "Product" USING GIN ("brand" gin_trgm_ops);

-- ── Price integrity ─────────────────────────────────────────────────────────
-- pricePaise is denormalised so it can be sorted and range-filtered on an
-- index. This CHECK is what makes the denormalisation safe: a service that
-- forgets to recompute it cannot commit. round() on numeric is half-away-from-
-- zero, which matches JS Math.round for the non-negative values we store.
ALTER TABLE "Product"
  ADD CONSTRAINT "Product_price_consistent_chk" CHECK (
    "mrpPaise" >= 0
    AND "discountPercent" BETWEEN 0 AND 100
    AND "pricePaise" = ("mrpPaise" - round(("mrpPaise"::numeric * "discountPercent") / 100))::int
  );

-- ── Inventory integrity ─────────────────────────────────────────────────────
-- Last line of defence behind the conditional UPDATE in the reservation
-- service. If this ever fires, something bypassed inventory.service.ts.
ALTER TABLE "Inventory"
  ADD CONSTRAINT "Inventory_non_negative_chk" CHECK (
    "stock" >= 0 AND "reserved" >= 0 AND "reserved" <= "stock"
  );

-- ── One default address per user ────────────────────────────────────────────
-- Partial unique: soft-deleted rows are excluded, so deleting a default and
-- setting a new one does not deadlock on the index.
CREATE UNIQUE INDEX "Address_one_default_per_user_idx"
  ON "Address" ("userId")
  WHERE "isDefault" AND "deletedAt" IS NULL;

-- ── One live payment attempt per order ──────────────────────────────────────
-- Terminal attempts (SUCCESS/FAILED/CANCELLED/EXPIRED) are unlimited so retries
-- can create new rows, but two simultaneously open attempts are impossible.
CREATE UNIQUE INDEX "Payment_one_open_attempt_idx"
  ON "Payment" ("orderId")
  WHERE "status" IN ('CREATED', 'PENDING');

-- ── Value ranges ────────────────────────────────────────────────────────────
ALTER TABLE "Review"
  ADD CONSTRAINT "Review_rating_range_chk" CHECK ("rating" BETWEEN 1 AND 5);

ALTER TABLE "CartItem"
  ADD CONSTRAINT "CartItem_quantity_positive_chk" CHECK ("quantity" > 0);

ALTER TABLE "OrderItem"
  ADD CONSTRAINT "OrderItem_quantity_positive_chk" CHECK ("quantity" > 0);

ALTER TABLE "OrderItem"
  ADD CONSTRAINT "OrderItem_line_total_chk" CHECK (
    "unitPricePaise" >= 0
    AND "discountPaise" >= 0
    AND "lineTotalPaise" = ("unitPricePaise" - "discountPaise") * "quantity"
  );

ALTER TABLE "Order"
  ADD CONSTRAINT "Order_total_chk" CHECK (
    "subtotalPaise" >= 0
    AND "discountPaise" >= 0
    AND "deliveryFeePaise" >= 0
    AND "taxPaise" >= 0
    AND "totalPaise" = "subtotalPaise" - "discountPaise" + "deliveryFeePaise" + "taxPaise"
    AND "totalPaise" >= 0
  );

ALTER TABLE "SlotInstance"
  ADD CONSTRAINT "SlotInstance_capacity_chk" CHECK (
    "capacity" >= 0 AND "booked" >= 0 AND "booked" <= "capacity"
  );

ALTER TABLE "SlotTemplate"
  ADD CONSTRAINT "SlotTemplate_window_chk" CHECK (
    "startMinute" >= 0 AND "endMinute" <= 1440 AND "startMinute" < "endMinute"
  );

ALTER TABLE "Coupon"
  ADD CONSTRAINT "Coupon_value_chk" CHECK (
    "value" > 0
    AND ("discountType" <> 'PERCENT' OR "value" <= 100)
    AND "minOrderPaise" >= 0
    AND "expiresAt" > "startsAt"
  );

-- ── Human-facing order numbers ──────────────────────────────────────────────
-- GRV-YYMM-00001. The service reads nextval() inside the checkout transaction;
-- a sequence is used rather than count(*) so concurrent checkouts cannot
-- collide, and gaps from rolled-back transactions are acceptable.
CREATE SEQUENCE IF NOT EXISTS grovia_order_number_seq START 1;
