ALTER TABLE "profiles" ADD COLUMN "device_sync_token" text;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_device_sync_token_unique" UNIQUE("device_sync_token");