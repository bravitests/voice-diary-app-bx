# Supabase Setup for Vercel Deployment

## Environment Variables for Vercel

Set these environment variables in your Vercel dashboard:

### Required Database Variables
```bash
# Primary connection string (use this one)
DATABASE_POSTGRES_URL="postgres://postgres.mxnolozmjctctissdlft:1PDSbR1osLIGkDcW@aws-1-us-east-1.pooler.supabase.com:6543/postgres?sslmode=require&supa=base-pooler.x"

# Fallback (optional)
DATABASE_URL="postgres://postgres.mxnolozmjctctissdlft:1PDSbR1osLIGkDcW@aws-1-us-east-1.pooler.supabase.com:6543/postgres?sslmode=require&supa=base-pooler.x"
```

### Optional Supabase Variables (for future use)
```bash
SUPABASE_URL="https://mxnolozmjctctissdlft.supabase.co"
SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im14bm9sb3ptamN0Y3Rpc3NkbGZ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY2NDQxOTAsImV4cCI6MjA3MjIyMDE5MH0.g8Akj9ZkZvyxFHr8xmxDpiwveKK13_reFQAz0BX3b48"
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im14bm9sb3ptamN0Y3Rpc3NkbGZ0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjY0NDE5MCwiZXhwIjoyMDcyMjIwMTkwfQ.kvAHLapPI-ivkoyzBefcpEihFjKlJ6cxM_mF8v9zLXc"
```

## Local Development Setup

1. Create a `.env.local` file:
```bash
DATABASE_POSTGRES_URL="postgres://postgres.mxnolozmjctctissdlft:1PDSbR1osLIGkDcW@aws-1-us-east-1.pooler.supabase.com:6543/postgres?sslmode=require&supa=base-pooler.x"
```

2. Run migrations:
```bash
npm run db:supabase
```

3. Start development:
```bash
npm run dev
```

## Vercel Deployment Steps

1. **Set Environment Variables** in Vercel dashboard
2. **Deploy** - Vercel will automatically run the build
3. **Test** the health endpoint: `https://your-app.vercel.app/api/health`
4. **Run migrations** if needed (can be done locally or via Vercel CLI)

## Troubleshooting

### SSL Certificate Issues
- The new configuration handles Supabase SSL automatically
- Uses `rejectUnauthorized: false` for Supabase compatibility

### Connection Pool Issues
- Optimized for serverless with 5 max connections in production
- Shorter timeouts for better performance

### Migration Issues
- Run `npm run db:supabase` locally first
- Check Supabase dashboard for table creation
- Verify connection string format