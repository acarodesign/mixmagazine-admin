import React, { useState } from 'react';
import { supabase } from '../services/supabase';
import { LOGO_URL, FACADE_URL } from '../config';

// Kept for password visibility toggle
const EyeIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
);
const EyeSlashIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.542-7 1.274-4.057 5.064-7 9.542-7 .847 0 1.673.124 2.468.352M4.938 4.938l14.124 14.124" /></svg>
);


interface SignUpProps {
  showToast: (message: string, type: 'success' | 'error') => void;
  onSwitchToLogin: () => void;
}

const SignUp: React.FC<SignUpProps> = ({ showToast, onSwitchToLogin }) => {
  const [fullName, setFullName] = useState('');
  const [city, setCity] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          city: city,
          telefone: phone,
        },
      },
    });

    if (error) {
      showToast(error.message, 'error');
    } else {
      setSuccess(true);
    }
    setLoading(false);
  };
  
  const backgroundAndOverlay = (
    <div className="absolute inset-0 z-0">
        <img
            src={FACADE_URL}
            alt="Fachada da loja MixMagazine"
            className="w-full h-full object-cover bg-ken-burns"
        />
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm"></div>
    </div>
  );

  if(success){
    return (
        <div className="relative min-h-screen w-full flex items-center justify-center p-4 overflow-hidden">
            {backgroundAndOverlay}
            <div className="relative z-10 max-w-sm w-full bg-white/90 backdrop-blur-lg p-8 rounded-2xl shadow-xl border border-white/20 space-y-6 animate-fade-in-up text-center">
                <div className="flex justify-center">
                  <img src={LOGO_URL} alt="MixMagazine Logo" className="h-12" />
                </div>
                <h2 className="text-2xl font-bold text-green-600">Cadastro realizado!</h2>
                <p className="text-slate-600 mt-4">
                    Enviamos um link de confirmação para o seu e-mail. Por favor, verifique sua caixa de entrada para ativar sua conta.
                </p>
                <button
                    onClick={onSwitchToLogin}
                    className="w-full mt-6 flex justify-center py-3 px-4 border border-transparent text-sm font-bold rounded-lg text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white focus:ring-green-500 disabled:bg-green-600/50 disabled:cursor-not-allowed transition-all duration-300 shadow-lg shadow-green-600/20 transform hover:scale-105"
                    >
                    VOLTAR PARA O LOGIN
                </button>
            </div>
        </div>
    );
  }

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center p-4 overflow-hidden">
      {backgroundAndOverlay}
      <div className="relative z-10 max-w-sm w-full bg-white/90 backdrop-blur-lg p-8 rounded-2xl shadow-xl border border-white/20 space-y-4 animate-fade-in-up">
        <div className="flex justify-center">
            <img src={LOGO_URL} alt="MixMagazine Logo" className="h-12" />
        </div>

        <div className="flex justify-center space-x-8 border-b border-slate-200/50 pb-4">
            <button 
              onClick={onSwitchToLogin} 
              className="text-xl font-bold text-slate-500 hover:text-slate-800 transition pb-3 px-4"
            >
              LOGAR
            </button>
            <h1 className="text-xl font-bold text-slate-800 border-b-2 border-green-500 pb-3 px-4">REGISTRAR</h1>
        </div>

        <form className="space-y-4" onSubmit={handleSignUp}>
          <div>
              <label htmlFor="full-name" className="block text-sm font-medium text-slate-600 mb-1">Nome Completo</label>
              <input id="full-name" name="full_name" type="text" required className="appearance-none relative block w-full px-4 py-3 border border-slate-300 bg-slate-100/80 placeholder-slate-500 text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 focus:z-10 sm:text-sm transition-all duration-300" placeholder="Seu nome completo" value={fullName} onChange={(e) => setFullName(e.target.value)} />
           </div>
          <div>
              <label htmlFor="city" className="block text-sm font-medium text-slate-600 mb-1">Cidade</label>
              <input id="city" name="city" type="text" required className="appearance-none relative block w-full px-4 py-3 border border-slate-300 bg-slate-100/80 placeholder-slate-500 text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 focus:z-10 sm:text-sm transition-all duration-300" placeholder="Sua cidade" value={city} onChange={(e) => setCity(e.target.value)} />
           </div>
          <div>
              <label htmlFor="phone" className="block text-sm font-medium text-slate-600 mb-1">Telefone</label>
              <input id="phone" name="phone" type="tel" autoComplete="tel" required className="appearance-none relative block w-full px-4 py-3 border border-slate-300 bg-slate-100/80 placeholder-slate-500 text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 focus:z-10 sm:text-sm transition-all duration-300" placeholder="Telefone com DDD" value={phone} onChange={(e) => setPhone(e.target.value)} />
           </div>
          <div>
              <label htmlFor="email-address" className="block text-sm font-medium text-slate-600 mb-1">E-mail</label>
              <input id="email-address" name="email" type="email" autoComplete="email" required className="appearance-none relative block w-full px-4 py-3 border border-slate-300 bg-slate-100/80 placeholder-slate-500 text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 focus:z-10 sm:text-sm transition-all duration-300" placeholder="seu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
           </div>
          <div>
               <label htmlFor="password" className="block text-sm font-medium text-slate-600 mb-1">Senha</label>
               <div className="relative">
                  <input id="password" name="password" type={showPassword ? 'text' : 'password'} autoComplete="new-password" required minLength={6} className="appearance-none relative block w-full px-4 py-3 border border-slate-300 bg-slate-100/80 placeholder-slate-500 text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 focus:z-10 sm:text-sm transition-all duration-300 pr-10" placeholder="Mínimo 6 caracteres" value={password} onChange={(e) => setPassword(e.target.value)} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600" aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}>
                    {showPassword ? <EyeSlashIcon /> : <EyeIcon />}
                  </button>
               </div>
          </div>
          
          <div className="pt-4">
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-3 px-4 border border-transparent text-sm font-bold rounded-lg text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white focus:ring-green-500 disabled:bg-green-600/50 disabled:cursor-not-allowed transition-all duration-300 shadow-lg shadow-green-600/20 transform hover:scale-105"
            >
              {loading ? 'CRIANDO CONTA...' : 'CRIAR CONTA'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SignUp;