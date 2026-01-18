ALTER TABLE transactions
ADD COLUMN cancelled_by_buyer boolean DEFAULT false;
