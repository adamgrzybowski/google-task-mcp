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

export class GoogleTasksService {
  private auth: Auth.OAuth2Client;
  private tasksApi: ReturnType<typeof google.tasks>;

  constructor(refreshToken: string, clientId: string, clientSecret: string) {
    this.auth = new google.auth.OAuth2(clientId, clientSecret);
    this.auth.setCredentials({
      refresh_token: refreshToken,
    });
    this.tasksApi = google.tasks('v1');
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
      // Validate input
      if (!task.title || task.title.trim().length === 0) {
        throw new Error('Task title is required');
      }

      if (task.title.length > 1024) {
        throw new Error('Task title must be 1024 characters or less');
      }

      if (task.notes && task.notes.length > 8192) {
        throw new Error('Task notes must be 8192 characters or less');
      }

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
}
