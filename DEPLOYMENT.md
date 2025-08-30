# Voice Diary Deployment Guide

This guide will help you deploy your Voice Diary application to production.

## Prerequisites

- Node.js 18+ installed
- PostgreSQL database (Vercel Postgres, Supabase, or similar)
- Gemini AI API key(s)
- Coinbase Developer Platform account
- Base wallet for smart contract deployment

## Quick Start

### 1. Environment Setup

First, check if your environment is properly configured:

```bash
npm run env:check
```

This will validate all required environment variables and show you what's missing.

### 2. Database Initialization

Initialize your database with all required tables:

```bash
npm run db:init
```

Or run the migration script directly:

```bash
npm run db:migrate
```

### 3. Full Setup

Run the complete setup process:

```bash
npm run setup
```

This will check your environment and initialize the database.

## Environment Variables

### Required Variables

```env
# Database
DATABASE_URL=postgresql://username:password@host:port/database

# AI Service
GEMINI_API_KEY_1=your_gemini_api_key_here

# OnchainKit (Base integration)
NEXT_PUBLIC_ONCHAINKIT_API_KEY=your_cdp_api_key_here
```

### Optional but Recommended

```env
# Additional Gemini keys for load balancing
GEMINI_API_KEY_2=your_second_gemini_key
GEMINI_API_KEY_3=your_third_gemini_key

# Smart Contract (set after deployment)
NEXT_PUBLIC_CONTRACT_ADDRESS=0x1234567890abcdef1234567890abcdef12345678

# App Configuration
NEXT_PUBLIC_URL=https://your-app.vercel.app
NEXT_PUBLIC_ONCHAINKIT_PROJECT_NAME=VoiceDiary
```

## Deployment Steps

### Step 1: Database Setup

1. **Create a PostgreSQL database**
   - Vercel Postgres (recommended for Vercel deployment)
   - Supabase
   - Railway
   - Or any PostgreSQL provider

2. **Get your DATABASE_URL**
   ```
   postgresql://username:password@host:port/database
   ```

3. **Run database migrations**
   ```bash
   npm run db:migrate
   ```

### Step 2: Get API Keys

1. **Gemini AI API Key**
   - Go to [Google AI Studio](https://aistudio.google.com/)
   - Create a new API key
   - Set as `GEMINI_API_KEY_1`

2. **Coinbase Developer Platform**
   - Go to [Coinbase Developer Platform](https://portal.cdp.coinbase.com/)
   - Create a new project
   - Get your API key
   - Set as `NEXT_PUBLIC_ONCHAINKIT_API_KEY`

### Step 3: Deploy Smart Contract

1. **Navigate to contracts directory**
   ```bash
   cd contracts
   npm install
   ```

2. **Deploy to Base Sepolia (testnet)**
   ```bash
   npm run deploy-testnet
   ```

3. **Deploy to Base Mainnet (production)**
   ```bash
   npm run deploy
   ```

4. **Set contract address**
   ```env
   NEXT_PUBLIC_CONTRACT_ADDRESS=your_deployed_contract_address
   ```

### Step 4: Deploy to Vercel

1. **Connect your repository to Vercel**
   - Go to [Vercel Dashboard](https://vercel.com/dashboard)
   - Import your GitHub repository

2. **Set environment variables in Vercel**
   - Go to Project Settings → Environment Variables
   - Add all required variables from your `.env.local`

3. **Deploy**
   - Vercel will automatically deploy when you push to main branch
   - The `postinstall` script will run setup automatically

## Verification

After deployment, verify everything is working:

1. **Check database connection**
   ```bash
   npm run db:migrate
   ```

2. **Check environment**
   ```bash
   npm run env:check
   ```

3. **Test the application**
   - Visit your deployed URL
   - Connect a wallet
   - Try recording a voice entry
   - Test Pro subscription (if contract is deployed)

## Troubleshooting

### Database Issues

- **Connection failed**: Check your DATABASE_URL format
- **Tables missing**: Run `npm run db:migrate`
- **Permission denied**: Ensure your database user has CREATE privileges

### API Issues

- **Gemini API errors**: Verify your API key is valid and has quota
- **OnchainKit errors**: Check your CDP API key and project configuration

### Smart Contract Issues

- **Contract not found**: Ensure NEXT_PUBLIC_CONTRACT_ADDRESS is set correctly
- **Network issues**: Verify you're on the correct network (Base mainnet/testnet)

## Production Checklist

- [ ] Database is set up and migrated
- [ ] All required environment variables are configured
- [ ] Smart contract is deployed to Base mainnet
- [ ] Gemini AI API keys are valid and have sufficient quota
- [ ] OnchainKit is properly configured
- [ ] Application deploys successfully on Vercel
- [ ] Wallet connection works
- [ ] Voice recording and transcription work
- [ ] Pro subscription payments work
- [ ] Admin features work (if applicable)

## Monitoring

- **Health Check**: `GET /api/system/health`
- **Database**: Monitor connection pool and query performance
- **API Usage**: Track Gemini API usage and costs
- **Smart Contract**: Monitor subscription events and payments

## Support

If you encounter issues:

1. Check the troubleshooting section above
2. Review the application logs in Vercel
3. Verify all environment variables are set correctly
4. Test individual components (database, APIs, smart contract)

Your Voice Diary application is now ready for production! 🎉