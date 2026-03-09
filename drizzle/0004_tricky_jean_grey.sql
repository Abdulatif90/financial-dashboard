CREATE TABLE "connected_banks" (
	"id" text PRIMARY KEY NOT NULL,
	"plaid_id" text NOT NULL,
	"institution_name" text NOT NULL,
	"user_id" text NOT NULL
);
