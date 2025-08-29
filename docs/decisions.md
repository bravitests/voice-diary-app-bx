# Voice Diary App - Technical Decisions

## Authentication System
**Decision**: Use Base wallet connection instead of traditional email/password authentication
**Rationale**: 
- Leverages Web3 infrastructure for user identity
- Eliminates need for password management
- Integrates with Base mini app ecosystem
- Supports future smart contract integration for payments

**Implementation**:
- MiniKit integration for Base wallet connection
- Fallback mock wallet for development environment
- User profile completion (name/email) happens after wallet connection
- Wallet address serves as unique user identifier

## Database Architecture
**Decision**: PostgreSQL database with provided connection URL
**Rationale**:
- Robust relational database for complex queries
- Supports concurrent users effectively
- Good performance for audio metadata and user data
- Familiar SQL interface for development team

**Schema Design**:
- Users table with wallet_address as unique identifier
- Recordings table with audio metadata and AI-generated content
- Subscriptions table for payment tracking via smart contracts
- Chat sessions and messages for AI conversations
- API usage tracking for rate limiting and billing
- Proper indexing for performance optimization

**Connection Management**:
- Connection pooling with pg library
- Maximum 20 concurrent connections
- Automatic connection cleanup and error handling
- Query logging for debugging and monitoring

## AI Integration
**Decision**: Google Gemini 2.5 Flash for transcription and summarization
**Rationale**:
- Native audio processing capabilities
- High-quality transcription accuracy
- Built-in summarization features
- Cost-effective for voice diary use case

**Implementation**:
- 5-minute recording limit by default
- Multiple API keys with token bucket algorithm for scaling
- Real-time transcription during recording
- Post-recording summarization and insights

## Subscription Model
**Decision**: Two-tier system (Free vs Pro)
**Rationale**:
- Simple pricing structure for users
- Clear feature differentiation
- Room for future tier expansion

**Free Tier Features**:
- Basic voice recording (up to 2 minutes)
- Simple transcription
- Limited entries per month
- Basic chat functionality

**Pro Tier Features**:
- Extended recording time (up to 5 minutes)
- Advanced AI summarization
- Unlimited entries
- Advanced chat with insights
- Export capabilities
- Priority support

## Smart Contract Integration
**Decision**: Custom smart contract for subscription management
**Rationale**:
- Automated payment processing
- Transparent subscription tracking
- Reduced payment processing fees
- Integration with Base ecosystem

## Concurrency Management
**Decision**: Token bucket algorithm with multiple API keys
**Rationale**:
- Prevents API rate limiting issues
- Ensures fair usage across users
- Scalable architecture for growth
- Cost optimization through load distribution

**Implementation**:
- 3 API keys in rotation
- Token bucket per user for rate limiting
- Graceful degradation during high traffic
- Queue system for processing requests

## Data Storage Strategy
**Decision**: Separate audio file storage from database metadata
**Rationale**:
- Database optimized for metadata queries
- Audio files stored in blob storage or CDN
- Better performance and cost optimization
- Easier backup and recovery strategies

**Implementation**:
- Database stores audio_url references
- Audio files uploaded to cloud storage
- Metadata includes duration, transcript, summary
- AI insights stored as structured text
