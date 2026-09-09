ALTER TABLE "tags" DROP CONSTRAINT "tags_slug_unique";--> statement-breakpoint
ALTER TABLE "links" ADD COLUMN "user_id" text;--> statement-breakpoint
ALTER TABLE "projects" ADD COLUMN "user_id" text;--> statement-breakpoint
ALTER TABLE "tags" ADD COLUMN "user_id" text;--> statement-breakpoint
ALTER TABLE "links" ADD CONSTRAINT "links_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tags" ADD CONSTRAINT "tags_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "links_user_id_idx" ON "links" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "projects_user_id_idx" ON "projects" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "tags_user_id_idx" ON "tags" USING btree ("user_id");