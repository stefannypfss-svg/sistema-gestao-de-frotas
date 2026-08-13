import React from 'react';
import { useAuth } from '../../hooks/useAuth';

const LOGO_URL = '/logo.svg';

export const LoginView: React.FC = () => {
  const { login } = useAuth();
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
    } catch {
      setError('E-mail ou senha inválidos.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="h-screen w-screen flex items-center justify-center bg-[#f0f2f5] px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
        <div className="flex flex-col items-center gap-2 mb-8">
          <img src={LOGO_URL} alt="Cortez Rental" className="h-8 w-auto object-contain" />
          <p className="text-sm text-gray-500">Entre para acessar a gestão de frotas</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label htmlFor="email" className="text-[13px] font-medium text-gray-700">
              E-mail
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
              placeholder="voce@empresa.com"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="password" className="text-[13px] font-medium text-gray-700">
              Senha
            </label>
            <input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent"
              placeholder="••••••••"
            />
          </div>

          {error && <p className="text-[13px] text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="mt-2 w-full rounded-lg bg-brand text-white text-sm font-medium py-2.5 hover:opacity-90 transition-opacity disabled:opacity-60"
          >
            {submitting ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    </div>
  );
};
