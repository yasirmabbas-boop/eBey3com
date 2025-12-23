CREATE TABLE "analytics" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar,
	"session_id" text NOT NULL,
	"event_type" text NOT NULL,
	"event_data" text,
	"listing_id" varchar,
	"category" text,
	"search_query" text,
	"page_url" text,
	"referrer" text,
	"device_type" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bids" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"listing_id" varchar NOT NULL,
	"user_id" varchar NOT NULL,
	"amount" integer NOT NULL,
	"is_winning" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "buyer_addresses" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"label" text NOT NULL,
	"recipient_name" text NOT NULL,
	"phone" text NOT NULL,
	"city" text NOT NULL,
	"district" text,
	"address_line_1" text NOT NULL,
	"address_line_2" text,
	"notes" text,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cart_items" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"listing_id" varchar NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"price_snapshot" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"name_ar" text NOT NULL,
	"icon" text,
	"parent_id" varchar,
	"order" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "categories_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "listings" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_code" text,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"price" integer NOT NULL,
	"category" text NOT NULL,
	"condition" text NOT NULL,
	"brand" text,
	"images" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"sale_type" text DEFAULT 'fixed' NOT NULL,
	"current_bid" integer,
	"total_bids" integer DEFAULT 0,
	"time_left" text,
	"auction_start_time" timestamp,
	"auction_end_time" timestamp,
	"delivery_window" text NOT NULL,
	"return_policy" text NOT NULL,
	"return_details" text,
	"seller_name" text NOT NULL,
	"seller_id" varchar,
	"city" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_paused" boolean DEFAULT false NOT NULL,
	"is_negotiable" boolean DEFAULT false NOT NULL,
	"serial_number" text,
	"quantity_available" integer DEFAULT 1 NOT NULL,
	"quantity_sold" integer DEFAULT 0 NOT NULL,
	"views" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "listings_product_code_unique" UNIQUE("product_code")
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sender_id" varchar NOT NULL,
	"receiver_id" varchar NOT NULL,
	"listing_id" varchar,
	"content" text NOT NULL,
	"is_read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "offers" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"listing_id" varchar NOT NULL,
	"buyer_id" varchar NOT NULL,
	"seller_id" varchar NOT NULL,
	"offer_amount" integer NOT NULL,
	"message" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"counter_amount" integer,
	"counter_message" text,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"responded_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "reviews" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reviewer_id" varchar NOT NULL,
	"seller_id" varchar NOT NULL,
	"listing_id" varchar NOT NULL,
	"rating" integer NOT NULL,
	"comment" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"listing_id" varchar NOT NULL,
	"seller_id" varchar NOT NULL,
	"buyer_id" varchar NOT NULL,
	"amount" integer NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"payment_method" text DEFAULT 'cash',
	"delivery_address" text,
	"delivery_phone" text,
	"delivery_city" text,
	"delivery_status" text DEFAULT 'pending',
	"tracking_number" text,
	"shipped_at" timestamp,
	"tracking_available_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_code" text,
	"username" text,
	"email" text,
	"password" text,
	"display_name" text NOT NULL,
	"avatar" text,
	"role" text DEFAULT 'user' NOT NULL,
	"account_type" text DEFAULT 'buyer' NOT NULL,
	"is_verified" boolean DEFAULT false NOT NULL,
	"id_document_url" text,
	"verification_status" text DEFAULT 'pending',
	"total_sales" integer DEFAULT 0 NOT NULL,
	"rating" real DEFAULT 0,
	"rating_count" integer DEFAULT 0 NOT NULL,
	"auth_provider" text DEFAULT 'email',
	"auth_provider_id" text,
	"two_factor_enabled" boolean DEFAULT false NOT NULL,
	"two_factor_secret" text,
	"city" text,
	"address_line_1" text,
	"address_line_2" text,
	"district" text,
	"location_lat" real,
	"location_lng" real,
	"phone" text,
	"age_bracket" text,
	"interests" text[],
	"survey_completed" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"last_login_at" timestamp,
	CONSTRAINT "users_account_code_unique" UNIQUE("account_code"),
	CONSTRAINT "users_username_unique" UNIQUE("username"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "watchlist" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"listing_id" varchar NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"sid" varchar PRIMARY KEY NOT NULL,
	"sess" jsonb NOT NULL,
	"expire" timestamp NOT NULL
);
--> statement-breakpoint
CREATE INDEX "IDX_session_expire" ON "sessions" USING btree ("expire");