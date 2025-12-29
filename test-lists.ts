/**
 * Simple test script to list all task lists and create a test task
 *
 * Usage: bun run test-lists.ts
 *
 * This test will:
 * 1. List all task lists (READ operation)
 * 2. Create a "hello world" task in the configured list (WRITE operation)
 */

import { GoogleTasksService } from './src/services/GoogleTasksService.js';
import { config } from './config.js';

async function testLists() {
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

  console.log('📋 Fetching task lists...\n');

  try {
    const service = GoogleTasksService.fromRefreshToken(
      refreshToken,
      clientId,
      clientSecret
    );
    const taskLists = await service.getTaskLists();

    console.log(`✅ Success! Found ${taskLists.length} task list(s):\n`);

    if (taskLists.length === 0) {
      console.log('   (No task lists found)');
      console.log('\n⚠️  Cannot create test task - no task lists available');
    } else {
      taskLists.forEach((list, index) => {
        console.log(`   ${index + 1}. ${list.title}`);
        console.log(`      ID: ${list.id}`);
        if (list.updated) {
          console.log(`      Updated: ${list.updated}`);
        }
        console.log('');
      });

      // Find the target list by name
      let targetList = taskLists.find(
        (list) => list.title === config.TARGET_LIST_NAME
      );

      if (!targetList) {
        if (
          config.FALLBACK_TO_FIRST_LIST &&
          taskLists.length > 0 &&
          taskLists[0]
        ) {
          targetList = taskLists[0];
          console.log(
            `⚠️  Target list "${config.TARGET_LIST_NAME}" not found, using first list: "${targetList.title}"\n`
          );
        } else {
          console.error(
            `❌ Target list "${config.TARGET_LIST_NAME}" not found!`
          );
          console.error('   Available lists:');
          taskLists.forEach((list) => {
            console.error(`     - ${list.title}`);
          });
          console.error(
            `\n   Please update TARGET_LIST_NAME in config.ts to match one of the above lists.`
          );
          process.exit(1);
        }
      }

      // Create a test task in the target list
      if (targetList) {
        console.log(
          `➕ Creating test task "hello world" in "${targetList.title}"...\n`
        );

        try {
          if (!targetList) {
            throw new Error('Target list not found');
          }

          const task = await service.createTask(
            {
              title: 'hello world',
              notes: 'Test task created by test-lists.ts',
            },
            targetList.id
          );

          console.log('✅ Task created successfully!');
          console.log(`   Title: ${task.title}`);
          if (task.id) {
            console.log(`   ID: ${task.id}`);
          }
          if (task.status) {
            console.log(`   Status: ${task.status}`);
          }
          console.log('');
        } catch (error) {
          console.error('❌ Failed to create task:');
          if (error instanceof Error) {
            console.error(`   ${error.message}`);
          } else {
            console.error('   Unknown error:', error);
          }
        }
      }
    }

    console.log('✨ Test completed successfully!');
  } catch (error) {
    console.error('\n❌ Test failed:');
    if (error instanceof Error) {
      console.error(`   ${error.message}`);
    } else {
      console.error('   Unknown error:', error);
    }
    process.exit(1);
  }
}

testLists();
