import storage, { LocalStorage } from 'node-persist';

export class StorageLayer {
  private storage!: LocalStorage;

  constructor(private persistPath: string) { }

  async init() {
    this.storage = await storage.create({
      dir: this.persistPath,
      logging: true,
    });
    await this.storage.init();
  }

  async getItem<T>(key: string): Promise<T> {
    return this.storage.getItem(key);
  }

  async setItem<T>(key: string, value: T): Promise<void> {
    await this.storage.setItem(key, value);
  }

  async removeItem(key: string): Promise<void> {
    await this.storage.removeItem(key);
  }
}

