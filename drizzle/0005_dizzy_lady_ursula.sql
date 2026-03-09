ALTER TABLE "connected_banks" ADD COLUMN "access_token" text NOT NULL;--> statement-breakpoint
ALTER TABLE "connected_banks" DROP COLUMN "plaid_id";--> statement-breakpoint
ALTER TABLE "connected_banks" DROP COLUMN "institution_name";