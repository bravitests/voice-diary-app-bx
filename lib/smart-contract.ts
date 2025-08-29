// Smart contract integration utilities for Base blockchain
import { ethers } from "ethers"

// Contract ABI (Application Binary Interface)
const VOICE_DIARY_ABI = [
  "function subscribeToPro() external payable",
  "function cancelSubscription() external",
  "function isSubscriptionActive(address user) external view returns (bool)",
  "function getUserSubscription(address user) external view returns (tuple(uint256 id, address user, uint8 tier, uint256 startTime, uint256 endTime, bool active, uint256 amountPaid))",
  "function proPrice() external view returns (uint256)",
  "function getContractBalance() external view returns (uint256)",
  "function getTotalSubscriptions() external view returns (uint256)",
  "event SubscriptionCreated(uint256 indexed subscriptionId, address indexed user, uint8 tier, uint256 startTime, uint256 endTime, uint256 amountPaid)",
  "event SubscriptionCancelled(uint256 indexed subscriptionId, address indexed user)",
]

// Contract address on Base (this would be set after deployment)
const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "0x0000000000000000000000000000000000000000"

// Base network configuration
const BASE_NETWORK = {
  chainId: 8453, // Base mainnet
  name: "Base",
  rpcUrl: "https://mainnet.base.org",
  blockExplorer: "https://basescan.org",
}

const BASE_TESTNET = {
  chainId: 84532, // Base Sepolia testnet
  name: "Base Sepolia",
  rpcUrl: "https://sepolia.base.org",
  blockExplorer: "https://sepolia.basescan.org",
}

// Use testnet for development
const NETWORK = process.env.NODE_ENV === "production" ? BASE_NETWORK : BASE_TESTNET

export class SmartContractService {
  private contract: ethers.Contract | null = null
  private provider: ethers.providers.Web3Provider | null = null
  private signer: ethers.Signer | null = null

  async initialize() {
    try {
      // Check if MiniKit is available (Base mini app environment)
      if (typeof window !== "undefined" && (window as any).MiniKit) {
        const miniKit = (window as any).MiniKit
        await miniKit.switchChain(NETWORK.chainId)

        this.provider = new ethers.providers.Web3Provider(miniKit.ethereum)
        this.signer = this.provider.getSigner()
        this.contract = new ethers.Contract(CONTRACT_ADDRESS, VOICE_DIARY_ABI, this.signer)

        console.log("[v0] Smart contract initialized with MiniKit")
        return true
      }

      // Fallback to window.ethereum for development
      if (typeof window !== "undefined" && (window as any).ethereum) {
        this.provider = new ethers.providers.Web3Provider((window as any).ethereum)
        await this.provider.send("eth_requestAccounts", [])

        // Switch to Base network
        try {
          await this.provider.send("wallet_switchEthereumChain", [{ chainId: `0x${NETWORK.chainId.toString(16)}` }])
        } catch (switchError: any) {
          // Network doesn't exist, add it
          if (switchError.code === 4902) {
            await this.provider.send("wallet_addEthereumChain", [
              {
                chainId: `0x${NETWORK.chainId.toString(16)}`,
                chainName: NETWORK.name,
                rpcUrls: [NETWORK.rpcUrl],
                blockExplorerUrls: [NETWORK.blockExplorer],
                nativeCurrency: {
                  name: "ETH",
                  symbol: "ETH",
                  decimals: 18,
                },
              },
            ])
          }
        }

        this.signer = this.provider.getSigner()
        this.contract = new ethers.Contract(CONTRACT_ADDRESS, VOICE_DIARY_ABI, this.signer)

        console.log("[v0] Smart contract initialized with MetaMask")
        return true
      }

      console.warn("[v0] No Web3 provider found")
      return false
    } catch (error) {
      console.error("[v0] Error initializing smart contract:", error)
      return false
    }
  }

  async getProPrice(): Promise<string> {
    if (!this.contract) {
      throw new Error("Contract not initialized")
    }

    try {
      const price = await this.contract.proPrice()
      return ethers.utils.formatEther(price)
    } catch (error) {
      console.error("[v0] Error getting pro price:", error)
      throw error
    }
  }

