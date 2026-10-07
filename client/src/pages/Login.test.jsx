import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';

vi.mock('../services/authService', () => ({
  me: vi.fn().mockRejectedValue(new Error('no session')),
  login: vi.fn(), register: vi.fn(), logout: vi.fn(),
}));
import * as authService from '../services/authService';
import Login from './Login';
import { AuthProvider } from '../context/AuthContext';
import { ToastProvider } from '../context/ToastContext';

const setup = () => render(
  <MemoryRouter initialEntries={['/login']}><ToastProvider><AuthProvider><Login /></AuthProvider></ToastProvider></MemoryRouter>
);

beforeEach(() => vi.clearAllMocks());

describe('Login page', () => {
  it('asks for both fields before calling the server', async () => {
    setup();
    await userEvent.click(await screen.findByRole('button', { name: 'Log in' }));
    expect(await screen.findByText('Enter your email')).toBeInTheDocument();
    expect(screen.getByText('Enter your password')).toBeInTheDocument();
    expect(authService.login).not.toHaveBeenCalled();
  });

  it('rejects a malformed email', async () => {
    setup();
    await userEvent.type(await screen.findByLabelText('Email'), 'not-an-email');
    await userEvent.type(screen.getByLabelText('Password'), 'Passw0rd1');
    await userEvent.click(screen.getByRole('button', { name: 'Log in' }));
    expect(await screen.findByText('Enter a valid email address')).toBeInTheDocument();
  });

  it('sends the entered credentials', async () => {
    authService.login.mockResolvedValue({ data: { user: { name: 'Milan Kumar', role: 'customer' } } });
    setup();
    await userEvent.type(await screen.findByLabelText('Email'), 'milan@example.com');
    await userEvent.type(screen.getByLabelText('Password'), 'Passw0rd1');
    await userEvent.click(screen.getByRole('button', { name: 'Log in' }));
    expect(authService.login).toHaveBeenCalledWith({ email: 'milan@example.com', password: 'Passw0rd1' });
  });

  it('shows the server message when the login is refused', async () => {
    authService.login.mockRejectedValue(Object.assign(new Error('Invalid email or password'), { status: 401, errors: [] }));
    setup();
    await userEvent.type(await screen.findByLabelText('Email'), 'milan@example.com');
    await userEvent.type(screen.getByLabelText('Password'), 'WrongPass1');
    await userEvent.click(screen.getByRole('button', { name: 'Log in' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid email or password');
  });

  it('can reveal and hide the password', async () => {
    setup();
    const input = await screen.findByLabelText('Password');
    expect(input).toHaveAttribute('type', 'password');
    await userEvent.click(screen.getByRole('button', { name: 'Show password' }));
    expect(input).toHaveAttribute('type', 'text');
  });
});
