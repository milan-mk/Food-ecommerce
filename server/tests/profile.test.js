const request = require('supertest');
const app = require('../app');
const User = require('../models/User');
const db = require('./helpers/db');
const { makeUser, agentFor, ADDRESS, PASSWORD } = require('./helpers/factory');

let user, agent, other;
beforeAll(() => db.connect('profile'));
afterAll(() => db.close());
beforeEach(async () => {
  await db.clear();
  user = await makeUser({ name: 'Old Name', phone: '9876543210' });
  agent = await agentFor(user);
  other = await agentFor(await makeUser());
});

const addr = (over = {}) => ({ ...ADDRESS, ...over });
const saved = async () => (await User.findById(user._id)).addresses;

describe('PUT /api/auth/profile', () => {
  it('requires login', async () => {
    expect((await request(app).put('/api/auth/profile').send({ name: 'X Y' })).status).toBe(401);
  });
  it('updates name and phone, and can clear the phone', async () => {
    const res = await agent.put('/api/auth/profile').send({ name: 'New Name', phone: '9123456789' });
    expect(res.status).toBe(200);
    expect(res.body.data.user).toMatchObject({ name: 'New Name', phone: '9123456789' });
    const cleared = await agent.put('/api/auth/profile').send({ phone: '' });
    expect(cleared.body.data.user.phone).toBeUndefined();
  });
  it.each([['short name', { name: 'A' }], ['bad phone', { phone: 'abc' }], ['empty body', {}]])('rejects %s with 422', async (_l, body) => {
    expect((await agent.put('/api/auth/profile').send(body)).status).toBe(422);
  });
  it('cannot change email or role through this endpoint', async () => {
    await agent.put('/api/auth/profile').send({ name: 'Still Me', email: 'evil@example.com', role: 'admin' }).expect(200);
    const stored = await User.findById(user._id);
    expect(stored.email).toBe(user.email);
    expect(stored.role).toBe('customer');
  });
});

describe('PUT /api/auth/password', () => {
  const change = (body) => agent.put('/api/auth/password').send(body);
  it('requires login', async () => {
    expect((await request(app).put('/api/auth/password').send({ currentPassword: PASSWORD, newPassword: 'NewPassw0rd' })).status).toBe(401);
  });
  it('rejects a wrong current password with a field error', async () => {
    const res = await change({ currentPassword: 'WrongPass1', newPassword: 'NewPassw0rd' });
    expect(res.status).toBe(422);
    expect(res.body.errors[0].field).toBe('currentPassword');
  });
  it('rejects a weak new password and one equal to the current password', async () => {
    expect((await change({ currentPassword: PASSWORD, newPassword: 'short1' })).status).toBe(422);
    const same = await change({ currentPassword: PASSWORD, newPassword: PASSWORD });
    expect(same.status).toBe(422);
    expect(same.body.errors[0].field).toBe('newPassword');
  });
  it('changes the password: the new one works, the old one does not', async () => {
    const res = await change({ currentPassword: PASSWORD, newPassword: 'NewPassw0rd' });
    expect(res.status).toBe(200);
    expect(res.body.data.user.password).toBeUndefined();
    expect((await request(app).post('/api/auth/login').send({ email: user.email, password: 'NewPassw0rd' })).status).toBe(200);
    expect((await request(app).post('/api/auth/login').send({ email: user.email, password: PASSWORD })).status).toBe(401);
  });
});

describe('saved addresses', () => {
  it('requires login', async () => {
    expect((await request(app).post('/api/auth/addresses').send(addr())).status).toBe(401);
  });
  it('the first address becomes the default; a later default replaces it', async () => {
    const first = await agent.post('/api/auth/addresses').send(addr({ label: 'Home' }));
    expect(first.status).toBe(201);
    expect(first.body.data.user.addresses).toHaveLength(1);
    expect(first.body.data.user.addresses[0].isDefault).toBe(true);
    await agent.post('/api/auth/addresses').send(addr({ label: 'Work' })).expect(201);
    expect((await saved()).map((a) => a.isDefault)).toEqual([true, false]);
    await agent.post('/api/auth/addresses').send(addr({ label: 'Mum', isDefault: true })).expect(201);
    expect((await saved()).map((a) => [a.label, a.isDefault])).toEqual([['Home', false], ['Work', false], ['Mum', true]]);
  });
  it('validates address fields', async () => {
    const res = await agent.post('/api/auth/addresses').send(addr({ phone: 'abc', postalCode: '!', city: '' }));
    expect(res.status).toBe(422);
    expect(res.body.errors.length).toBeGreaterThanOrEqual(3);
  });
  it('allows at most 5 saved addresses', async () => {
    for (let i = 0; i < 5; i++) await agent.post('/api/auth/addresses').send(addr({ label: `A${i}` })).expect(201);
    expect((await agent.post('/api/auth/addresses').send(addr())).status).toBe(409);
  });
  it('updates an address and can move the default', async () => {
    await agent.post('/api/auth/addresses').send(addr({ label: 'Home' }));
    await agent.post('/api/auth/addresses').send(addr({ label: 'Work' }));
    const [home, work] = await saved();
    const res = await agent.put(`/api/auth/addresses/${work._id}`).send({ city: 'Bhopal', isDefault: true });
    expect(res.status).toBe(200);
    const after = await saved();
    expect(after.find((a) => a.label === 'Work')).toMatchObject({ city: 'Bhopal', isDefault: true });
    expect(after.find((a) => String(a._id) === String(home._id)).isDefault).toBe(false);
  });
  it('always keeps one default, even if you try to un-default the only one', async () => {
    await agent.post('/api/auth/addresses').send(addr());
    const [a] = await saved();
    await agent.put(`/api/auth/addresses/${a._id}`).send({ isDefault: false }).expect(200);
    expect((await saved())[0].isDefault).toBe(true);
  });
  it('deleting the default promotes another address', async () => {
    await agent.post('/api/auth/addresses').send(addr({ label: 'Home' }));
    await agent.post('/api/auth/addresses').send(addr({ label: 'Work' }));
    const [home] = await saved();
    await agent.delete(`/api/auth/addresses/${home._id}`).expect(200);
    const left = await saved();
    expect(left).toHaveLength(1);
    expect(left[0]).toMatchObject({ label: 'Work', isDefault: true });
  });
  it("cannot touch another user's address (404) and rejects malformed ids (422)", async () => {
    await agent.post('/api/auth/addresses').send(addr());
    const [a] = await saved();
    expect((await other.put(`/api/auth/addresses/${a._id}`).send({ city: 'Hacked' })).status).toBe(404);
    expect((await other.delete(`/api/auth/addresses/${a._id}`)).status).toBe(404);
    expect((await saved())[0].city).toBe(ADDRESS.city);
    expect((await agent.delete('/api/auth/addresses/not-an-id')).status).toBe(422);
    expect((await agent.delete('/api/auth/addresses/64b7f0f2a1b2c3d4e5f60718')).status).toBe(404);
  });
});
