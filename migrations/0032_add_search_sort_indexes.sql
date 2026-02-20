-- Add indexes for server-side search sorting.
CREATE INDEX IF NOT EXISTS listings_price_idx ON listings(price);
CREATE INDEX IF NOT EXISTS listings_views_idx ON listings(views);
CREATE INDEX IF NOT EXISTS listings_total_bids_idx ON listings(total_bids);
CREATE INDEX IF NOT EXISTS listings_auction_end_time_idx ON listings(auction_end_time);
CREATE INDEX IF NOT EXISTS listings_created_at_idx ON listings(created_at DESC);
