# 🗃️ Supabase Chat Logging Setup Guide

This guide explains how to set up Supabase for chat logging in the BOMbot application.

## 📋 Overview

The chat logging feature tracks:
- User questions to AI
- File names uploaded by users
- Thread IDs
- User messages and AI responses
- Timestamps and message indexes
- Session management
- Vulnerability counts from SBOM scans

## 🚀 Setup Instructions

### 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new account or sign in
2. Create a new project
3. Wait for the project to be fully set up

### 2. Set Up the Database Schema

1. In your Supabase dashboard, go to the **SQL Editor**
2. Copy the contents of `supabase_schema.sql` from this repository
3. Paste it into the SQL Editor and click **Run**
4. This will create:
   - `chat_logs` table (single table with all data)
   - Indexes for performance
   - RLS policies
   - Analytics view
   - Cleanup functions
   - Automatic triggers for session tracking

### 3. Get Your Supabase Credentials

From your Supabase project dashboard:

1. Go to **Settings** → **API**
2. Copy the following values:
   - **Project URL** (starts with `https://`)
   - **anon public** key
   - **service_role** key (⚠️ Keep this secret!)

### 4. Configure Environment Variables

Add these variables to your `.env.local` file (create it if it doesn't exist):

```bash
# Existing OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here
ASSISTANT_ID=your_openai_assistant_id_here

# NEW: Supabase Configuration for Chat Logging
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_public_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_secret_key_here

# Optional
OSV_SCANNER_PATH=path_to_osv_scanner_binary_if_needed
```

### 5. Update Your Deployment Environment

If you're deploying to Vercel or another platform, make sure to add these environment variables to your deployment settings:

**Vercel:**
1. Go to your project dashboard
2. Click **Settings** → **Environment Variables**
3. Add each variable with its corresponding value

## 🔧 Environment Variables Explained

| Variable | Type | Description |
|----------|------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Public | Your Supabase project URL. Safe to expose to client. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public | Anonymous access key. Safe to expose to client. |
| `SUPABASE_SERVICE_ROLE_KEY` | **Secret** | Service role key with admin access. **Never expose to client!** |

## 📊 Database Schema

### chat_logs (Single Table Design)
Stores all chat information in one comprehensive table:

**Core Message Data:**
- `id`: Primary key (UUID)
- `session_id`: Unique identifier for the session
- `thread_id`: OpenAI thread identifier
- `message_index`: Order of message in conversation
- `message_type`: 'user', 'assistant', or 'file_upload'
- `user_message`: User's input text
- `ai_response`: AI's response text

**File Upload Data:**
- `file_name`: Name of uploaded file (if applicable)
- `file_size`: Size of uploaded file
- `vulnerability_count`: Number of vulnerabilities found

**Session Tracking:**
- `session_started_at`: When the session began
- `session_last_activity`: Last interaction timestamp
- `created_at`: When this record was created
- `updated_at`: When this record was last modified

## 🔍 Analytics and Monitoring

The setup includes a `session_analytics` view that provides:
- Session duration
- Message counts by type
- Total vulnerabilities found
- File upload statistics

Query example:
```sql
SELECT * FROM session_analytics 
WHERE session_started_at >= NOW() - INTERVAL '7 days'
ORDER BY session_last_activity DESC;
```

## 🧹 Data Cleanup

The schema includes a cleanup function that removes sessions older than 30 days:

```sql
SELECT cleanup_old_sessions();
```

You can schedule this to run automatically using pg_cron (if available in your Supabase plan).

## 🔒 Security Considerations

1. **RLS Policies**: The schema enables Row Level Security with permissive policies
2. **Service Role Key**: Keep this secret and only use it in server-side code
3. **Data Retention**: Consider implementing data retention policies per your requirements
4. **GDPR Compliance**: Add user identification fields if needed for data deletion requests

## 🐛 Troubleshooting

### Common Issues:

1. **Connection Failed**: Check that your environment variables are correct
2. **Permission Denied**: Ensure RLS policies are properly configured
3. **Missing Tables**: Run the schema SQL in Supabase SQL Editor
4. **Build Errors**: Make sure all environment variables are set in your deployment

### Debug Steps:

1. Check Supabase logs in the dashboard
2. Verify environment variables are loaded correctly
3. Test database connection manually
4. Check browser console for client-side errors

## 📈 Monitoring Usage

To monitor your chat logging:

1. Check Supabase dashboard for database usage
2. Use the `session_analytics` view for insights
3. Monitor API usage in Supabase settings
4. Set up alerts for error rates

## 🔄 Migration Notes

If you're adding this to an existing BOMbot installation:

1. Your existing functionality will continue to work
2. Chat logging will start immediately after setup
3. No existing data will be affected
4. You can disable logging by removing the Supabase environment variables

---

For additional support, check the [Supabase documentation](https://supabase.com/docs) or create an issue in this repository. 