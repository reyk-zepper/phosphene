import { DEFAULT_HOSTED_SESSION_BASE_PATH } from '@/core/history/hostedSession';
import { DEFAULT_CANARY_STATUS_BASE_PATH } from '@/core/traces/canaryStatus';
import { DEFAULT_LIVE_ADAPTER_BASE_PATH } from '@/core/traces/liveAdapter';
import { DEFAULT_PUBLISHED_SNAPSHOT_BASE_PATH } from '@/core/traces/snapshot';
import { withBasePath } from './routing';

export function getPublishedSnapshotBasePath(basePath: string): string {
  return withBasePath(DEFAULT_PUBLISHED_SNAPSHOT_BASE_PATH, basePath);
}

export function getCanaryStatusBasePath(basePath: string): string {
  return withBasePath(DEFAULT_CANARY_STATUS_BASE_PATH, basePath);
}

export function getLiveAdapterBasePath(basePath: string): string {
  return withBasePath(DEFAULT_LIVE_ADAPTER_BASE_PATH, basePath);
}

export function getHostedSessionBasePath(basePath: string): string {
  return withBasePath(DEFAULT_HOSTED_SESSION_BASE_PATH, basePath);
}
