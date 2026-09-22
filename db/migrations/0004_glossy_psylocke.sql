CREATE TABLE "step_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid NOT NULL,
	"day" timestamp with time zone NOT NULL,
	"steps" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "challenges" ADD COLUMN "data_source" text DEFAULT 'strava' NOT NULL;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "google_health_user_id" text;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "google_health_access_token" text;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "google_health_refresh_token" text;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "google_health_token_expires_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "step_entries" ADD CONSTRAINT "step_entries_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "step_entries_profile_day_idx" ON "step_entries" USING btree ("profile_id","day");--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_google_health_user_id_unique" UNIQUE("google_health_user_id");