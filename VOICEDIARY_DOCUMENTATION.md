# VoiceDiary - Complete Application Documentation

## Table of Contents
1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Authentication System](#authentication-system)
4. [Core Features](#core-features)
5. [User Flow](#user-flow)
6. [Technical Stack](#technical-stack)
7. [Database Schema](#database-schema)
8. [API Endpoints](#api-endpoints)
9. [AI Integration](#ai-integration)
10. [Performance Optimizations](#performance-optimizations)
11. [Deployment](#deployment)
12. [Security](#security)

---

## Overview

**VoiceDiary** is a Web3-enabled voice journaling application that allows users to record audio diary entries, receive AI-powered insights, and organize their thoughts by custom purposes. The app uses wallet-based authentication and provides a seamless mobile-first experience.

### Key Value Propositions
- **Natural Expression**: Record thoughts via voice instead of typing
- **AI-Powered Insights**: Get summaries and psychological insights from recordings
- **Web3 Authentication**: Secure, decentralized login via crypto wallets
- **Purpose-Driven Organization**: Categorize entries by custom purposes
- **Privacy-First**: User data is tied to wallet addresses, not personal information

---

## Architecture

### High-Level Architecture
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │    │   External      │
│   (Next.js)     │◄──►│   (API Routes)  │◄──►│   Services      │
│                 │    │                 │    │                 │
│ • React UI      │    │ • Authentication│    │ • Supabase DB   │
│ • OnchainKit    │    │ • Audio Storage │    │ • Gemini AI     │
│ • Wallet Connect│    │ • AI Processing │    │ • Vercel Deploy │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Component Structure
```
app/
├── (auth)/                 # Authentication pages
├── dashboard/              # Main dashboard
├── entries/               # View recordings
├── api/                   # Backend API routes
│   ├── users/create       # User management
│   ├── recordings/        # Audio recording CRUD
│   ├── transcribe/        # AI processing
│   ├── purposes/          # Purpose management
│   └── health/            # System health check
├── components/            # Reusable UI components
├── contexts/              # React contexts (auth, theme)
├── lib/                   # Utility libraries
└── providers/             # Context providers
```

---

## Authentication System

### Web3 Wallet Authentication

The app uses **Coinbase OnchainKit** for wallet-based authentication, providing a seamless Web3 experience.

#### Authentication Flow
1. **Wallet Connection**: User connects their crypto wallet (MetaMask, Coinbase Wallet, etc.)
2. **Address Verification**: App verifies wallet address and signature
3. **User Creation**: If new user, creates database entry with wallet address as primary key
4. **Session Management**: Maintains authentication state via React context
5. **Purpose Setup**: Creates default "Personal Growth" purpose for new users

#### Technical Implementation

**Frontend (OnchainKit Integration)**:
```typescript
// MiniKitProvider setup
<MiniKitProvider apiKey={CDP_CLIENT_API_KEY} chain={base}>
  <Wallet>
    <ConnectWallet>
      <WalletDropdown>
        <Identity hasCopyAddressOnClick>
          <Avatar />
          <Name />
          <Address />
        </Identity>
      </WalletDropdown>
    </ConnectWallet>
  </Wallet>
</MiniKitProvider>
```

**Backend (User Management)**:
```typescript
// API: /api/users/create
POST /api/users/create
{
  "walletAddress": "0x..."
}

// Response
{
  "user": {
    "id": "uuid",
    "walletAddress": "0x...",
    "subscriptionTier": "free",
    "isAdmin": false
  }
}
```

#### Authentication Context
```typescript
interface AuthContextType {
  user: User | null
  updateProfile: (name: string, email: string) => Promise<boolean>
  logout: () => void
  isLoading: boolean
  isWalletConnected: boolean
}
```

### Security Features
- **No passwords**: Eliminates password-based vulnerabilities
- **Decentralized**: No central authentication server
- **Privacy-preserving**: Only wallet address is required
- **Signature verification**: Ensures wallet ownership

---

## Core Features

### 1. Voice Recording System

#### Recording Modal Component
- **Real-time audio visualization**: Shows audio levels during recording
- **Pause/Resume functionality**: Users can pause and continue recordings
- **Duration limits**: 2 minutes for free users, 5 minutes for pro users
- **Format**: Records in WebM format for web compatibility

#### Recording Process
1. **Microphone Access**: Requests user permission for microphone
2. **Audio Capture**: Uses MediaRecorder API for high-quality recording
3. **Visual Feedback**: Real-time audio level visualization
4. **File Storage**: Saves audio files to `/public/uploads/audio/`
5. **Database Entry**: Creates recording metadata in database

### 2. AI-Powered Processing

#### Gemini AI Integration
The app uses Google's Gemini AI for audio processing with two main functions:

**Transcription**:
```typescript
// Converts audio to text
transcribeAudio(audioBlob, userId, subscriptionTier)
// Returns: { transcript, tokensUsed, cost }
```

**Summary & Insights**:
```typescript
// Generates summary and psychological insights
generateSummaryFromAudio(audioBlob, userId, subscriptionTier)
// Returns: { summary, insights, tokensUsed, cost }
```

#### Processing Pipeline
1. **Parallel Processing**: Transcription and summary generation run simultaneously
2. **Rate Limiting**: User-specific token buckets prevent API abuse
3. **Circuit Breaker**: Handles API failures gracefully
4. **Cost Tracking**: Monitors token usage and costs per user

#### AI Features by Tier
**Free Tier**:
- Basic transcription
- Simple emotional tone analysis
- General observations

**Pro Tier**:
- Detailed psychological insights
- Emotional pattern recognition
- Actionable recommendations
- Recurring theme analysis

### 3. Purpose Management System

#### Custom Purposes
Users can create custom purposes to categorize their recordings:
- **Name**: Short descriptive name (e.g., "Work Stress", "Gratitude")
- **Description**: Detailed explanation of the purpose
- **Color**: Visual identifier for easy recognition
- **Default Purpose**: One purpose can be marked as default

#### Default Purpose Creation
New users automatically get a "Personal Growth" purpose:
```sql
INSERT INTO purposes (user_id, name, description, is_default, color)
VALUES (user_id, 'Personal Growth', 'Daily reflections on personal development and self-improvement', true, '#cdb4db')
```

### 4. Recording Management

#### Entry Viewing
- **Chronological listing**: Recordings sorted by creation date
- **Purpose filtering**: Filter recordings by specific purposes
- **Metadata display**: Shows duration, date, purpose, and processing status
- **Transcript preview**: Shows first few lines of transcript/summary

#### Data Structure
```typescript
interface Recording {
  id: string
  user_id: string
  purpose_id: string
  audio_url: string
  audio_duration: number
  transcript: string
  summary: string
  ai_insights: string
  created_at: string
  updated_at: string
}
```

---

## User Flow

### New User Journey
1. **Landing Page**: User sees app overview and connect wallet button
2. **Wallet Connection**: User connects their crypto wallet
3. **Account Creation**: System creates user account and default purpose
4. **Dashboard**: User sees main interface with recording button
5. **First Recording**: User records their first voice entry
6. **AI Processing**: System transcribes and analyzes the recording
7. **View Entries**: User can view their processed recordings

### Returning User Journey
1. **Auto-Authentication**: Wallet automatically connects if previously used
2. **Dashboard**: User sees familiar interface with their purposes
3. **Quick Recording**: User can immediately start recording
4. **Purpose Selection**: User selects from their custom purposes
5. **Entry Management**: User can view and organize past entries

### Recording Flow
```
Select Purpose → Click Record → Grant Mic Access → Record Audio → 
Save Recording → AI Processing → View Processed Entry
```

---

## Technical Stack

### Frontend Technologies
- **Next.js 15**: React framework with App Router
- **React 19**: Latest React with concurrent features
- **TypeScript**: Type-safe development
- **Tailwind CSS**: Utility-first styling
- **Radix UI**: Accessible component primitives
- **Coinbase OnchainKit**: Web3 wallet integration
- **Lucide React**: Icon library

### Backend Technologies
- **Next.js API Routes**: Serverless backend functions
- **PostgreSQL**: Primary database (via Supabase)
- **Node.js**: Runtime environment
- **pg**: PostgreSQL client library

### External Services
- **Supabase**: Managed PostgreSQL database
- **Google Gemini AI**: Audio transcription and analysis
- **Vercel**: Hosting and deployment platform
- **Base Network**: Blockchain network for wallet integration

### Development Tools
- **ESLint**: Code linting
- **Prettier**: Code formatting
- **TypeScript**: Static type checking
- **Git**: Version control

---

## Database Schema

### Core Tables

#### Users Table
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address VARCHAR(42) UNIQUE NOT NULL,
  name VARCHAR(255),
  email VARCHAR(255),
  subscription_tier VARCHAR(20) DEFAULT 'free',
  subscription_expiry TIMESTAMP WITH TIME ZONE,
  is_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### Purposes Table
```sql
CREATE TABLE purposes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  color VARCHAR(7) DEFAULT '#cdb4db',
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### Recordings Table
```sql
CREATE TABLE recordings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  purpose_id UUID REFERENCES purposes(id) ON DELETE SET NULL,
  audio_url TEXT,
  audio_duration INTEGER,
  transcript TEXT,
  summary TEXT,
  ai_insights TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### API Usage Tracking
```sql
CREATE TABLE api_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  api_type VARCHAR(50) NOT NULL,
  tokens_used INTEGER DEFAULT 0,
  cost DECIMAL(10, 6) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Relationships
- **Users → Purposes**: One-to-many (users can have multiple purposes)
- **Users → Recordings**: One-to-many (users can have multiple recordings)
- **Purposes → Recordings**: One-to-many (purposes can categorize multiple recordings)
- **Users → API Usage**: One-to-many (track usage per user)

---

## API Endpoints

### Authentication
```
POST /api/users/create
- Creates or retrieves user by wallet address
- Body: { walletAddress: string }
- Response: { user: User }
```

### Recording Management
```
POST /api/recordings/create
- Creates new recording entry
- Body: FormData { audio: File, walletAddress: string, purposeId: string, duration: string }
- Response: { recordingId: string, audioUrl: string }

GET /api/recordings
- Retrieves user recordings
- Query: wallet_address, purpose_id (optional)
- Response: { recordings: Recording[] }
```

### AI Processing
```
POST /api/transcribe
- Processes audio with AI
- Body: FormData { recordingId: string, audioUrl: string, walletAddress: string, subscriptionTier: string }
- Response: { transcript: string, summary: string, insights: string }
```

### Purpose Management
```
GET /api/purposes
- Retrieves user purposes
- Query: wallet_address
- Response: { purposes: Purpose[] }

POST /api/purposes
- Creates new purpose
- Body: { walletAddress: string, name: string, description?: string, color?: string }
- Response: { purpose: Purpose }
```

### System Health
```
GET /api/health
- Database connectivity check
- Response: { status: string, database: string, responseTime: string }
```

---

## AI Integration

### Gemini AI Configuration
```typescript
// API key rotation for load balancing
const API_KEYS = [
  process.env.GEMINI_API_KEY_1,
  process.env.GEMINI_API_KEY_2,
  process.env.GEMINI_API_KEY_3
].filter(Boolean)

// Model configuration
const model = genAI.getGenerativeModel({ 
  model: "gemini-2.5-flash" 
})
```

### Rate Limiting System
```typescript
class TokenBucket {
  private tokens: number
  private capacity: number
  private refillRate: number
  
  // 10 requests/minute for free, 30 for pro
  constructor(capacity: number, refillRate: number)
  consume(tokens = 1): boolean
}
```

### Processing Pipeline
1. **Audio Upload**: Client uploads audio blob
2. **Parallel Processing**: Transcription and summary run simultaneously
3. **Rate Limiting**: Check user's token bucket
4. **API Calls**: Send requests to Gemini AI
5. **Database Update**: Store results in recordings table
6. **Usage Tracking**: Log token usage and costs

### Error Handling
- **Circuit Breaker**: Prevents cascade failures
- **Fallback Responses**: Graceful degradation when AI fails
- **Retry Logic**: Automatic retries for transient failures

---

## Performance Optimizations

### Database Optimizations
- **Connection Pooling**: Optimized for serverless environments
- **Query Optimization**: Indexed queries and efficient joins
- **SSL Configuration**: Proper Supabase SSL handling

### Frontend Optimizations
- **Memoization**: React.memo and useMemo for expensive operations
- **Context Optimization**: Minimized re-renders with useCallback
- **Bundle Optimization**: Tree shaking and code splitting

### AI Processing Optimizations
- **Parallel Execution**: Simultaneous transcription and summary
- **Simplified Rate Limiting**: In-memory instead of database-heavy
- **Circuit Breaker**: Prevents API overload

### Vercel Optimizations
- **Serverless Functions**: Optimized for cold starts
- **Edge Regions**: Deployed to fastest regions
- **Compression**: Gzip compression enabled
- **Standalone Output**: Minimal runtime footprint

---

## Deployment

### Vercel Configuration
```json
{
  "functions": {
    "app/api/**/*.ts": { "maxDuration": 30 }
  },
  "regions": ["iad1"],
  "framework": "nextjs",
  "buildCommand": "npm run build",
  "outputDirectory": ".next"
}
```

### Build Process
1. **Install Dependencies**: `npm ci`
2. **Build Application**: `next build`
3. **Run Migrations**: `npm run postbuild` (automatic)
4. **Deploy Functions**: Serverless function deployment
5. **Static Assets**: CDN deployment

### Environment Variables
```bash
# Database
DATABASE_POSTGRES_URL_NON_POOLING="postgres://..."
DATABASE_POSTGRES_URL="postgres://..."

# AI Services
GEMINI_API_KEY_1="..."
GEMINI_API_KEY_2="..."

# Web3
NEXT_PUBLIC_CDP_CLIENT_API_KEY="..."

# Application
NEXT_PUBLIC_BASE_URL="https://..."
```

### Automatic Migrations
- **Post-build**: Migrations run automatically after successful build
- **Runtime Fallback**: Migrations run on first API call if build fails
- **Graceful Handling**: Build doesn't fail if database is unavailable

---

## Security

### Web3 Security
- **Wallet Verification**: Cryptographic signature verification
- **No Private Keys**: App never handles private keys
- **Decentralized Auth**: No central authentication server

### Data Security
- **Wallet-based Identity**: No personal information required
- **Encrypted Connections**: All database connections use SSL
- **Input Validation**: All API inputs validated and sanitized

### API Security
- **Rate Limiting**: Prevents API abuse and DoS attacks
- **CORS Configuration**: Proper cross-origin request handling
- **Error Handling**: No sensitive information in error messages

### Privacy Protection
- **Minimal Data Collection**: Only wallet address required
- **User-controlled Data**: Users own their recordings
- **No Tracking**: No analytics or user behavior tracking

---

## Future Enhancements

### Planned Features
1. **Chat Interface**: AI-powered conversations about recordings
2. **Advanced Analytics**: Mood tracking and pattern analysis
3. **Export Functionality**: Download recordings and transcripts
4. **Sharing Features**: Share insights with trusted contacts
5. **Mobile App**: Native iOS/Android applications

### Technical Improvements
1. **Real-time Processing**: WebSocket-based live transcription
2. **Advanced AI Models**: Integration with newer AI models
3. **Blockchain Storage**: IPFS integration for decentralized storage
4. **Multi-language Support**: Internationalization
5. **Offline Capabilities**: Progressive Web App features

---

## Conclusion

VoiceDiary represents a modern approach to personal journaling, combining the convenience of voice recording with the power of AI analysis and the security of Web3 authentication. The application is built with performance, scalability, and user privacy as core principles, providing a seamless experience for users to capture and reflect on their thoughts.

The modular architecture allows for easy feature additions and improvements, while the Web3 foundation ensures user data sovereignty and privacy. With automatic deployment and migration systems, the application maintains high availability and reliability for users worldwide.