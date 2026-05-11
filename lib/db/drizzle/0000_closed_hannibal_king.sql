CREATE TABLE "subdomains" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"webhook_secret" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "subdomains_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "emails" (
	"id" serial PRIMARY KEY NOT NULL,
	"subdomain_id" integer NOT NULL,
	"address_id" integer,
	"from_address" text NOT NULL,
	"to_address" text NOT NULL,
	"subject" text DEFAULT '(No Subject)' NOT NULL,
	"body_text" text DEFAULT '' NOT NULL,
	"body_html" text,
	"is_read" boolean DEFAULT false NOT NULL,
	"received_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "addresses" (
	"id" serial PRIMARY KEY NOT NULL,
	"local_part" text NOT NULL,
	"domain" text NOT NULL,
	"subdomain_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "emails" ADD CONSTRAINT "emails_subdomain_id_subdomains_id_fk" FOREIGN KEY ("subdomain_id") REFERENCES "public"."subdomains"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "emails" ADD CONSTRAINT "emails_address_id_addresses_id_fk" FOREIGN KEY ("address_id") REFERENCES "public"."addresses"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "addresses" ADD CONSTRAINT "addresses_subdomain_id_subdomains_id_fk" FOREIGN KEY ("subdomain_id") REFERENCES "public"."subdomains"("id") ON DELETE cascade ON UPDATE no action;