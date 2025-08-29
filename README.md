# Voice Diary Application

A comprehensive voice journaling application built with Next.js, Base blockchain integration, and AI-powered insights.

## Features

### Core Functionality
- **Voice Recording**: Record diary entries up to 5 minutes (Pro) or 2 minutes (Free)
- **AI Transcription**: Powered by Gemini 2.5 Flash for accurate speech-to-text
- **Smart Summarization**: AI-generated insights and emotional analysis
- **Purpose-Based Organization**: Categorize entries by purpose (work, personal, health, etc.)
- **Chat Interface**: AI-powered conversations about your diary entries

### Authentication & Payments
- **Base Wallet Integration**: Connect wallet for seamless authentication
- **Smart Contract Subscriptions**: Blockchain-based payment processing
- **Tiered Pricing**: Free and Pro subscription levels

### Technical Features
- **Concurrency Management**: Token bucket algorithm for high-traffic handling
- **Rate Limiting**: Distributed rate limiting with circuit breakers
- **Database Integration**: PostgreSQL with connection pooling
- **Mobile-First Design**: Responsive UI optimized for mobile devices

## Architecture

### Frontend
- Next.js 14 with App Router
- React with TypeScript
- Tailwind CSS for styling
- MiniKit for Base wallet integration

### Backend
- PostgreSQL database
- Gemini 2.5 Flash API integration
- Smart contract on Base blockchain
- Rate limiting and concurrency management

### AI Integration
- Multiple API key rotation
- Token bucket rate limiting
- Real-time transcription and summarization
- Context-aware chat responses

## Getting Started

1. Clone the repository
2. Install dependencies: `npm install`
3. Set up environment variables (see `.env.example`)
4. Run database migrations: `npm run db:migrate`
5. Start development server: `npm run dev`

## Environment Variables

\`\`\`env
DATABASE_URL=your_postgresql_url
GEMINI_API_KEY_1=your_gemini_key_1
GEMINI_API_KEY_2=your_gemini_key_2
GEMINI_API_KEY_3=your_gemini_key_3
NEXT_PUBLIC_BASE_CHAIN_ID=8453
NEXT_PUBLIC_CONTRACT_ADDRESS=your_contract_address
\`\`\`

## Subscription Tiers

### Free Tier
- 2-minute recording limit
- 10 entries per month
- Basic transcription
- Limited chat interactions

### Pro Tier ($9.99/month)
- 5-minute recording limit
- Unlimited entries
- Advanced AI insights
- Priority support
- Export capabilities

## Smart Contract

The subscription management is handled by a Solidity smart contract deployed on Base:
- Handles Pro subscription payments
- Manages subscription status
- Processes refunds and cancellations
- Emits events for off-chain tracking

## API Endpoints

- `POST /api/transcribe` - Transcribe audio recordings
- `POST /api/chat` - AI chat interactions
- `GET /api/recordings` - Fetch user recordings
- `POST /api/recordings/create` - Create new recording
- `POST /api/subscription/upgrade` - Upgrade to Pro
- `GET /api/usage` - Get usage statistics

## Development

### Database Schema
See `scripts/001_initial_schema.sql` for the complete database structure.

### Rate Limiting
The application uses a sophisticated rate limiting system:
- Token bucket algorithm per user
- Circuit breakers for API protection
- Request queuing for high traffic
- Priority handling for Pro users

### Monitoring
Health check endpoint available at `/api/system/health` for monitoring system status.

## Deployment

The application is designed for deployment on Vercel with:
- Automatic scaling
- Edge function support
- Database connection pooling
- Environment variable management

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details.
