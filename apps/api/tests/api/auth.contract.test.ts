import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp, API_PREFIX } from '../../src/app.js';

const app = createApp();
const auth = `${API_PREFIX}/auth`;
const csrf = { 'x-requested-with': 'grovia-web' };

/**
 * These exercise the guard rails in front of the database: CSRF, validation and
 * authentication. The database-backed flows are covered in phase 13 against a
 * real Postgres via Testcontainers.
 */
describe('auth route guards', () => {
  it('refuses a request without the same-site header', async () => {
    const res = await request(app).post(`${auth}/login`).send({ email: 'a@b.co', password: 'x' });
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('rejects a malformed registration before touching the database', async () => {
    const res = await request(app)
      .post(`${auth}/register`)
      .set(csrf)
      .send({ name: 'A', email: 'not-an-email', password: 'short' });

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('VALIDATION_FAILED');
    const paths = (res.body.error.details as { path: string }[]).map((d) => d.path);
    expect(paths).toEqual(expect.arrayContaining(['name', 'email', 'password']));
  });

  it('requires a letter and a digit in the password', async () => {
    const res = await request(app)
      .post(`${auth}/register`)
      .set(csrf)
      .send({ name: 'Aarthi N', email: 'aarthi@grovia.test', password: 'passwordpassword' });

    expect(res.status).toBe(422);
    expect(JSON.stringify(res.body.error.details)).toContain('one letter and one number');
  });

  it('rejects a phone number that is not a 10-digit Indian mobile', async () => {
    const res = await request(app)
      .post(`${auth}/register`)
      .set(csrf)
      .send({ name: 'Aarthi N', email: 'aarthi@grovia.test', password: 'greengrocer1', phone: '12345' });

    expect(res.status).toBe(422);
  });

  it('refuses /me without a bearer token', async () => {
    const res = await request(app).get(`${auth}/me`).set(csrf);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHENTICATED');
  });

  it('refuses /me with a token that is not a JWT', async () => {
    const res = await request(app).get(`${auth}/me`).set(csrf).set('authorization', 'Bearer nope');
    expect(res.status).toBe(401);
  });

  it('treats a missing refresh cookie as an ended session, not a server error', async () => {
    const res = await request(app).post(`${auth}/refresh`).set(csrf);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHENTICATED');
  });

  it('validates the address before starting a password reset', async () => {
    // The non-enumeration behaviour itself (identical 202 for known and unknown
    // addresses) needs a database and is covered in phase 13.
    const res = await request(app).post(`${auth}/forgot-password`).set(csrf).send({ email: 'nope' });
    expect(res.status).toBe(422);
  });
});
