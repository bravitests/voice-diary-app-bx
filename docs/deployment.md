# Deployment Guide

## Prerequisites

- Vercel account
- PostgreSQL database (Supabase, Neon, or similar)
- Gemini API keys (3 recommended for load balancing)
- Base blockchain wallet for contract deployment

## Environment Setup

### Required Environment Variables

\`\`\`env
# Database
DATABASE_URL=postgresql://user:password@host:port/database

# AI Integration
GEMINI_API_KEY_1=your_primary_gemini_key
GEMINI_API_KEY_2=your_secondary_gemini_key
GEMINI_API_KEY_3=your_tertiary_gemini_key

# Blockchain
NEXT_PUBLIC_BASE_CHAIN_ID=8453
NEXT_PUBLIC_CONTRACT_ADDRESS=deployed_contract_address
PRIVATE_KEY=contract_deployment_private_key

# App Configuration
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
\`\`\`

## Database Setup

1. **Create Database**
   \`\`\`bash
   # Run initial schema
   psql $DATABASE_URL -f scripts/001_initial_schema.sql
   
   # Run rate limiting tables
   psql $DATABASE_URL -f scripts/002_rate_limiting_tables.sql
   \`\`\`

2. **Verify Tables**
   \`\`\`sql
   \dt -- List all tables
   \`\`\`

## Smart Contract Deployment

1. **Install Hardhat**
   \`\`\`bash
   npm install --save-dev hardhat @nomiclabs/hardhat-ethers ethers
   \`\`\`

2. **Deploy Contract**
   \`\`\`bash
   npx hardhat run scripts/deploy.js --network base
   \`\`\`

3. **Update Environment**
   Add the deployed contract address to `NEXT_PUBLIC_CONTRACT_ADDRESS`

## Vercel Deployment

1. **Connect Repository**
   - Link your GitHub repository to Vercel
   - Configure build settings

2. **Environment Variables**
   - Add all required environment variables in Vercel dashboard
   - Ensure database URL is accessible from Vercel

3. **Build Configuration**
   \`\`\`json
   {
     "buildCommand": "npm run build",
     "outputDirectory": ".next",
     "installCommand": "npm install"
   }
   \`\`\`

## Post-Deployment Verification

1. **Health Check**
   \`\`\`bash
   curl https://your-app.vercel.app/api/system/health
   \`\`\`

2. **Database Connection**
   \`\`\`bash
   curl https://your-app.vercel.app/api/usage
   \`\`\`

3. **AI Integration**
   Test transcription with a sample audio file

## Monitoring

### Key Metrics to Monitor

- API response times
- Database connection pool usage
- Rate limiting effectiveness
- Smart contract transaction success rate
- User subscription conversion

### Recommended Tools

- Vercel Analytics for performance
- Database monitoring (built-in with most providers)
- Custom health check endpoint: `/api/system/health`

## Scaling Considerations

### Database
- Connection pooling is configured for 20 connections
- Consider read replicas for high traffic
- Monitor query performance

### API Rate Limiting
- Token bucket algorithm scales automatically
- Circuit breakers prevent cascade failures
- Consider Redis for distributed rate limiting

### AI API Usage
- 3 API keys rotate automatically
- Monitor quota usage across all keys
- Consider upgrading to higher tier plans

## Troubleshooting

### Common Issues

1. **Database Connection Errors**
   - Verify DATABASE_URL format
   - Check connection limits
   - Ensure database is accessible from Vercel

2. **Smart Contract Issues**
   - Verify contract address and ABI
   - Check Base network connectivity
   - Ensure sufficient gas for transactions

3. **AI Transcription Failures**
   - Verify all 3 API keys are valid
   - Check audio format compatibility
   - Monitor rate limits

### Debug Mode

Enable debug logging by setting:
\`\`\`env
NODE_ENV=development
DEBUG=voice-diary:*
\`\`\`

## Security Checklist

- [ ] Environment variables secured
- [ ] Database access restricted
- [ ] API rate limiting enabled
- [ ] Smart contract audited
- [ ] HTTPS enforced
- [ ] Input validation implemented
- [ ] Error messages don't leak sensitive data

## Backup Strategy

1. **Database Backups**
   - Daily automated backups
   - Point-in-time recovery capability

2. **Smart Contract**
   - Contract source code in version control
   - Deployment scripts documented

3. **Environment Configuration**
   - Secure backup of environment variables
   - Disaster recovery procedures documented
