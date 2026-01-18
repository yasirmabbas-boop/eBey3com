-- Enable pg_trgm extension for fuzzy matching
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Add search_vector column to listings table for full-text search
ALTER TABLE "listings" ADD COLUMN IF NOT EXISTS "search_vector" tsvector;

-- Create function to update search_vector
CREATE OR REPLACE FUNCTION listings_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector := 
    setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.brand, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(NEW.category, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(array_to_string(NEW.tags, ' '), '')), 'C') ||
    setweight(to_tsvector('english', COALESCE(NEW.serial_number, '')), 'D') ||
    setweight(to_tsvector('english', COALESCE(NEW.sku, '')), 'D') ||
    setweight(to_tsvector('english', COALESCE(NEW.product_code, '')), 'D');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update search_vector on INSERT or UPDATE
DROP TRIGGER IF EXISTS listings_search_vector_trigger ON listings;
CREATE TRIGGER listings_search_vector_trigger
  BEFORE INSERT OR UPDATE ON listings
  FOR EACH ROW
  EXECUTE FUNCTION listings_search_vector_update();

-- Create GIN index on search_vector for fast full-text search
CREATE INDEX IF NOT EXISTS listings_search_vector_idx ON listings USING GIN(search_vector);

-- Create GIN index on title for trigram fuzzy matching
CREATE INDEX IF NOT EXISTS listings_title_trgm_idx ON listings USING GIN(title gin_trgm_ops);

-- Create GIN index on brand for trigram fuzzy matching
CREATE INDEX IF NOT EXISTS listings_brand_trgm_idx ON listings USING GIN(brand gin_trgm_ops);

-- Create GIN index on description for trigram fuzzy matching
CREATE INDEX IF NOT EXISTS listings_description_trgm_idx ON listings USING GIN(description gin_trgm_ops);

-- Update existing rows to populate search_vector
UPDATE listings SET search_vector = 
  setweight(to_tsvector('english', COALESCE(title, '')), 'A') ||
  setweight(to_tsvector('english', COALESCE(brand, '')), 'A') ||
  setweight(to_tsvector('english', COALESCE(description, '')), 'B') ||
  setweight(to_tsvector('english', COALESCE(category, '')), 'B') ||
  setweight(to_tsvector('english', COALESCE(array_to_string(tags, ' '), '')), 'C') ||
  setweight(to_tsvector('english', COALESCE(serial_number, '')), 'D') ||
  setweight(to_tsvector('english', COALESCE(sku, '')), 'D') ||
  setweight(to_tsvector('english', COALESCE(product_code, '')), 'D')
WHERE search_vector IS NULL;
