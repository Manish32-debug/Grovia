import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp, API_PREFIX } from '../../src/app.js';

const app = createApp();

describe('health', () => {
  it('reports liveness without touching the database', async () => {
    const res = await request(app).get(`${API_PREFIX}/health/live`);
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('ok');
  });

  it('returns a structured error envelope for unknown routes', async () => {
    const res = await request(app).get(`${API_PREFIX}/definitely-not-a-route`);
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
    expect(res.body.error.requestId).toEqual(expect.any(String));
  });

  it('echoes a caller-supplied request id', async () => {
    const res = await request(app).get(`${API_PREFIX}/health/live`).set('x-request-id', 'abc-123');
    expect(res.headers['x-request-id']).toBe('abc-123');
  });
});
