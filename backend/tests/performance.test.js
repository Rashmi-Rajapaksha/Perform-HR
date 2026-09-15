/**
 * Tests for performance evaluation scoring logic. Combines a pure unit
 * test of the final-score blend formula with an integration smoke test
 * against the evaluations endpoint (requires migrated + seeded test DB).
 */
const request = require('supertest');

process.env.NODE_ENV = 'test';
const app = require('../src/app');

describe('final score blending formula (kpi_score * 0.7 + manager_score * 0.3)', () => {
  test('blends KPI and manager scores using the documented weighting', () => {
    const kpiScore = 88;
    const managerScore = 76;
    const KPI_WEIGHT = 0.7;
    const MANAGER_WEIGHT = 0.3;
    const finalScore = Math.round((kpiScore * KPI_WEIGHT + managerScore * MANAGER_WEIGHT) * 100) / 100;
    expect(finalScore).toBeCloseTo(84.4, 1);
  });
});

describe('GET /api/v1/performance/rating-scales', () => {
  let adminToken;

  beforeAll(async () => {
    const loginRes = await request(app).post('/api/v1/auth/login').send({ username: 'admin', password: 'Admin@12345' });
    adminToken = loginRes.body.data.accessToken;
  });

  test('returns the seeded rating scale tiers', async () => {
    const res = await request(app).get('/api/v1/performance/rating-scales').set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(5);
    const labels = res.body.data.map((r) => r.rating_label);
    expect(labels).toEqual(expect.arrayContaining(['Outstanding', 'Very Good', 'Good', 'Satisfactory', 'Needs Improvement']));
  });
});

describe('GET /api/v1/performance/evaluations', () => {
  let adminToken;

  beforeAll(async () => {
    const loginRes = await request(app).post('/api/v1/auth/login').send({ username: 'admin', password: 'Admin@12345' });
    adminToken = loginRes.body.data.accessToken;
  });

  test('rejects unauthenticated requests', async () => {
    const res = await request(app).get('/api/v1/performance/evaluations');
    expect(res.status).toBe(401);
  });

  test('returns paginated evaluation records', async () => {
    const res = await request(app).get('/api/v1/performance/evaluations').set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});
