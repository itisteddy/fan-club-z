# Supabase Setup Guide for Fan Club Z

This guide will help you set up and verify your Supabase connection for Fan Club Z.

## Prerequisites

- Node.js 18+ installed
- A Supabase account and project
- Fan Club Z repository cloned locally

## 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in
2. Click "New Project"
3. Fill in your project details:
   - Name: `Fan Club Z`
   - Database Password: Generate a strong password
   - Region: Choose closest to your users
4. Wait for the project to be created (usually takes 2-3 minutes)

## 2. Get Your Supabase Credentials

Once your project is ready:

1. Go to Settings → API
2. Find your Project URL (should look like `https://xxxxx.supabase.co`)
3. Find your `anon` public key
4. Find your `service_role` secret key

## 3. Configure Environment Variables

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Update the Supabase section in your `.env` file:
   ```env
   # ============================================================================
   # SUPABASE CONFIGURATION
   # ============================================================================
   VITE_SUPABASE_URL=https://your-project-ref.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```

   Replace:
   - `your-project-ref` with your actual project reference
   - `your-anon-key` with your actual anon key
   - `your-service-role-key` with your actual service role key

## 4. Verify Your Connection

Run the verification script:

```bash
npm run verify:supabase
```

This will:
- ✅ Check that all environment variables are set
- ✅ Validate the URL format
- ✅ Test both client and server connections
- ✅ Provide next steps

## 5. Set Up Database Schema

The database schema will be automatically created when you run the development server for the first time. However, you can also run it manually:

```bash
# From the server directory
cd server
npm run db:migrate
```

## 6. Detailed Testing (Optional)

For more comprehensive testing, run:

```bash
# From the server directory
cd server
npm run test:supabase
```

This will test:
- Database table access
- Helper functions
- RPC functions
- Real-time subscriptions

## Troubleshooting

### Common Issues

1. **"Missing required environment variable" error**
   - Check that your `.env` file is in the root directory
   - Ensure all three Supabase variables are set
   - Check for typos in variable names

2. **"Invalid URL" error**
   - Make sure your `VITE_SUPABASE_URL` starts with `https://`
   - Ensure it contains `.supabase.co`
   - Don't include `/rest/v1` or other paths

3. **Connection timeouts**
   - Check your internet connection
   - Verify your Supabase project is active
   - Try regenerating your API keys

4. **Permission denied errors**
   - Make sure you're using the correct service role key for server-side operations
   - Check that your anon key has the right permissions

### Getting Help

If you encounter issues:

1. Run `npm run verify:supabase` for basic diagnostics
2. Check the [Supabase documentation](https://supabase.com/docs)
3. Verify your project is active in the Supabase dashboard
4. Check the server logs for detailed error messages

## Environment Variables Reference

| Variable | Purpose | Example |
|----------|---------|---------|
| `VITE_SUPABASE_URL` | Your project's API URL | `https://abc123.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Public API key for client-side | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |
| `SUPABASE_SERVICE_ROLE_KEY` | Secret key for server-side operations | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |

## Security Notes

- ⚠️ **Never commit your `.env` file** - it contains sensitive credentials
- ✅ The `anon` key is safe to use in client-side code
- ⚠️ The `service_role` key should only be used server-side
- ✅ Use Row Level Security (RLS) policies for data protection

## Next Steps

Once Supabase is working:

1. Start the development servers:
   ```bash
   npm run dev
   ```

2. Visit `http://localhost:5173` to see the client
3. The API will be available at `http://localhost:3001`

## Support

For Supabase-specific issues, check:
- [Supabase Status](https://status.supabase.com/)
- [Supabase Community](https://github.com/supabase/supabase/discussions)
- [Fan Club Z Documentation](./README.md)
