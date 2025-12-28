/**
 * Configuration file for Google Tasks MCP
 *
 * Edit the TARGET_LIST_NAME to specify which task list to use for operations.
 * The system will find the list by name and use it for all operations.
 */

export const config = {
  /**
   * Name of the task list to use for all operations
   * Set this to the exact name of your task list in Google Tasks
   */
  TARGET_LIST_NAME: '💪 Workout 💪', // Change this to your desired list name

  /**
   * If true, will fall back to the first available list if target list is not found
   */
  FALLBACK_TO_FIRST_LIST: false,
} as const;
