// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title VoiceDiaryPayments
 * @dev Smart contract for handling VoiceDiary subscription payments
 */
contract VoiceDiaryPayments is Ownable, ReentrancyGuard, Pausable {
    
    // Subscription tiers
    enum SubscriptionTier { FREE, PRO }
    
    // Subscription details
    struct Subscription {
        SubscriptionTier tier;
        uint256 expiryTimestamp;
    }
    
    // Events
    event SubscriptionPurchased(
        address indexed user,
        SubscriptionTier tier,
        uint256 amount,
        uint256 expiryTimestamp
    );
    
    event PaymentWithdrawn(address indexed owner, uint256 amount);
    event PriceUpdated(SubscriptionTier tier, uint256 newPrice);
    event SubscriptionExpired(address indexed user);
    event TokenPayment(address indexed user, address token, uint256 amount);
    
    using SafeERC20 for IERC20;
    
    // State variables
    mapping(address => Subscription) public subscriptions;
    mapping(SubscriptionTier => uint256) public subscriptionPrices;
    mapping(address => uint256) public tokenPrices;
    address[] public acceptedTokens;
    
    // Duration constants
    uint256 private constant MONTHLY_DURATION = 30 days;
    uint256 private constant YEARLY_DURATION = 365 days;
    
    // Cache contract address
    address private immutable CONTRACT_ADDRESS;
    
    // Custom errors
    error DirectPaymentNotAllowed();
    
    constructor() Ownable(msg.sender) {
        CONTRACT_ADDRESS = address(this);
        // Set initial prices (in wei)
        // PRO: 0.01 ETH per month
        subscriptionPrices[SubscriptionTier.PRO] = 0.01 ether;
    }
    
    /**
     * @dev Purchase a PRO subscription (monthly)
     */
    function purchaseProSubscription() external payable nonReentrant whenNotPaused {
        _purchaseSubscription(MONTHLY_DURATION);
    }
    
    /**
     * @dev Purchase a PRO subscription (yearly)
     */
    function purchaseProYearlySubscription() external payable nonReentrant whenNotPaused {
        uint256 yearlyPrice = subscriptionPrices[SubscriptionTier.PRO] * 10; // 10 months price for yearly
        require(msg.value >= yearlyPrice, "Insufficient payment for yearly subscription");
        _purchaseSubscription(YEARLY_DURATION);
        
        // Refund excess payment for yearly
        if (msg.value > yearlyPrice) {
            payable(msg.sender).transfer(msg.value - yearlyPrice);
        }
    }
    
    function purchaseProSubscriptionWithToken(address token, bool isYearly) external nonReentrant whenNotPaused {
        require(tokenPrices[token] > 0, "Token not accepted");
        uint256 amount = isYearly ? tokenPrices[token] * 10 : tokenPrices[token];
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        _purchaseSubscription(isYearly ? YEARLY_DURATION : MONTHLY_DURATION);
        emit TokenPayment(msg.sender, token, amount);
    }
    
    /**
     * @dev Internal function to handle subscription purchase
     */
    function _purchaseSubscription(uint256 duration) internal {
        uint256 proPrice = subscriptionPrices[SubscriptionTier.PRO];
        
        if (duration == MONTHLY_DURATION) {
            require(msg.value >= proPrice, "Insufficient payment");
        }
        
        address user = msg.sender;
        uint256 currentExpiry = subscriptions[user].expiryTimestamp;
        uint256 newExpiry;
        
        // If user has an active subscription, extend it
        if (currentExpiry >= block.timestamp + 1) {
            newExpiry = currentExpiry + duration;
        } else {
            newExpiry = block.timestamp + duration;
        }
        
        subscriptions[user] = Subscription({
            tier: SubscriptionTier.PRO,
            expiryTimestamp: newExpiry
        });
        
        emit SubscriptionPurchased(user, SubscriptionTier.PRO, msg.value, newExpiry);
        
        // Refund excess payment for monthly
        if (duration == MONTHLY_DURATION && msg.value > proPrice) {
            payable(user).transfer(msg.value - proPrice);
        }
    }
    
    /**
     * @dev Check if user has active PRO subscription
     */
    function hasActiveProSubscription(address user) external returns (bool) {
        require(user != address(0), "Invalid user address");
        Subscription storage sub = subscriptions[user];
        bool isActive = sub.tier == SubscriptionTier.PRO && sub.expiryTimestamp >= block.timestamp + 1;
        
        if (!isActive && sub.tier == SubscriptionTier.PRO && sub.expiryTimestamp > 0) {
            emit SubscriptionExpired(user);
        }
        
        return isActive;
    }
    
    /**
     * @dev Get user's subscription details
     */
    function getUserSubscription(address user) external view returns (
        SubscriptionTier tier,
        uint256 expiryTimestamp,
        bool isExpired
    ) {
        require(user != address(0), "Invalid user address");
        Subscription storage sub = subscriptions[user];
        return (
            sub.tier,
            sub.expiryTimestamp,
            sub.expiryTimestamp <= block.timestamp
        );
    }
    
    /**
     * @dev Get time remaining on subscription
     */
    function getTimeRemaining(address user) external view returns (uint256) {
        require(user != address(0), "Invalid user address");
        Subscription storage sub = subscriptions[user];
        if (sub.expiryTimestamp < block.timestamp + 1) {
            return 0;
        }
        return sub.expiryTimestamp - block.timestamp;
    }
    
    /**
     * @dev Owner can withdraw collected payments
     */
    function withdrawPayments() external onlyOwner nonReentrant {
        uint256 balance = CONTRACT_ADDRESS.balance;
        require(balance > 0, "No funds to withdraw");
        
        payable(owner()).transfer(balance);
        emit PaymentWithdrawn(owner(), balance);
    }
    
    function withdrawTokens(address token) external onlyOwner {
        IERC20(token).safeTransfer(owner(), IERC20(token).balanceOf(address(this)));
    }
    
    function setTokenPrice(address token, uint256 price) external onlyOwner {
        if (tokenPrices[token] == 0) acceptedTokens.push(token);
        tokenPrices[token] = price;
    }
    
    /**
     * @dev Owner can update subscription prices
     */
    function updatePrice(SubscriptionTier tier, uint256 newPrice) external onlyOwner {
        require(newPrice > 0, "Price must be greater than 0");
        subscriptionPrices[tier] = newPrice;
        emit PriceUpdated(tier, newPrice);
    }
    
    /**
     * @dev Owner can pause the contract
     */
    function pause() external onlyOwner {
        _pause();
    }
    
    /**
     * @dev Owner can unpause the contract
     */
    function unpause() external onlyOwner {
        _unpause();
    }
    
    /**
     * @dev Get contract balance
     */
    function getContractBalance() external view onlyOwner returns (uint256) {
        return CONTRACT_ADDRESS.balance;
    }
    
    /**
     * @dev Admin grant subscription (owner only)
     */
    function grantSubscription(address user, bool isYearly) external onlyOwner {
        require(user != address(0), "Invalid user address");
        uint256 duration = isYearly ? YEARLY_DURATION : MONTHLY_DURATION;
        uint256 currentExpiry = subscriptions[user].expiryTimestamp;
        uint256 newExpiry;
        
        if (currentExpiry >= block.timestamp + 1) {
            newExpiry = currentExpiry + duration;
        } else {
            newExpiry = block.timestamp + duration;
        }
        
        subscriptions[user] = Subscription({
            tier: SubscriptionTier.PRO,
            expiryTimestamp: newExpiry
        });
        
        emit SubscriptionPurchased(user, SubscriptionTier.PRO, 0, newExpiry);
    }
    
    /**
     * @dev Admin extend subscription (owner only)
     */
    function extendSubscription(address user, uint256 additionalDays) external onlyOwner {
        require(user != address(0), "Invalid user address");
        require(subscriptions[user].tier == SubscriptionTier.PRO, "User must have PRO subscription");
        
        uint256 additionalTime = additionalDays * 1 days;
        uint256 currentExpiry = subscriptions[user].expiryTimestamp;
        uint256 newExpiry;
        
        if (currentExpiry >= block.timestamp + 1) {
            newExpiry = currentExpiry + additionalTime;
        } else {
            newExpiry = block.timestamp + additionalTime;
        }
        
        subscriptions[user].expiryTimestamp = newExpiry;
        
        emit SubscriptionPurchased(user, SubscriptionTier.PRO, 0, newExpiry);
    }
    
    /**
     * @dev Emergency function to cancel a subscription (owner only)
     */
    function cancelSubscription(address user) external onlyOwner {
        require(user != address(0), "Invalid user address");
        delete subscriptions[user];
    }
    
    /**
     * @dev Fallback function to reject direct ETH transfers
     */
    receive() external payable {
        revert DirectPaymentNotAllowed();
    }
}