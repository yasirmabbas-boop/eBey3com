CREATE TABLE "buyer_wallet_transactions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"buyer_id" varchar NOT NULL,
	"transaction_id" varchar,
	"type" text NOT NULL,
	"amount" integer NOT NULL,
	"description" text,
	"status" text DEFAULT 'available' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contact_messages" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"subject" text NOT NULL,
	"message" text NOT NULL,
	"is_read" boolean DEFAULT false NOT NULL,
	"replied_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "delivery_orders" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"transaction_id" varchar NOT NULL,
	"external_delivery_id" text,
	"external_tracking_number" text,
	"pickup_address" text NOT NULL,
	"pickup_city" text NOT NULL,
	"pickup_district" text,
	"pickup_phone" text NOT NULL,
	"pickup_contact_name" text NOT NULL,
	"pickup_lat" real,
	"pickup_lng" real,
	"delivery_address" text NOT NULL,
	"delivery_city" text NOT NULL,
	"delivery_district" text,
	"delivery_phone" text NOT NULL,
	"delivery_contact_name" text NOT NULL,
	"delivery_lat" real,
	"delivery_lng" real,
	"cod_amount" integer NOT NULL,
	"shipping_cost" integer DEFAULT 0 NOT NULL,
	"item_description" text,
	"item_weight" real,
	"status" text DEFAULT 'pending' NOT NULL,
	"driver_name" text,
	"driver_phone" text,
	"current_lat" real,
	"current_lng" real,
	"last_location_update" timestamp,
	"estimated_delivery_date" timestamp,
	"actual_delivery_date" timestamp,
	"delivery_proof_url" text,
	"signature_url" text,
	"return_reason" text,
	"cash_collected" boolean DEFAULT false,
	"cash_collected_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "delivery_status_log" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"delivery_order_id" varchar NOT NULL,
	"status" text NOT NULL,
	"status_message" text,
	"latitude" real,
	"longitude" real,
	"driver_notes" text,
	"photo_url" text,
	"received_from_api" boolean DEFAULT true NOT NULL,
	"raw_payload" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "monthly_commission_tracker" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"seller_id" varchar NOT NULL,
	"month" integer NOT NULL,
	"year" integer NOT NULL,
	"sales_count" integer DEFAULT 0 NOT NULL,
	"free_sales_used" integer DEFAULT 0 NOT NULL,
	"commission_paid_sales" integer DEFAULT 0 NOT NULL,
	"total_commission_paid" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"link_url" text,
	"related_id" varchar,
	"is_read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_comments" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"listing_id" varchar NOT NULL,
	"user_id" varchar NOT NULL,
	"content" text NOT NULL,
	"parent_id" varchar,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "push_subscriptions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"endpoint" text NOT NULL,
	"p256dh" text NOT NULL,
	"auth" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "push_subscriptions_endpoint_unique" UNIQUE("endpoint")
);
--> statement-breakpoint
CREATE TABLE "reports" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reporter_id" varchar NOT NULL,
	"report_type" text NOT NULL,
	"target_id" varchar NOT NULL,
	"target_type" text NOT NULL,
	"reason" text NOT NULL,
	"details" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"admin_notes" text,
	"resolved_by" varchar,
	"resolved_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "return_requests" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"transaction_id" varchar NOT NULL,
	"buyer_id" varchar NOT NULL,
	"seller_id" varchar NOT NULL,
	"listing_id" varchar NOT NULL,
	"reason" text NOT NULL,
	"details" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"seller_response" text,
	"responded_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "verification_codes" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"phone" text NOT NULL,
	"code" text NOT NULL,
	"type" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"used_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wallet_transactions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"seller_id" varchar NOT NULL,
	"transaction_id" varchar,
	"type" text NOT NULL,
	"amount" integer NOT NULL,
	"description" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"hold_until" timestamp,
	"weekly_payout_id" varchar,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"available_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "weekly_payouts" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"seller_id" varchar NOT NULL,
	"week_start_date" timestamp NOT NULL,
	"week_end_date" timestamp NOT NULL,
	"total_earnings" integer DEFAULT 0 NOT NULL,
	"total_commission" integer DEFAULT 0 NOT NULL,
	"total_shipping" integer DEFAULT 0 NOT NULL,
	"total_returns" integer DEFAULT 0 NOT NULL,
	"net_payout" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"payment_method" text,
	"payment_reference" text,
	"paid_at" timestamp,
	"paid_by" varchar,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "auth_provider" SET DEFAULT 'phone';--> statement-breakpoint
ALTER TABLE "bids" ADD COLUMN "shipping_address_id" varchar;--> statement-breakpoint
ALTER TABLE "buyer_addresses" ADD COLUMN "latitude" real;--> statement-breakpoint
ALTER TABLE "buyer_addresses" ADD COLUMN "longitude" real;--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "highest_bidder_id" varchar;--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "reserve_price" integer;--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "buy_now_price" integer;--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "shipping_cost" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "shipping_type" text DEFAULT 'seller_pays';--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "international_shipping" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "international_countries" text[] DEFAULT ARRAY[]::text[];--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "area" text;--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "sku" text;--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "is_exchangeable" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "tags" text[] DEFAULT ARRAY[]::text[];--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "removed_by_admin" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "removal_reason" text;--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "is_deleted" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "deleted_at" timestamp;--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "is_featured" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "featured_order" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "featured_at" timestamp;--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "allowed_bidder_type" text DEFAULT 'verified_only' NOT NULL;--> statement-breakpoint
ALTER TABLE "listings" ADD COLUMN "search_vector" text;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "buyer_rating" integer;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "buyer_feedback" text;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "issue_type" text;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "issue_note" text;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "cancelled_by_seller" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "cancelled_by_buyer" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "cancellation_reason" text;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "cancelled_at" timestamp;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "is_admin" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "is_trusted" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "is_authenticated" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "authenticity_guaranteed" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "total_purchases" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "is_banned" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "ban_reason" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "banned_at" timestamp;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "seller_approved" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "seller_request_status" text DEFAULT 'none';--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "seller_request_date" timestamp;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "seller_approval_date" timestamp;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "buyer_rating" real DEFAULT 0;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "buyer_rating_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "map_url" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "gender" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "auth_token" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "facebook_id" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "facebook_long_lived_token" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "phone_verified" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "bidding_limit" integer DEFAULT 100000 NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "completed_purchases" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE INDEX "listings_removed_by_admin_idx" ON "listings" USING btree ("removed_by_admin");--> statement-breakpoint
CREATE INDEX "listings_category_idx" ON "listings" USING btree ("category");--> statement-breakpoint
CREATE INDEX "users_phone_idx" ON "users" USING btree ("phone");--> statement-breakpoint
CREATE INDEX "users_facebook_id_idx" ON "users" USING btree ("facebook_id");--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_phone_unique" UNIQUE("phone");--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_facebook_id_unique" UNIQUE("facebook_id");