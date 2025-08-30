#!/usr/bin/env node

// Environment validation script for Voice Diary App
// Ensures all required environment variables are properly configured

const requiredEnvVars = {
  // Database
  DATABASE_URL: {
    required: true,
    description: 'PostgreSQL database connection string',
    example: 'postgresql://username:password@host:port/database'
  },
  
  // AI Service
  GEMINI_API_KEY_1: {
    required: true,
    description: 'Primary Gemini AI API key for transcription',
    example: 'your_gemini_api_key_here'
  },
  
  // OnchainKit (Base integration)
  NEXT_PUBLIC_ONCHAINKIT_API_KEY: {
    required: true,
    description: 'Coinbase Developer Platform API key',
    example: 'your_cdp_api_key_here'
  },
  
  // Smart Contract
  NEXT_PUBLIC_CONTRACT_ADDRESS: {
    required: false, // Can be set after contract deployment
    description: 'Deployed smart contract address on Base',
    example: '0x1234567890abcdef1234567890abcdef12345678'
  },
  
  // Optional but recommended
  GEMINI_API_KEY_2: {
    required: false,
    description: 'Secondary Gemini API key for load balancing',
    example: 'your_second_gemini_key'
  },
  
  GEMINI_API_KEY_3: {
    required: false,
    description: 'Third Gemini API key for load balancing',
    example: 'your_third_gemini_key'
  },
  
  // App Configuration
  NEXT_PUBLIC_URL: {
    required: false,
    description: 'Your app URL (for production)',
    example: 'https://your-app.vercel.app'
  },
  
  NEXT_PUBLIC_ONCHAINKIT_PROJECT_NAME: {
    required: false,
    description: 'Your app name for OnchainKit',
    example: 'VoiceDiary'
  }
}

function checkEnvironmentVariables() {
  console.log('🔍 Checking environment variables...')
  console.log('=====================================')
  
  let hasErrors = false
  let hasWarnings = false
  
  // Check each required variable
  for (const [varName, config] of Object.entries(requiredEnvVars)) {
    const value = process.env[varName]
    
    if (config.required && !value) {
      console.log(`❌ MISSING REQUIRED: ${varName}`)
      console.log(`   Description: ${config.description}`)
      console.log(`   Example: ${config.example}`)
      console.log('')
      hasErrors = true
    } else if (config.required && value) {
      console.log(`✅ ${varName}: configured`)
    } else if (!config.required && !value) {
      console.log(`⚠️  OPTIONAL: ${varName} (not set)`)
      console.log(`   Description: ${config.description}`)
      console.log('')
      hasWarnings = true
    } else {
      console.log(`✅ ${varName}: configured`)
    }
  }
  
  // Additional validations
  console.log('\n🔧 Additional validations...')
  
  // Check DATABASE_URL format
  if (process.env.DATABASE_URL) {
    if (!process.env.DATABASE_URL.startsWith('postgresql://') && !process.env.DATABASE_URL.startsWith('postgres://')) {
      console.log('⚠️  DATABASE_URL should start with postgresql:// or postgres://')
      hasWarnings = true
    }
  }
  
  // Check if we're in production without contract address
  if (process.env.NODE_ENV === 'production' && !process.env.NEXT_PUBLIC_CONTRACT_ADDRESS) {
    console.log('⚠️  Production deployment without NEXT_PUBLIC_CONTRACT_ADDRESS')
    console.log('   Smart contract features will not work until this is set')
    hasWarnings = true
  }
  
  // Summary
  console.log('\n📋 Environment Check Summary')
  console.log('============================')
  
  if (hasErrors) {
    console.log('❌ ERRORS FOUND: Missing required environment variables')
    console.log('   Please set the missing variables before starting the application')
    return false
  } else if (hasWarnings) {
    console.log('⚠️  WARNINGS: Some optional variables are not set')
    console.log('   The app will work but some features may be limited')
    console.log('✅ All required variables are configured')
    return true
  } else {
    console.log('✅ All environment variables are properly configured!')
    return true
  }
}

function generateEnvTemplate() {
  console.log('\n📝 Environment Template (.env.local)')
  console.log('===================================')
  
  for (const [varName, config] of Object.entries(requiredEnvVars)) {
    const status = config.required ? 'REQUIRED' : 'OPTIONAL'
    console.log(`# ${status}: ${config.description}`)
    console.log(`${varName}=${config.example}`)
    console.log('')
  }
}

function main() {
  console.log('🎯 Voice Diary Environment Checker')
  console.log('==================================')
  
  const isValid = checkEnvironmentVariables()
  
  if (!isValid) {
    console.log('\n💡 Need help setting up environment variables?')
    generateEnvTemplate()
    process.exit(1)
  }
  
  console.log('\n🎉 Environment check passed!')
  console.log('✅ Your Voice Diary app is ready to start')
}

// Handle script execution
if (require.main === module) {
  main()
}

module.exports = { checkEnvironmentVariables, generateEnvTemplate }