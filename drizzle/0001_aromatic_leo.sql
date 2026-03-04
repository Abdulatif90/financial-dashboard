ALTER TABLE "accounts" ADD COLUMN "plaid_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN "user_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "accounts" DROP COLUMN "user.id";