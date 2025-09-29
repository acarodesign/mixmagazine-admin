import React, { useState } from 'react';
import { supabase } from '../services/supabase';
import { LOGO_URL, FACADE_URL } from '../config';

interface LoginProps {
  showToast: (message: string, type: 'success' | 'error') => void;
  onSwitchToSignUp: () => void;
}

// Kept for password visibility toggle
const EyeIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
);

const EyeSlashIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.542-7 1.274-4.057 5.064-7 9.542-7 .847 0 1.673.124 2.468.352M4.938 4.938l14.124 14.124" />
    </svg>
);

const Login: React.FC<LoginProps> = ({ showToast, onSwitchToSignUp }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      showToast(error.message, 'error');
    }
    setLoading(false);
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center p-4 overflow-hidden">
      {/* Background Image & Overlay */}
      <div className="absolute inset-0 z-0">
        <img
          src={FACADE_URL}
          alt="Fachada da loja MixMagazine"
          className="w-full h-full object-cover bg-ken-burns"
        />
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm"></div>
      </div>
      
      {/* Form Card */}
      <div className="relative z-10 max-w-sm w-full bg-white/90 backdrop-blur-lg p-8 rounded-2xl shadow-xl border border-white/20 space-y-6 animate-fade-in-up">
            <div className="flex justify-center">
                <img src={LOGO_URL} alt="MixMagazine Logo" className="h-12" />
            </div>

            <div className="flex justify-center space-x-8 border-b border-slate-200/50 pb-4">
                <h1 className="text-xl font-bold text-slate-800 border-b-2 border-green-500 pb-3 px-4">LOGAR</h1>
                <button 
                  onClick={onSwitchToSignUp} 
                  className="text-xl font-bold text-slate-500 hover:text-slate-800 transition pb-3 px-4"
                >
                  REGISTRAR
                </button>
            </div>

            <form className="space-y-6" onSubmit={handleLogin}>
                <div>
                    <label htmlFor="email-address" className="block text-sm font-medium text-slate-600 mb-1">
                        Endereço de e-mail
                    </label>
                    <input
                        id="email-address"
                        name="email"
                        type="email"
                        autoComplete="email"
                        required
                        className="appearance-none relative block w-full px-4 py-3 border border-slate-300 bg-slate-100/80 placeholder-slate-500 text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 focus:z-10 sm:text-sm transition-all duration-300"
                        placeholder="seu@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                    />
                </div>

                <div>
                    <label htmlFor="password" className="block text-sm font-medium text-slate-600 mb-1">
                        Senha
                    </label>
                    <div className="relative">
                        <input
                            id="password"
                            name="password"
                            type={showPassword ? 'text' : 'password'}
                            autoComplete="current-password"
                            required
                            className="appearance-none relative block w-full px-4 py-3 border border-slate-300 bg-slate-100/80 placeholder-slate-500 text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 focus:z-10 sm:text-sm transition-all duration-300 pr-10"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                         <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                            aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                        >
                           {showPassword ? <EyeSlashIcon /> : <EyeIcon />}
                        </button>
                    </div>
                </div>

                <div className="flex items-center text-sm">
                    <input 
                        id="remember-me" 
                        name="remember-me" 
                        type="checkbox" 
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="h-4 w-4 text-green-600 bg-slate-100 border-slate-300 rounded focus:ring-green-500 cursor-pointer" 
                    />
                    <label htmlFor="remember-me" className="ml-2 block text-slate-600 cursor-pointer">
                        Salvar meu login
                    </label>
                </div>

                <div className="pt-2">
                    <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex justify-center py-3 px-4 border border-transparent text-sm font-bold rounded-lg text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white focus:ring-green-500 disabled:bg-green-600/50 disabled:cursor-not-allowed transition-all duration-300 shadow-lg shadow-green-600/20 transform hover:scale-105"
                    >
                    {loading ? 'ENTRANDO...' : 'ENTRAR'}
                    </button>
                </div>
            </form>
        </div>
    </div>
  );
};

export default Login;