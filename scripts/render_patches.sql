-- Drop problematic FK constraint on table_id (business logic handles validation)
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_table_id_fkey;
