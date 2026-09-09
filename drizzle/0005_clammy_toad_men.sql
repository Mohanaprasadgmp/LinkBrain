CREATE TYPE "public"."ai_processing_status" AS ENUM('pending', 'processing', 'completed', 'failed');--> statement-breakpoint
CREATE TABLE "link_ai_insights" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"link_id" uuid NOT NULL,
	"processing_status" "ai_processing_status" DEFAULT 'pending' NOT NULL,
	"summary" text,
	"category" text,
	"topics" text[],
	"key_points" text[],
	"content_type" text,
	"model" text,
	"prompt_version" integer,
	"error_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "link_ai_insights_link_id_unique" UNIQUE("link_id")
);
--> statement-breakpoint
ALTER TABLE "link_ai_insights" ADD CONSTRAINT "link_ai_insights_link_id_links_id_fk" FOREIGN KEY ("link_id") REFERENCES "public"."links"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "link_ai_insights_processing_status_idx" ON "link_ai_insights" USING btree ("processing_status");