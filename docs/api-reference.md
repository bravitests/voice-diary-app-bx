# API Reference

## Authentication

All API endpoints require wallet-based authentication. Include the wallet address in the request headers:

\`\`\`
Authorization: Bearer <wallet_address>
\`\`\`

## Endpoints

### Transcription

#### POST /api/transcribe

Transcribe audio recordings using Gemini 2.5 Flash.

**Request Body:**
\`\`\`json
{
  "audioData": "base64_encoded_audio",
  "purpose": "work|personal|health|relationships|goals",
  "duration": 120
}
\`\`\`

**Response:**
\`\`\`json
{
  "transcript": "Transcribed text...",
  "summary": "AI-generated summary...",
  "insights": ["insight1", "insight2"],
  "recordingId": "uuid"
}
\`\`\`

### Chat

#### POST /api/chat

Start or continue AI chat conversations.

**Request Body:**
\`\`\`json
{
  "message": "User message",
  "sessionId": "optional_session_id",
  "purpose": "work|personal|health|relationships|goals"
}
\`\`\`

**Response:**
\`\`\`json
{
  "response": "AI response",
  "sessionId": "session_uuid"
}
\`\`\`

### Recordings

#### GET /api/recordings

Fetch user recordings with optional filtering.

**Query Parameters:**
- `purpose`: Filter by purpose
- `limit`: Number of results (default: 20)
- `offset`: Pagination offset

**Response:**
\`\`\`json
{
  "recordings": [
    {
      "id": "uuid",
      "transcript": "text",
      "summary": "summary",
      "purpose": "work",
      "duration": 120,
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ],
  "total": 50
}
\`\`\`

#### POST /api/recordings/create

Create a new recording entry.

**Request Body:**
\`\`\`json
{
  "transcript": "Transcribed text",
  "summary": "Summary",
  "purpose": "work",
  "duration": 120,
  "audioUrl": "optional_audio_url"
}
\`\`\`

### Subscription

#### POST /api/subscription/upgrade

Upgrade to Pro subscription via smart contract.

**Request Body:**
\`\`\`json
{
  "transactionHash": "0x...",
  "walletAddress": "0x..."
}
\`\`\`

#### GET /api/usage

Get current usage statistics.

**Response:**
\`\`\`json
{
  "recordingsThisMonth": 5,
  "recordingLimit": 10,
  "storageUsed": 1024,
  "storageLimit": 5120,
  "subscriptionTier": "free|pro"
}
\`\`\`

## Rate Limits

- Free tier: 10 requests per minute
- Pro tier: 60 requests per minute
- Transcription: 5 requests per minute (all tiers)

## Error Responses

All endpoints return consistent error responses:

\`\`\`json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": "Additional details"
}
\`\`\`

Common error codes:
- `RATE_LIMIT_EXCEEDED`: Too many requests
- `SUBSCRIPTION_REQUIRED`: Pro feature requires upgrade
- `INVALID_AUDIO`: Audio format not supported
- `TRANSCRIPTION_FAILED`: AI transcription error
