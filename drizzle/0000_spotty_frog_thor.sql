CREATE TYPE "public"."link_priority" AS ENUM('must-read', 'useful', 'maybe-later', 'reference');--> statement-breakpoint
CREATE TYPE "public"."link_status" AS ENUM('saved', 'reading', 'read', 'archived');--> statement-breakpoint
CREATE TABLE "links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"url" text NOT NULL,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"domain" text NOT NULL,
	"favicon" text,
	"preview_image" text,
	"personal_note" text DEFAULT '' NOT NULL,
	"status" "link_status" DEFAULT 'saved' NOT NULL,
	"priority" "link_priority" DEFAULT 'useful' NOT NULL,
	"is_favorite" boolean DEFAULT false NOT NULL,
	"project_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"archived_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "link_tags" (
	"link_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	CONSTRAINT "link_tags_link_id_tag_id_pk" PRIMARY KEY("link_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tags_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "links" ADD CONSTRAINT "links_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "link_tags" ADD CONSTRAINT "link_tags_link_id_links_id_fk" FOREIGN KEY ("link_id") REFERENCES "public"."links"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "link_tags" ADD CONSTRAINT "link_tags_tag_id_tags_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tags"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "links_created_at_idx" ON "links" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "links_status_idx" ON "links" USING btree ("status");--> statement-breakpoint
CREATE INDEX "links_priority_idx" ON "links" USING btree ("priority");--> statement-breakpoint
CREATE INDEX "links_is_favorite_idx" ON "links" USING btree ("is_favorite");--> statement-breakpoint
CREATE INDEX "links_domain_idx" ON "links" USING btree ("domain");--> statement-breakpoint
CREATE INDEX "links_archived_at_idx" ON "links" USING btree ("archived_at");--> statement-breakpoint
CREATE INDEX "links_project_id_idx" ON "links" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "link_tags_tag_id_idx" ON "link_tags" USING btree ("tag_id");