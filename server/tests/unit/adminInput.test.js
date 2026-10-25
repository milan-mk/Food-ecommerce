const { validateAdminInput } = require('../../utils/adminInput');

const good = { email: 'boss@example.com', name: 'The Boss', password: 'a-long-password-1' };

describe('validateAdminInput', () => {
  it('accepts a strong password and valid details', () => { expect(validateAdminInput(good)).toEqual([]); });
  it('rejects a bad email and a missing name', () => {
    expect(validateAdminInput({ ...good, email: 'nope' })).toHaveLength(1);
    expect(validateAdminInput({ ...good, name: ' ' })).toHaveLength(1);
  });
  it('requires 12+ characters with a letter and a number', () => {
    expect(validateAdminInput({ ...good, password: 'short1' })).toHaveLength(1);
    expect(validateAdminInput({ ...good, password: 'onlylettersnonumber' })).toHaveLength(1);
    expect(validateAdminInput({ ...good, password: '123456789012345' })).toHaveLength(1);
    expect(validateAdminInput({ ...good, password: 'x'.repeat(73) + '1' })).toHaveLength(1);
  });
  it('reports every problem at once', () => { expect(validateAdminInput({ email: '', name: '', password: '' })).toHaveLength(3); });
});
