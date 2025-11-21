#!/usr/bin/env node

/**
 * Environment Variables Validation Script
 * Checks if all required environment variables are set
 */

const requiredEnvVars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'NEXT_PUBLIC_APP_URL',
];

const optionalEnvVars = [];

function validateEnv() {
  console.log('🔍 Checking environment variables...\n');
  
  let allValid = true;
  const missing = [];
  const present = [];

  requiredEnvVars.forEach((varName) => {
    const value = process.env[varName];
    if (!value || value.trim() === '') {
      missing.push(varName);
      allValid = false;
      console.log(`❌ ${varName} - MISSING`);
    } else {
      present.push(varName);
      // Mask sensitive values
      const displayValue = varName.includes('KEY') || varName.includes('SECRET')
        ? `${value.substring(0, 10)}...${value.substring(value.length - 4)}`
        : value;
      console.log(`✅ ${varName} - ${displayValue}`);
    }
  });

  console.log('\n');

  if (allValid) {
    console.log('✅ All required environment variables are set!\n');
    
    // Additional validation
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (supabaseUrl && !supabaseUrl.startsWith('https://')) {
      console.log('⚠️  Warning: NEXT_PUBLIC_SUPABASE_URL should start with https://');
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (appUrl && !appUrl.startsWith('http://') && !appUrl.startsWith('https://')) {
      console.log('⚠️  Warning: NEXT_PUBLIC_APP_URL should start with http:// or https://');
    }

    console.log('\n📋 Environment Variables Summary:');
    console.log(`   Required: ${requiredEnvVars.length} (all present)`);
    console.log(`   Optional: ${optionalEnvVars.length}`);
    
    return 0;
  } else {
    console.log('❌ Missing required environment variables:\n');
    missing.forEach((varName) => {
      console.log(`   - ${varName}`);
    });
    console.log('\n💡 Make sure your .env.local file contains all required variables.');
    console.log('   See .env.example or README.md for the required format.\n');
    return 1;
  }
}

// Load .env.local directly
const fs = require('fs');
const path = require('path');

const envPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach((line) => {
    const trimmedLine = line.trim();
    if (trimmedLine && !trimmedLine.startsWith('#')) {
      const match = trimmedLine.match(/^([^=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        let value = match[2].trim();
        // Remove quotes if present
        if ((value.startsWith('"') && value.endsWith('"')) || 
            (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        process.env[key] = value;
      }
    }
  });
}

const exitCode = validateEnv();
process.exit(exitCode);

