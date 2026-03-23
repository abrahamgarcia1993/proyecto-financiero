import type { MetadataRoute } from 'next';

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.APP_URL || 'http://localhost:3001';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/dashboard', '/educacion', '/admin-secret-portal-8472', '/api/']
    },
    sitemap: `${siteUrl}/sitemap.xml`
  };
}
