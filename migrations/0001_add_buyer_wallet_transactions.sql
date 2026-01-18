CREATE TABLE buyer_wallet_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id varchar NOT NULL,
  transaction_id varchar,
  type text NOT NULL,
  amount integer NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'available',
  created_at timestamp NOT NULL DEFAULT now()
);
