import { get } from '../client';

export type ReadinessReport = {
  status: 'ready' | 'degraded';
  env: string;
  checks: { database: { ok: true; latencyMs: number } | { ok: false; error: string } };
};

export const fetchReadiness = () => get<ReadinessReport>('/health/ready');
