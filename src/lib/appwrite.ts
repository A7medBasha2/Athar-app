import { Client, Account, Databases, Storage, ID, Query } from 'appwrite';

/**
 * Appwrite configuration for Athar (أثر) app
 * Connects to Cloud instance for Gamaa community, profiles, and media storage
 */
export const APPWRITE_CONFIG = {
  endpoint: 'https://fra.cloud.appwrite.io/v1',
  projectId: '6adb57990016715a02d2',
  databaseId: 'athar_db',
  bucketAvatarsId: 'avatars',
  collections: {
    posts: 'posts',
    comments: 'comments',
    likes: 'likes',
    campaigns: 'campaigns',
    profiles: 'profiles',
  },
};

// 1. Initialize Appwrite Client
export const client = new Client()
  .setEndpoint(APPWRITE_CONFIG.endpoint)
  .setProject(APPWRITE_CONFIG.projectId);

// 2. Export Appwrite Core Services
export const account = new Account(client);
export const databases = new Databases(client);
export const storage = new Storage(client);

// 3. Export Query and ID helpers
export { ID, Query };

export default client;