  async subscribeToPro(): Promise<{ success: boolean; transactionHash?: string; error?: string }> {
    if (!this.contract || !this.signer) {
      throw new Error("Contract not initialized")
    }

    try {
      const proPrice = await this.contract.proPrice()

      const transaction = await this.contract.subscribeToPro({
        value: proPrice,
        gasLimit: 300000, // Set reasonable gas limit
      })

      console.log("[v0] Subscription transaction sent:", transaction.hash)

      // Wait for transaction confirmation
      const receipt = await transaction.wait()

      if (receipt.status === 1) {
        console.log("[v0] Subscription successful:", receipt.transactionHash)
        return {
          success: true,
          transactionHash: receipt.transactionHash,
        }
      } else {
        return {
          success: false,
          error: "Transaction failed",
        }
      }
    } catch (error: any) {
      console.error("[v0] Error subscribing to pro:", error)

      let errorMessage = "Subscription failed"
      if (error.code === 4001) {
        errorMessage = "Transaction cancelled by user"
      } else if (error.message?.includes("insufficient funds")) {
        errorMessage = "Insufficient funds for transaction"
      } else if (error.message?.includes("Already has active subscription")) {
        errorMessage = "You already have an active subscription"
      }

      return {
        success: false,
        error: errorMessage,
      }
    }
  }

  async cancelSubscription(): Promise<{ success: boolean; transactionHash?: string; error?: string }> {
    if (!this.contract || !this.signer) {
      throw new Error("Contract not initialized")
    }

    try {
      const transaction = await this.contract.cancelSubscription({
        gasLimit: 200000,
      })

      console.log("[v0] Cancellation transaction sent:", transaction.hash)

      const receipt = await transaction.wait()

      if (receipt.status === 1) {
        console.log("[v0] Cancellation successful:", receipt.transactionHash)
        return {
          success: true,
          transactionHash: receipt.transactionHash,
        }
      } else {
        return {
          success: false,
          error: "Transaction failed",
        }
      }
    } catch (error: any) {
      console.error("[v0] Error cancelling subscription:", error)

      let errorMessage = "Cancellation failed"
      if (error.code === 4001) {
        errorMessage = "Transaction cancelled by user"
      } else if (error.message?.includes("No active subscription")) {
        errorMessage = "No active subscription to cancel"
      }

      return {
        success: false,
        error: errorMessage,
      }
    }
  }

  async isSubscriptionActive(userAddress: string): Promise<boolean> {
    if (!this.contract) {
      throw new Error("Contract not initialized")
    }

    try {
      return await this.contract.isSubscriptionActive(userAddress)
    } catch (error) {
      console.error("[v0] Error checking subscription status:", error)
      return false
    }
  }

  async getUserSubscription(userAddress: string): Promise<any> {
    if (!this.contract) {
      throw new Error("Contract not initialized")
    }

    try {
      const subscription = await this.contract.getUserSubscription(userAddress)

      return {
        id: subscription.id.toString(),
        user: subscription.user,
        tier: subscription.tier === 0 ? "free" : "pro",
        startTime: new Date(subscription.startTime.toNumber() * 1000),
        endTime: new Date(subscription.endTime.toNumber() * 1000),
        active: subscription.active,
        amountPaid: ethers.utils.formatEther(subscription.amountPaid),
      }
    } catch (error) {
      console.error("[v0] Error getting user subscription:", error)
      return null
    }
  }

  async getContractStats(): Promise<{ totalSubscriptions: number; contractBalance: string }> {
    if (!this.contract) {
      throw new Error("Contract not initialized")
    }

    try {
      const [totalSubscriptions, contractBalance] = await Promise.all([
        this.contract.getTotalSubscriptions(),
        this.contract.getContractBalance(),
      ])

      return {
        totalSubscriptions: totalSubscriptions.toNumber(),
        contractBalance: ethers.utils.formatEther(contractBalance),
      }
    } catch (error) {
      console.error("[v0] Error getting contract stats:", error)
      return {
        totalSubscriptions: 0,
        contractBalance: "0",
      }
    }
  }

  // Listen for contract events
  onSubscriptionCreated(callback: (event: any) => void) {
    if (!this.contract) return

    this.contract.on("SubscriptionCreated", (subscriptionId, user, tier, startTime, endTime, amountPaid, event) => {
      callback({
        subscriptionId: subscriptionId.toString(),
        user,
        tier: tier === 0 ? "free" : "pro",
        startTime: new Date(startTime.toNumber() * 1000),
        endTime: new Date(endTime.toNumber() * 1000),
        amountPaid: ethers.utils.formatEther(amountPaid),
        transactionHash: event.transactionHash,
      })
    })
  }

  onSubscriptionCancelled(callback: (event: any) => void) {
    if (!this.contract) return

    this.contract.on("SubscriptionCancelled", (subscriptionId, user, event) => {
      callback({
        subscriptionId: subscriptionId.toString(),
        user,
        transactionHash: event.transactionHash,
      })
    })
  }

  // Cleanup event listeners
  removeAllListeners() {
    if (this.contract) {
      this.contract.removeAllListeners()
    }
  }
}

// Singleton instance
export const smartContractService = new SmartContractService()
