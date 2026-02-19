-- Switch FTS from english to simple config for better Arabic support
-- The 'english' config tokenizes for English and poorly handles Arabic.
-- 'simple' does not stem and handles Unicode/Arabic better.

-- Recreate function with 'simple' config
CREATE OR REPLACE FUNCTION listings_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector := 
    setweight(to_tsvector('simple', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('simple', COALESCE(NEW.brand, '')), 'A') ||
    setweight(to_tsvector('simple', COALESCE(NEW.description, '')), 'B') ||
    setweight(to_tsvector('simple', COALESCE(NEW.category, '')), 'B') ||
    setweight(to_tsvector('simple', COALESCE(array_to_string(NEW.tags, ' '), '')), 'C') ||
    setweight(to_tsvector('simple', COALESCE(NEW.serial_number, '')), 'D') ||
    setweight(to_tsvector('simple', COALESCE(NEW.sku, '')), 'D') ||
    setweight(to_tsvector('simple', COALESCE(NEW.product_code, '')), 'D');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Backfill existing rows with simple config
UPDATE listings SET search_vector = 
  setweight(to_tsvector('simple', COALESCE(title, '')), 'A') ||
  setweight(to_tsvector('simple', COALESCE(brand, '')), 'A') ||
  setweight(to_tsvector('simple', COALESCE(description, '')), 'B') ||
  setweight(to_tsvector('simple', COALESCE(category, '')), 'B') ||
  setweight(to_tsvector('simple', COALESCE(array_to_string(tags, ' '), '')), 'C') ||
  setweight(to_tsvector('simple', COALESCE(serial_number, '')), 'D') ||
  setweight(to_tsvector('simple', COALESCE(sku, '')), 'D') ||
  setweight(to_tsvector('simple', COALESCE(product_code, '')), 'D');
