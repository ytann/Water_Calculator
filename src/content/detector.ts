import type { IPlatformDetector, PlatformConfig } from '../shared/types';

export class PlatformDetector implements IPlatformDetector {
  constructor(private platforms: PlatformConfig[] = []) {}

  resolve(): PlatformConfig | null {
    const hostname = window.location.hostname;

    for (const platform of this.platforms) {
      if (!hostname.includes(platform.urlMatch)) continue;

      const element = document.querySelector(platform.selectors.messages);
      if (element) return platform;
    }

    return null;
  }

  register(config: PlatformConfig): void {
    const existing = this.platforms.findIndex((p) => p.id === config.id);
    if (existing >= 0) {
      this.platforms[existing] = config;
    } else {
      this.platforms.push(config);
    }
  }
}
