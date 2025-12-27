/**
 * Test script to verify Google Tasks API connection
 *
 * Usage: bun run test-connection.ts
 *
 * Make sure you have .env file with:
 * - GOOGLE_CLIENT_ID
 * - GOOGLE_CLIENT_SECRET
 * - GOOGLE_REFRESH_TOKEN
 *
 * Note: Bun automatically loads .env files, so variables should be available in process.env
 */

import { GoogleTasksService } from './src/services/GoogleTasksService.js';

async function testConnection() {
  // Bun automatically loads .env files, so variables should be in process.env
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    console.error('❌ Missing required environment variables:');
    console.error('   - GOOGLE_CLIENT_ID:', clientId ? '✓' : '✗');
    console.error('   - GOOGLE_CLIENT_SECRET:', clientSecret ? '✓' : '✗');
    console.error('   - GOOGLE_REFRESH_TOKEN:', refreshToken ? '✓' : '✗');
    console.error('\nPlease create a .env file with these variables.');
    process.exit(1);
  }

  console.log('🔌 Testing Google Tasks API connection...\n');

  try {
    const service = new GoogleTasksService(
      refreshToken,
      clientId,
      clientSecret
    );

    console.log('📋 Fetching task lists...');
    const taskLists = await service.getTaskLists();

    console.log(
      `✅ Connection successful! Found ${taskLists.length} task list(s):\n`
    );

    if (taskLists.length === 0) {
      console.log('   (No task lists found)');
    } else {
      taskLists.forEach((list, index) => {
        console.log(`   ${index + 1}. ${list.title} (ID: ${list.id})`);
      });
    }

    console.log('\n✨ Test completed successfully!');
  } catch (error) {
    console.error('\n❌ Connection test failed:');
    if (error instanceof Error) {
      console.error(`   ${error.message}`);
    } else {
      console.error('   Unknown error:', error);
    }
    process.exit(1);
  }
}

testConnection();
