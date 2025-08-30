# VoiceDiary Payment Contract

Smart contract for handling VoiceDiary subscription payments on Base network.

## Features

- **Secure Payments**: Users pay directly from their wallet to the contract
- **Subscription Management**: Automatic PRO subscription tracking with expiry
- **Owner Controls**: Withdraw payments, update prices, pause contract
- **Security**: ReentrancyGuard, Pausable, and proper access controls
- **Refunds**: Automatic refund of excess payments

## Contract Details

- **Network**: Base (Mainnet) / Base Sepolia (Testnet)
- **PRO Price**: 0.01 ETH per month
- **Duration**: 30 days per subscription
- **Upgradeable**: Owner can update prices

## Setup

1. **Install dependencies**:
```bash
cd contracts
npm install
```

2. **Set up environment**:
```bash
cp .env.example .env
# Add your PRIVATE_KEY and BASESCAN_API_KEY
```

3. **Compile contracts**:
```bash
npm run compile
```

4. **Run tests**:
```bash
npm run test
```

## Deployment

### Testnet (Base Sepolia)
```bash
npm run deploy-testnet
```

### Mainnet (Base)
```bash
npm run deploy
```

### Verify Contract
```bash
npx hardhat verify --network base <CONTRACT_ADDRESS>
```

## Usage in Frontend

1. **Update contract address** in your `.env`:
```env
NEXT_PUBLIC_CONTRACT_ADDRESS=0x...
```

2. **Use the payment hook**:
```typescript
import { usePaymentContract } from '@/hooks/usePaymentContract'

const { purchaseProSubscription, hasActivePro, proPrice } = usePaymentContract()
```

3. **Purchase subscription**:
```typescript
const success = await purchaseProSubscription()
```

## Contract Functions

### User Functions
- `purchaseProSubscription()` - Purchase/extend PRO subscription
- `hasActiveProSubscription(address)` - Check if user has active PRO
- `getUserSubscription(address)` - Get detailed subscription info
- `getTimeRemaining(address)` - Get remaining subscription time

### Owner Functions
- `withdrawPayments()` - Withdraw collected payments
- `updatePrice(tier, newPrice)` - Update subscription prices
- `cancelSubscription(address)` - Cancel user subscription
- `pause()/unpause()` - Emergency pause functionality

## Security Features

- **ReentrancyGuard**: Prevents reentrancy attacks
- **Pausable**: Emergency pause functionality
- **Ownable**: Proper access control
- **Input validation**: Checks for sufficient payment
- **Automatic refunds**: Returns excess payments
- **No direct transfers**: Rejects direct ETH sends

## Gas Optimization

- Optimized for Base network (low gas fees)
- Efficient storage patterns
- Minimal external calls

## Testing

The contract includes comprehensive tests covering:
- Basic functionality
- Edge cases
- Security scenarios
- Owner functions
- Error conditions

Run tests with: `npm run test`

## Monitoring

After deployment, monitor:
- Contract balance: `getContractBalance()`
- User subscriptions: `getUserSubscription(address)`
- Payment events: `SubscriptionPurchased` events

## Support

For issues or questions about the smart contract, check the test files for usage examples or review the contract source code.