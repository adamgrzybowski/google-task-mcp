import { google, type Auth } from 'googleapis';

/**
 * Type definitions for Google Tasks API
 */

export interface GoogleTaskList {
  id: string;
  title: string;
  kind?: string;
  etag?: string;
  updated?: string;
  selfLink?: string;
}

export interface GoogleTask {
  id?: string;
  title: string;
  notes?: string;
  status?: 'needsAction' | 'completed';
  due?: string; // RFC3339 timestamp
  completed?: string; // RFC3339 timestamp
  updated?: string; // RFC3339 timestamp
  selfLink?: string;
  position?: string;
  kind?: string;
  etag?: string;
  parent?: string;
  hidden?: boolean;
  deleted?: boolean;
}

export interface CreateTaskRequest {
  title: string;
  notes?: string;
  due?: string; // RFC3339 timestamp
  status?: 'needsAction' | 'completed';
}

export interface UpdateTaskRequest {
  title?: string;
  notes?: string;
  due?: string; // RFC3339 timestamp
  status?: 'needsAction' | 'completed';
}

/**
 * Options for creating GoogleTasksService
 */
export type GoogleTasksServiceOptions =
  | {
      // Mode 1: Using refresh token (original mode for stdio/local)
      mode: 'refresh_token';
      refreshToken: string;
      clientId: string;
      clientSecret: string;
    }
  | {
      // Mode 2: Using access token (for HTTP with OAuth)
      mode: 'access_token';
      accessToken: string;
    };

export class GoogleTasksService {
  private auth: Auth.OAuth2Client;
  private tasksApi: ReturnType<typeof google.tasks>;

  constructor(options: GoogleTasksServiceOptions) {
    this.auth = new google.auth.OAuth2();

    if (options.mode === 'refresh_token') {
      // Original mode: use refresh token with client credentials
      this.auth = new google.auth.OAuth2(
        options.clientId,
        options.clientSecret
      );
      this.auth.setCredentials({
        refresh_token: options.refreshToken,
      });
    } else {
      // Access token mode: just set the access token directly
      this.auth.setCredentials({
        access_token: options.accessToken,
      });
    }

    this.tasksApi = google.tasks('v1');
  }

  /**
   * Create service from refresh token (for backward compatibility)
   */
  static fromRefreshToken(
    refreshToken: string,
    clientId: string,
    clientSecret: string
  ): GoogleTasksService {
    return new GoogleTasksService({
      mode: 'refresh_token',
      refreshToken,
      clientId,
      clientSecret,
    });
  }

  /**
   * Create service from access token (for OAuth flow)
   */
  static fromAccessToken(accessToken: string): GoogleTasksService {
    return new GoogleTasksService({
      mode: 'access_token',
      accessToken,
    });
  }

  /**
   * Create service from environment variables
   * Requires GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN
   */
  static fromEnv(): GoogleTasksService {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

    if (!clientId || !clientSecret || !refreshToken) {
      throw new Error(
        'Missing required environment variables: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN'
      );
    }

    return GoogleTasksService.fromRefreshToken(
      refreshToken,
      clientId,
      clientSecret
    );
  }

