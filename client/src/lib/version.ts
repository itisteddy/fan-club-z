// Comprehensive version management system
// Centralized: import VERSION from shared
// Production-compatible version import
import pkg from '../../package.json';
import { mode, isProd } from '@/utils/environment';
const SHARED_VERSION: string = (pkg as any).version || '0.0.0';

const BASE_VERSION = SHARED_VERSION;

// Version management with support for major releases
export class VersionManager {
  private static instance: VersionManager;
  private currentVersion: string;

  private constructor() {
    this.currentVersion = BASE_VERSION;
  }

  static getInstance(): VersionManager {
    if (!VersionManager.instance) {
      VersionManager.instance = new VersionManager();
    }
    return VersionManager.instance;
  }

  // Get current version
  getVersion(): string {
    return this.currentVersion;
  }

  // Increment patch version (2.0.42 -> 2.0.43)
  incrementPatch(): string {
    const [majorRaw = 0, minorRaw = 0, patchRaw = 0] = this.currentVersion
      .split('.')
      .map((value) => Number(value) || 0);
    const major = Number.isFinite(majorRaw) ? majorRaw : 0;
    const minor = Number.isFinite(minorRaw) ? minorRaw : 0;
    const patch = Number.isFinite(patchRaw) ? patchRaw : 0;
    this.currentVersion = `${major}.${minor}.${patch + 1}`;
    return this.currentVersion;
  }

  // Increment minor version (2.0.42 -> 2.1.0)
  incrementMinor(): string {
    const [majorRaw = 0, minorRaw = 0] = this.currentVersion
      .split('.')
      .map((value) => Number(value) || 0);
    const major = Number.isFinite(majorRaw) ? majorRaw : 0;
    const minor = Number.isFinite(minorRaw) ? minorRaw : 0;
    this.currentVersion = `${major}.${minor + 1}.0`;
    return this.currentVersion;
  }

  // Increment major version (2.0.42 -> 3.0.0)
  incrementMajor(): string {
    const [majorRaw = 0] = this.currentVersion.split('.').map((value) => Number(value) || 0);
    const major = Number.isFinite(majorRaw) ? majorRaw : 0;
    this.currentVersion = `${major + 1}.0.0`;
    return this.currentVersion;
  }

  // Set version for major releases
  setVersion(version: string): void {
    this.currentVersion = version;
  }

  // Get version info for logging
  getVersionInfo() {
    return {
      version: this.currentVersion,
      buildTime: new Date().toISOString(),
      cacheBuster: `v${this.currentVersion}-${new Date().toISOString().split('T')[0]}-auto`,
      environment: mode,
      isProduction: isProd
    };
  }
}

// Export singleton instance
const versionManager = VersionManager.getInstance();

// Export current version and utilities
export const APP_VERSION = versionManager.getVersion();
export const BUILD_TIMESTAMP = new Date().toISOString();
export const CACHE_BUSTER = `v${APP_VERSION}-${new Date().toISOString().split('T')[0]}-auto`;

// Version info for console logging
export const getVersionInfo = () => versionManager.getVersionInfo();

// Auto-increment version for development
export const getNextVersion = () => versionManager.incrementPatch();

// For major releases, use this function
export const setMajorVersion = (version: string) => versionManager.setVersion(version);
