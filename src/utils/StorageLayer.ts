import storage, { LocalStorage } from 'node-persist';

export class StorageLayer {
  private storage!: LocalStorage;

  private static instance: StorageLayer | null = null;

  public static async getInstance(persistPath: string): Promise<StorageLayer> {
    if (StorageLayer.instance) {
      return StorageLayer.instance;
    }
    const storageLayer = new StorageLayer(persistPath);
    await storageLayer.init();
    return storageLayer;
  }

  private constructor(private persistPath: string) { }

  private async init() {
    this.storage = await storage.create({
      dir: this.persistPath,
      forgiveParseErrors: true,
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

