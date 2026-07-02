-- Wave 2 SEO: sameAs sources + LocalBusiness contact block.
-- Both nullable, no default — existing rows continue to work unchanged.
ALTER TABLE "SiteSettings" ADD COLUMN "socialLinks" JSONB;
ALTER TABLE "SiteSettings" ADD COLUMN "contactAddress" JSONB;
