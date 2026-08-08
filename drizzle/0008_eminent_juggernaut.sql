ALTER TABLE "connected_banks" ADD COLUMN "item_id" text NOT NULL;--> statement-breakpoint
CREATE INDEX "connected_banks_user_id_idx" ON "connected_banks" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "connected_banks_item_id_unique_idx" ON "connected_banks" USING btree ("item_id");