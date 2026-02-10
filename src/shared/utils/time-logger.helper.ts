import { DecimalHelper } from './decimal.helper';

export interface TimingRecord {
  start: number;
  end?: number;
  duration?: number;
}

export interface TimingMap {
  [key: string]: TimingRecord;
}

export class TimeLogger {
  initializeTiming(): TimingMap {
    return {};
  }

  startTiming(timing: TimingMap, key: string): void {
    timing[key] = { start: Date.now() };
  }

  endTiming(timing: TimingMap, key: string): void {
    timing[key].end = Date.now();
    timing[key].duration = timing[key].end - timing[key].start;
  }

  formatDuration(duration?: number): string {
    if (!duration) return '0ms';
    if (duration < 1000) return `${duration}ms`;
    return `${DecimalHelper.formatTime(duration / 1000)}s`;
  }
}
