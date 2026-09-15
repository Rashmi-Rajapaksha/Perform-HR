/**
 * Integration tests for authentication endpoints. These run against the
 * real Express app + a MySQL test database (see backend/src/config/
 * sequelize-cli.config.js -> `test` environment, which points at
 * `<DB_NAME>_test`). Run `npm run migrate` and `npm run seed` against
 * that test database before running `npm test`.
 */
const request = require('supertest');

process.env.NODE_ENV = 'test';
const app = require('../src/app');

describe('POST /api/v1/auth/login', () => {
  test('rejects missing credentials with a validation error', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({});
    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
  });

  test('rejects invalid credentials', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({ username: 'nonexistent_user', password: 'wrongpassword' });
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  test('logs in successfully with seeded admin credentials and returns a token', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({ username: 'admin', password: 'Admin@12345' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('accessToken');
    expect(res.body.data.user).not.toHaveProperty('password_hash');
  });
});

describe('GET /api/v1/auth/me', () => {
  test('rejects requests without a bearer token', async () => {
    const res = await request(app).get('/api/v1/auth/me');
    expect(res.status).toBe(401);
  });

  test('returns the current user profile for a valid token', async () => {
    const loginRes = await request(app).post('/api/v1/auth/login').send({ username: 'admin', password: 'Admin@12345' });
    const token = loginRes.body.data.accessToken;

    const res = await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.username).toBe('admin');
  });
});
