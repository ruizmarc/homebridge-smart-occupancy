import fs from 'fs';
import { type Logger } from 'homebridge';
import path from 'path';
import { fileURLToPath } from 'url';

export class VersionGetter {

  private version: string | null = null;

  private static instance: VersionGetter | null = null;

  public static getInstance(log: Logger): VersionGetter {
    if (VersionGetter.instance) {
      return VersionGetter.instance;
    }
    VersionGetter.instance = new VersionGetter(log);
    return VersionGetter.instance;
  }

  private constructor(private log: Logger) {
    this.version = null;
  }

  getVersion(): string {
    if (this.version) {
      return this.version;
    }
    try {
      this.version = this.getVersionFromPackageJson();
    } catch (error) {
      this.version = '0.0.0';
      this.log.error('Failed to get version from package.json:', error);
    }
    return this.version;
  }

  private getVersionFromPackageJson(): string {
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const packageJSONPath = path.join(__dirname, '../../package.json');
    return JSON.parse(fs.readFileSync(packageJSONPath, { encoding: 'utf8' })).version;
  }

}

