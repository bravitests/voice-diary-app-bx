# Complete Billing System Documentation

## Overview

The Voice Diary billing system integrates smart contracts on Base blockchain with a traditional database to provide seamless subscription management. This document outlines the complete architecture, components, and flow.

## Architecture Components

### 1. Smart Contract (`VoiceDiaryPayments.sol`)
- **Location**: `/contracts/VoiceDiaryPayments.sol`
- **Purpose**: Handles on-chain subscription payments and status
- **Key Functions**:
  - `purchaseProSubscription()`: Process monthly Pro subscription payments
  - `hasActiveProSubscription(address)`: Check if user has active Pro subscription
  - `getUserSubscription(address)`: Get detailed subscription info
  - `subscriptionPrices(uint8)`: Get current pricing for subscription tiers

### 2. Enhanced Payment Hook (`useEnhancedPaymentContract.ts`)
- **Location**: `/hooks/useEnhancedPaymentContract.ts`
- **Purpose**: React hook for interacting with payment contract
- **Features**:
  - Transaction state management
  - Error handling with user-friendly messages
  - Automatic subscription synchronization
  - Retry mechanisms

### 3. Billing Service (`billing-service.ts`)
- **Location**: `/lib/billing-service.ts`
- **Purpose**: Backend service for transaction verification and database sync
- **Key Functions**:
  - `verifyAndSyncSubscription()`: Verify blockchain transaction and sync with database
  - `checkSubscriptionSync()`: Check if contract and database are in sync
  - `getUserLimits()`: Get user's current subscription limits

### 4. Error Handling System (`billing-errors.ts`)
- **Location**: `/lib/billing-errors.ts`
- **Purpose**: Comprehensive error handling with user-friendly messages
- **Features**:
  - Typed error categories
  - User-friendly error messages
  - Retry recommendations
  - Action suggestions

### 5. Error Display Component (`billing-error-display.tsx`)
- **Location**: `/components/billing-error-display.tsx`
- **Purpose**: UI component for displaying billing errors
- **Features**:
  - Context-aware error styling
  - Action buttons (retry, contact support, etc.)
  - External link handling

## Complete Billing Flow

### 1. User Initiates Upgrade
```typescript
// User clicks "Upgrade to Pro" button
const handleUpgrade = async () => {
  const result = await purchaseProSubscription()
  // Enhanced hook handles all states automatically
}
```

### 2. Transaction States
The system tracks these transaction states:
- **IDLE**: No transaction in progress
- **PREPARING**: Validating inputs and preparing transaction
- **PENDING**: Transaction sent to wallet, waiting for user confirmation
- **CONFIRMING**: Transaction confirmed by user, waiting for blockchain confirmation
- **SUCCESS**: Transaction confirmed on blockchain
- **FAILED**: Transaction failed at any stage

### 3. Smart Contract Interaction
```solidity
// User calls purchaseProSubscription() with ETH payment
function purchaseProSubscription() external payable {
    // Validates payment amount
    // Updates user's subscription status
    // Emits SubscriptionPurchased event
}
```

### 4. Transaction Verification & Database Sync
```typescript
// After blockchain confirmation
const syncResult = await BillingService.verifyAndSyncSubscription(
  userId, 
  transactionHash, 
  walletAddress
)

if (syncResult.success) {
  // Update database to match contract state
  // Refresh user interface
  // Update rate limits
}
```

### 5. API Integration
```typescript
// Call backend API to complete the upgrade
await fetch('/api/subscription/upgrade', {
  method: 'POST',
  body: JSON.stringify({
    userId,
    tier: 'pro',
    transactionHash,
    amountPaid
  })
})
```

## Error Handling

### Error Types
1. **WALLET_NOT_CONNECTED**: User needs to connect wallet
2. **INSUFFICIENT_FUNDS**: Not enough ETH for transaction
3. **TRANSACTION_REJECTED**: User cancelled transaction
4. **TRANSACTION_FAILED**: Blockchain transaction failed
5. **CONTRACT_ERROR**: Smart contract execution error
6. **NETWORK_ERROR**: Network connectivity issues
7. **SUBSCRIPTION_SYNC_ERROR**: Database sync failed
8. **DATABASE_ERROR**: Database operation failed

### User Experience
- **Clear Messages**: Each error has a user-friendly explanation
- **Action Buttons**: Contextual actions (retry, contact support, add funds)
- **Visual Indicators**: Color-coded error types
- **External Links**: Direct links to relevant resources (Base bridge, support)

## API Endpoints

### `/api/subscription/upgrade` (POST)
- **Purpose**: Process subscription upgrade after blockchain confirmation
- **Validation**: Verifies transaction on blockchain before database update
- **Response**: Success/failure with detailed error information

### `/api/subscription/status` (GET)
- **Purpose**: Get current subscription status
- **Features**: Optional sync checking between contract and database
- **Response**: Database status, contract status, sync status

