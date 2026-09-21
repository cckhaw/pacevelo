CREATE TABLE "login_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid NOT NULL,
	"role" text NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "onboarding_codes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"challenge_limit" integer,
	"used_by_company_id" uuid,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "onboarding_codes_code_unique" UNIQUE("code")
);
--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "challenge_limit" integer;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "expires_at" timestamp with time zone DEFAULT now() + interval '90 days' NOT NULL;--> statement-breakpoint
ALTER TABLE "login_events" ADD CONSTRAINT "login_events_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "onboarding_codes" ADD CONSTRAINT "onboarding_codes_used_by_company_id_companies_id_fk" FOREIGN KEY ("used_by_company_id") REFERENCES "public"."companies"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "login_events_profile_idx" ON "login_events" USING btree ("profile_id");--> statement-breakpoint
CREATE INDEX "login_events_occurred_at_idx" ON "login_events" USING btree ("occurred_at");