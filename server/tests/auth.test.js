const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../app');
const User = require('../models/User');
const db = require('./helpers/db');
const { makeUser, agentFor, PASSWORD } = require('./helpers/factory');

beforeAll(() => db.connect('auth'));
afterAll(() => db.close());
beforeEach(() => db.clear());

const valid = { name: 'Milan Kumar', email: 'milan@example.com', password: PASSWORD };

describe('POST /api/auth/register', () => {
  it('creates a customer, sets an httpOnly cookie and never returns the password', async () => {
    const res = await request(app).post('/api/auth/register').send(valid);
    expect(res.status).toBe(201);
    expect(res.body.data.user).toMatchObject({ email: 'milan@example.com', role: 'customer' });
    expect(res.body.data.user.password).toBeUndefined();
    const cookie = res.headers['set-cookie'][0];
    expect(cookie).toMatch(/^token=/);
    expect(cookie).toMatch(/HttpOnly/i);
  });

  it('stores a bcrypt hash, not the plain password', async () => {
    await request(app).post('/api/auth/register').send(valid);
    const stored = await User.findOne({ email: valid.email }).select('+password');
    expect(stored.password).not.toBe(PASSWORD);
    expect(stored.password).toMatch(/^\$2[aby]\$/);
  });

  it('cannot be used to create an admin', async () => {
    const res = await request(app).post('/api/auth/register').send({ ...valid, role: 'admin' });
    expect(res.status).toBe(201);
    expect(res.body.data.user.role).toBe('customer');
  });

  it('treats emails case-insensitively and rejects duplicates with 409', async () => {
    await request(app).post('/api/auth/register').send({ ...valid, email: 'MILAN@Example.com' }).expect(201);
    const res = await request(app).post('/api/auth/register').send(valid);
    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
  });

  it.each([
    ['short password', { password: 'Ab1' }],
    ['no number in password', { password: 'OnlyLetters' }],
    ['no letter in password', { password: '12345678' }],
    ['bad email', { email: 'not-an-email' }],
    ['short name', { name: 'M' }],
    ['bad phone', { phone: 'abc' }],
  ])('rejects %s with 422 and field errors', async (_label, patch) => {
    const res = await request(app).post('/api/auth/register').send({ ...valid, ...patch });
    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
    expect(res.body.errors.length).toBeGreaterThan(0);
  });
});

describe('POST /api/auth/login', () => {
  it('logs in with correct credentials', async () => {
    const user = await makeUser();
    const res = await request(app).post('/api/auth/login').send({ email: user.email, password: PASSWORD });
    expect(res.status).toBe(200);
    expect(res.headers['set-cookie'][0]).toMatch(/^token=/);
  });

  it('gives the same 401 for a wrong password and an unknown email (no account enumeration)', async () => {
    const user = await makeUser();
    const wrongPw = await request(app).post('/api/auth/login').send({ email: user.email, password: 'WrongPass1' });
    const noUser = await request(app).post('/api/auth/login').send({ email: 'nobody@example.com', password: PASSWORD });
    expect(wrongPw.status).toBe(401);
    expect(noUser.status).toBe(401);
    expect(wrongPw.body.message).toBe(noUser.body.message);
  });

  it('refuses disabled accounts with 403', async () => {
    const user = await makeUser({ isActive: false });
    const res = await request(app).post('/api/auth/login').send({ email: user.email, password: PASSWORD });
    expect(res.status).toBe(403);
  });

  it('rejects a malformed body with 422', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'x' });
    expect(res.status).toBe(422);
  });

  it('is not fooled by a NoSQL operator in the email field', async () => {
    await makeUser();
    const res = await request(app).post('/api/auth/login').send({ email: { $gt: '' }, password: PASSWORD });
    expect([401, 422]).toContain(res.status);
  });
});

describe('GET /api/auth/me and logout (protected routes)', () => {
  it('returns the logged-in user', async () => {
    const user = await makeUser();
    const agent = await agentFor(user);
    const res = await agent.get('/api/auth/me');
    expect(res.status).toBe(200);
    expect(res.body.data.user.email).toBe(user.email);
    expect(res.body.data.user.password).toBeUndefined();
  });

  it('401 without a cookie', async () => {
    expect((await request(app).get('/api/auth/me')).status).toBe(401);
  });

  it('401 for a garbage token and for a token signed with the wrong secret', async () => {
    const user = await makeUser();
    expect((await request(app).get('/api/auth/me').set('Authorization', 'Bearer garbage')).status).toBe(401);
    const forged = jwt.sign({ id: user._id }, 'some-other-secret');
    expect((await request(app).get('/api/auth/me').set('Authorization', `Bearer ${forged}`)).status).toBe(401);
  });

  it('401 for a valid token whose user no longer exists', async () => {
    const user = await makeUser();
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);
    await User.deleteOne({ _id: user._id });
    expect((await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`)).status).toBe(401);
  });

  it('401 once the account is disabled, even with a valid session', async () => {
    const user = await makeUser();
    const agent = await agentFor(user);
    await User.updateOne({ _id: user._id }, { isActive: false });
    expect((await agent.get('/api/auth/me')).status).toBe(401);
  });

  it('logout clears the cookie so the session ends', async () => {
    const user = await makeUser();
    const agent = await agentFor(user);
    const out = await agent.post('/api/auth/logout');
    expect(out.status).toBe(200);
    expect(out.headers['set-cookie'][0]).toMatch(/^token=;/);
    expect((await agent.get('/api/auth/me')).status).toBe(401);
  });
});

describe('error responses', () => {
  it('unknown routes return the standard JSON 404', async () => {
    const res = await request(app).get('/api/nope');
    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({ success: false });
  });
  it('malformed JSON returns 400, not a stack trace', async () => {
    const res = await request(app).post('/api/auth/login').set('Content-Type', 'application/json').send('{bad json');
    expect(res.status).toBe(400);
    expect(res.body.stack).toBeUndefined();
  });
});
