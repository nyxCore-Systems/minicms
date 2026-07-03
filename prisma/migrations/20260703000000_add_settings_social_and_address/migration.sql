-- Wave 2 SEO: editable social profiles + structured venue/contact address.
-- Both nullable JSONB, no default — existing rows keep working unchanged.
ALTER TABLE "SiteSettings" ADD COLUMN "socialLinks" JSONB;
ALTER TABLE "SiteSettings" ADD COLUMN "contactAddress" JSONB;