### `/api/usage` (GET)
- **Purpose**: Get user's current usage statistics
- **Response**: Monthly usage counts for entries, chat messages, storage

## Database Schema

### Users Table
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY,
    wallet_address VARCHAR(42) UNIQUE,
    subscription_tier VARCHAR(20) DEFAULT 'free',
    subscription_expiry TIMESTAMP WITH TIME ZONE,
    -- other fields...
);
```

### Subscriptions Table
```sql
CREATE TABLE subscriptions (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    tier VARCHAR(20) NOT NULL,
    status VARCHAR(20) DEFAULT 'active',
    transaction_hash VARCHAR(66),
    amount_paid DECIMAL(18, 8),
    -- other fields...
);
```

## Configuration

### Environment Variables
```env
NEXT_PUBLIC_CONTRACT_ADDRESS=0x... # Smart contract address on Base
NEXT_PUBLIC_BASE_CHAIN_ID=8453     # Base mainnet chain ID
DATABASE_URL=postgresql://...       # Database connection string
```

### Contract Deployment
1. Deploy `VoiceDiaryPayments.sol` to Base network
2. Set `NEXT_PUBLIC_CONTRACT_ADDRESS` environment variable
3. Verify contract on BaseScan for transparency

## Testing

### Frontend Testing
```typescript
// Test transaction states
expect(transactionState).toBe(TransactionState.PREPARING)
expect(transactionState).toBe(TransactionState.PENDING)
expect(transactionState).toBe(TransactionState.SUCCESS)

// Test error handling
expect(billingError?.type).toBe(BillingErrorType.INSUFFICIENT_FUNDS)
expect(billingError?.retryable).toBe(true)
```

### Contract Testing
```javascript
// Test subscription purchase
await contract.purchaseProSubscription({ value: proPrice })
expect(await contract.hasActiveProSubscription(userAddress)).toBe(true)

// Test subscription expiry
await time.increase(31 * 24 * 60 * 60) // 31 days
expect(await contract.hasActiveProSubscription(userAddress)).toBe(false)
```

## Monitoring & Analytics

### Key Metrics
- **Conversion Rate**: Free to Pro upgrade percentage
- **Transaction Success Rate**: Successful vs failed transactions
- **Sync Issues**: Contract vs database discrepancies
- **Error Rates**: Frequency of different error types

### Logging
```typescript
console.log('Transaction initiated:', { userId, txHash, amount })
console.log('Sync completed:', { userId, success: true, duration: '2.3s' })
console.error('Billing error:', { type: 'INSUFFICIENT_FUNDS', userId })
```

## Security Considerations

### Smart Contract Security
- **Reentrancy Protection**: Uses OpenZeppelin's ReentrancyGuard
- **Access Control**: Owner-only functions for admin operations
- **Pausable**: Emergency pause functionality
- **Input Validation**: Validates all user inputs

### Frontend Security
- **Transaction Validation**: Verifies transaction success before UI updates
- **Error Sanitization**: Prevents sensitive data exposure in error messages
- **Rate Limiting**: Prevents spam transactions

### Database Security
- **SQL Injection Prevention**: Uses parameterized queries
- **Transaction Integrity**: Atomic operations for subscription updates
- **Data Validation**: Validates all inputs before database operations

## Troubleshooting

### Common Issues

1. **Transaction Stuck in Pending**
   - Check network congestion
   - Verify gas price settings
   - Use transaction hash to track on BaseScan

2. **Subscription Not Updating**
   - Check contract vs database sync
   - Verify transaction was actually confirmed
   - Use `/api/subscription/status?checkSync=true`

3. **Price Loading Issues**
   - Verify contract address configuration
   - Check network connectivity
   - Ensure wallet is connected to Base network

### Debug Tools
- **Transaction Status Display**: Shows real-time transaction progress
- **Debug Info Panel**: Displays contract state and connection status
- **Sync Check API**: Compares contract and database states

## Future Enhancements

### Planned Features
1. **Webhook System**: Automatic subscription updates via blockchain events
2. **Multi-Currency Support**: Accept USDC, DAI, and other tokens
3. **Subscription Tiers**: Additional subscription levels (Basic, Premium, Enterprise)
4. **Refund System**: Automated refund processing
5. **Analytics Dashboard**: Detailed billing analytics for admins

### Technical Improvements
1. **GraphQL Integration**: More efficient data fetching
2. **Caching Layer**: Redis caching for subscription status
3. **Event Sourcing**: Complete audit trail of all billing events
4. **Automated Testing**: Comprehensive test suite for all components
5. **Performance Monitoring**: Real-time performance metrics

## Support

### User Support
- **Error Messages**: Clear, actionable error descriptions
- **Help Links**: Direct links to relevant documentation
- **Contact Support**: Easy access to support channels

### Developer Support
- **Comprehensive Logging**: Detailed logs for debugging
- **API Documentation**: Complete API reference
- **Code Comments**: Well-documented codebase
- **Testing Examples**: Sample test cases and scenarios