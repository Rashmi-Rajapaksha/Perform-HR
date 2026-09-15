/**
 * Integration tests for the employee module. Requires the test database
 * to be migrated and seeded first (see auth.test.js header comment).
 */
const request = require('supertest');

process.env.NODE_ENV = 'test';
const app = require('../src/app');

let adminToken;

beforeAll(async () => {
  const loginRes = await request(app).post('/api/v1/auth/login').send({ username: 'admin', password: 'Admin@12345' });
  adminToken = loginRes.body.data.accessToken;
});

describe('GET /api/v1/employees', () => {
  test('rejects unauthenticated requests', async () => {
    const res = await request(app).get('/api/v1/employees');
    expect(res.status).toBe(401);
  });

  test('returns a paginated list of employees for an authorized user', async () => {
    const res = await request(app).get('/api/v1/employees').set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.meta).toHaveProperty('total');
  });

  test('supports filtering by department_id', async () => {
    const res = await request(app).get('/api/v1/employees?department_id=1').set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    res.body.data.forEach((emp) => expect(emp.department_id).toBe(1));
  });
});

describe('POST /api/v1/employees', () => {
  test('rejects a payload missing required fields', async () => {
    const res = await request(app)
      .post('/api/v1/employees')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ first_name: 'Incomplete' });
    expect(res.status).toBe(422);
  });
});

describe('GET /api/v1/employees/:id', () => {
  test('returns 404 for a non-existent employee', async () => {
    const res = await request(app).get('/api/v1/employees/999999').set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(404);
  });
});
