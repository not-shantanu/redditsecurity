// Rate Limiting and Anti-Ban Measures

export interface RateLimitConfig {
  minDelay: number; // seconds
  maxDelay: number; // seconds
  dailyPostCap: number;
  currentDailyCount: number;
  lastPostDate: Date | null;
}

export class RateLimiter {
  private config: RateLimitConfig;

  constructor(config: RateLimitConfig) {
    this.config = config;
  }

  // Jitter Algorithm: Randomized delays between min and max
  getNextDelay(): number {
    const { minDelay, maxDelay } = this.config;
    return Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay;
  }

  // Account Warming: Daily post cap increases by 1 each day (max 20)
  updateDailyCap(): void {
    const today = new Date();
    const lastPostDate = this.config.lastPostDate;

    if (!lastPostDate) {
      // First day
      this.config.dailyPostCap = 2;
      this.config.currentDailyCount = 0;
      this.config.lastPostDate = today;
      return;
    }

    const daysSinceLastPost = Math.floor(
      (today.getTime() - lastPostDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysSinceLastPost >= 1) {
      // New day - reset count and potentially increase cap
      this.config.currentDailyCount = 0;
      this.config.lastPostDate = today;
      
      if (this.config.dailyPostCap < 20) {
        this.config.dailyPostCap = Math.min(20, this.config.dailyPostCap + 1);
      }
    }
  }

  canPost(): boolean {
    this.updateDailyCap();
    return this.config.currentDailyCount < this.config.dailyPostCap;
  }

  recordPost(): void {
    this.config.currentDailyCount++;
  }

  getConfig(): RateLimitConfig {
    return { ...this.config };
  }

  setConfig(config: Partial<RateLimitConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

