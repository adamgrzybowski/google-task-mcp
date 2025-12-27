/**
 * Script to obtain OAuth 2.0 refresh token for Google Tasks API
 *
 * This script helps you get a refresh token for your private Google account.
 *
 * Usage:
 * 1. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env
 * 2. Run: bun run get-oauth-token.ts
 * 3. Follow the instructions to authorize and get your refresh token
 */

import { google } from 'googleapis';
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
function loadEnv() {
  try {
    const envPath = join(__dirname, '.env');
    const envContent = readFileSync(envPath, 'utf-8');
    const env: Record<string, string> = {};

    envContent.split('\n').forEach((line) => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=');
        if (key && valueParts.length > 0) {
          env[key.trim()] = valueParts
            .join('=')
            .trim()
            .replace(/^["']|["']$/g, '');
        }
      }
    });

    return env;
  } catch {
    return {};
  }
}

async function getRefreshToken() {
  const env = loadEnv();
  const clientId = process.env.GOOGLE_CLIENT_ID || env.GOOGLE_CLIENT_ID;
  const clientSecret =
    process.env.GOOGLE_CLIENT_SECRET || env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.error('❌ Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET');
    console.error('\nPlease set these in your .env file:');
    console.error('  GOOGLE_CLIENT_ID=your_client_id');
    console.error('  GOOGLE_CLIENT_SECRET=your_client_secret');
    console.error(
      '\nTo get these credentials, see: https://console.cloud.google.com/apis/credentials'
    );
    process.exit(1);
  }

  const oauth2Client = new google.auth.OAuth2(
    clientId,
    clientSecret,
    'http://localhost:3000/oauth2callback' // Redirect URI
  );

  // Scopes required for Google Tasks API
  const scopes = ['https://www.googleapis.com/auth/tasks'];

  // Generate authorization URL
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline', // Required to get refresh token
    scope: scopes,
    prompt: 'consent', // Force consent screen to get refresh token
  });

  console.log('🔐 OAuth 2.0 Authorization\n');
  console.log('1. Open this URL in your browser:');
  console.log(`\n   ${authUrl}\n`);
  console.log('2. Sign in with your Google account');
  console.log('3. Grant permission to access Google Tasks');
  console.log('4. Copy the authorization code from the redirect URL\n');
  console.log('   The redirect URL will look like:');
  console.log('   http://localhost:3000/oauth2callback?code=4/0A...\n');
  console.log('5. Paste the authorization code below:\n');

  // Read authorization code from stdin
  const readline = await import('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  rl.question('Authorization code: ', async (code) => {
    rl.close();

    try {
      const { tokens } = await oauth2Client.getToken(code.trim());

      if (!tokens.refresh_token) {
        console.error('\n❌ No refresh token received. Make sure you:');
        console.error('   - Used access_type=offline');
        console.error('   - Used prompt=consent');
        console.error('   - Are authorizing for the first time');
        process.exit(1);
      }

      console.log('\n✅ Successfully obtained tokens!\n');
      console.log('Your refresh token:');
      console.log(`  ${tokens.refresh_token}\n`);
      console.log('Add this to your .env file:');
      console.log(`  GOOGLE_REFRESH_TOKEN=${tokens.refresh_token}\n`);

      // Optionally save to .env
      try {
        const envPath = join(__dirname, '.env');
        let envContent = '';
        try {
          envContent = readFileSync(envPath, 'utf-8');
        } catch {
          // File doesn't exist, that's OK
        }

        if (!envContent.includes('GOOGLE_REFRESH_TOKEN=')) {
          envContent += `\nGOOGLE_REFRESH_TOKEN=${tokens.refresh_token}\n`;
          writeFileSync(envPath, envContent);
          console.log('✅ Refresh token saved to .env file');
        } else {
          console.log('⚠️  .env already contains GOOGLE_REFRESH_TOKEN');
          console.log('   Please update it manually with the token above');
        }
      } catch {
        console.log('⚠️  Could not auto-save to .env, please add manually');
      }
    } catch (error) {
      console.error('\n❌ Failed to exchange authorization code:');
      if (error instanceof Error) {
        console.error(`   ${error.message}`);
      }
      process.exit(1);
    }
  });
}

getRefreshToken();