  /**
   * Get all task lists for the authenticated user
   */
  async getTaskLists(): Promise<GoogleTaskList[]> {
    try {
      const response = await this.tasksApi.tasklists.list({
        auth: this.auth,
      });

      if (!response.data.items) {
        return [];
      }

      return response.data.items.map((item) => ({
        id: item.id || '',
        title: item.title || '',
        kind: item.kind ?? undefined,
        etag: item.etag ?? undefined,
        updated: item.updated ?? undefined,
        selfLink: item.selfLink ?? undefined,
      }));
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to fetch task lists: ${error.message}`);
      }
      throw new Error('Failed to fetch task lists: Unknown error');
    }
  }

  /**
   * Create a new task in the specified task list
   * @param listId - The ID of the task list (defaults to '@default' for primary list)
   * @param task - Task data to create
   */
  async createTask(
    task: CreateTaskRequest,
    listId: string = '@default'
  ): Promise<GoogleTask> {
    try {
      const response = await this.tasksApi.tasks.insert({
        auth: this.auth,
        tasklist: listId,
        requestBody: {
          title: task.title.trim(),
          notes: task.notes?.trim(),
          due: task.due,
          status: task.status || 'needsAction',
        },
      });

      const createdTask = response.data;

      return {
        id: createdTask.id ?? undefined,
        title: createdTask.title || task.title,
        notes: createdTask.notes ?? undefined,
        status: createdTask.status as 'needsAction' | 'completed' | undefined,
        due: createdTask.due ?? undefined,
        completed: createdTask.completed ?? undefined,
        updated: createdTask.updated ?? undefined,
        selfLink: createdTask.selfLink ?? undefined,
        position: createdTask.position ?? undefined,
        kind: createdTask.kind ?? undefined,
        etag: createdTask.etag ?? undefined,
        parent: createdTask.parent ?? undefined,
        hidden: createdTask.hidden ?? undefined,
        deleted: createdTask.deleted ?? undefined,
      };
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to create task: ${error.message}`);
      }
      throw new Error('Failed to create task: Unknown error');
    }
  }

  /**
   * Get all tasks from the specified task list
   * @param listId - The ID of the task list (defaults to '@default' for primary list)
   */
  async getTasks(listId: string = '@default'): Promise<GoogleTask[]> {
    try {
      const response = await this.tasksApi.tasks.list({
        auth: this.auth,
        tasklist: listId,
      });

      if (!response.data.items) {
        return [];
      }

      return response.data.items.map((item) => ({
        id: item.id ?? undefined,
        title: item.title || '',
        notes: item.notes ?? undefined,
        status: item.status as 'needsAction' | 'completed' | undefined,
        due: item.due ?? undefined,
        completed: item.completed ?? undefined,
        updated: item.updated ?? undefined,
        selfLink: item.selfLink ?? undefined,
        position: item.position ?? undefined,
        kind: item.kind ?? undefined,
        etag: item.etag ?? undefined,
        parent: item.parent ?? undefined,
        hidden: item.hidden ?? undefined,
        deleted: item.deleted ?? undefined,
      }));
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to fetch tasks: ${error.message}`);
      }
      throw new Error('Failed to fetch tasks: Unknown error');
    }
  }

  /**
   * Update an existing task in the specified task list
   * @param listId - The ID of the task list
   * @param taskId - The ID of the task to update
   * @param updates - Task data to update
   */
  async updateTask(
    listId: string,
    taskId: string,
    updates: UpdateTaskRequest
  ): Promise<GoogleTask> {
    try {
      const response = await this.tasksApi.tasks.update({
        auth: this.auth,
        tasklist: listId,
        task: taskId,
        requestBody: {
          id: taskId,
          title: updates.title?.trim(),
          notes: updates.notes?.trim(),
          due: updates.due,
          status: updates.status,
        },
      });

      const updatedTask = response.data;

      return {
        id: updatedTask.id ?? undefined,
        title: updatedTask.title || '',
        notes: updatedTask.notes ?? undefined,
        status: updatedTask.status as 'needsAction' | 'completed' | undefined,
        due: updatedTask.due ?? undefined,
        completed: updatedTask.completed ?? undefined,
        updated: updatedTask.updated ?? undefined,
        selfLink: updatedTask.selfLink ?? undefined,
        position: updatedTask.position ?? undefined,
        kind: updatedTask.kind ?? undefined,
        etag: updatedTask.etag ?? undefined,
        parent: updatedTask.parent ?? undefined,
        hidden: updatedTask.hidden ?? undefined,
        deleted: updatedTask.deleted ?? undefined,
      };
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to update task: ${error.message}`);
      }
      throw new Error('Failed to update task: Unknown error');
    }
  }

  /**
   * Delete a task from the specified task list
   * @param listId - The ID of the task list
   * @param taskId - The ID of the task to delete
   */
  async deleteTask(listId: string, taskId: string): Promise<void> {
    try {
      await this.tasksApi.tasks.delete({
        auth: this.auth,
        tasklist: listId,
        task: taskId,
      });
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to delete task: ${error.message}`);
      }
      throw new Error('Failed to delete task: Unknown error');
    }
  }

  /**
   * Check if the service can connect to Google Tasks API
   * This is useful for health checks
   */
  async checkConnection(): Promise<{ connected: boolean; error?: string }> {
    try {
      // Try to fetch task lists as a lightweight connection test
      await this.tasksApi.tasklists.list({
        auth: this.auth,
        maxResults: 1,
      });
      return { connected: true };
    } catch (error) {
      return {
        connected: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}
