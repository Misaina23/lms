import AsyncStorage from '@react-native-async-storage/async-storage';

const QUEUE_KEY = '@lms:offline-queue';

export type QueuedItem = {
  id: string;
  type: 'ATTENDANCE' | 'NOTE' | 'MESSAGE';
  payload: Record<string, any>;
  createdAt: string;
};

export const offlineQueue = {
  async enqueue(item: Omit<QueuedItem, 'id' | 'createdAt'>) {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    const list: QueuedItem[] = raw ? JSON.parse(raw) : [];
    list.push({ ...item, id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, createdAt: new Date().toISOString() });
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(list));
  },

  async list(): Promise<QueuedItem[]> {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  },

  async count(): Promise<number> {
    return (await this.list()).length;
  },

  async clear() {
    await AsyncStorage.removeItem(QUEUE_KEY);
  },

  async remove(id: string) {
    const list = await this.list();
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(list.filter((i) => i.id !== id)));
  },
};

const CACHE_PREFIX = '@lms:cache:';

export const cache = {
  async get<T>(key: string): Promise<T | null> {
    const raw = await AsyncStorage.getItem(CACHE_PREFIX + key);
    return raw ? (JSON.parse(raw) as T) : null;
  },
  async set<T>(key: string, value: T) {
    await AsyncStorage.setItem(CACHE_PREFIX + key, JSON.stringify(value));
  },
  async clear(key: string) {
    await AsyncStorage.removeItem(CACHE_PREFIX + key);
  },
};
