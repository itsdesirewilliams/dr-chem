# DR-Chem

DR-Chem chemical product catalogue and business platform.

## Architecture

- Next.js
- TypeScript
- PostgreSQL (currently hosted by Supabase, provider-agnostic)
- Docker (retained for future self-hosted deployment)
- PostgreSQL Full-Text Search
- Self-hosted authentication
- Product catalogue
- Product categorization
- User accounts
- Blog
- Admin
- Quote / lead management

## Development

The application connects to PostgreSQL through a single provider-agnostic
`DATABASE_URL` (see `.env.example`). The current development database is
hosted **Supabase PostgreSQL**. The `docker/` setup is preserved as portable
infrastructure for future self-hosting.

## Deployment

The application must remain deployable to free-tier hosting
for demonstration and portable to self-hosted infrastructure.