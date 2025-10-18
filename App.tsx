import React, { useState, useEffect } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from './services/supabase';
import Login from './components/Login';
import AdminDashboard from './components/AdminDashboard';
import SellerDashboard from './components/SellerDashboard';
import SignUp from './components/SignUp';
import Toast from './components/Toast';
import type { ToastMessage, Profile } from './types';

const ADMIN_EMAIL = 'admin@mixmagazine.com';

const App: React.FC = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const [showSignUp, setShowSignUp] = useState(false);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  };

  // Efeito para verificar a sessão inicial e escutar por mudanças
  useEffect(() => {
    setLoading(true);

    const fetchInitialSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      setLoading(false);
    };

    fetchInitialSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
      }
    );

    return () => {
      subscription?.unsubscribe();
    };
  }, []);
  
  // Efeito para buscar o perfil do usuário sempre que a sessão mudar
  useEffect(() => {
    if (!session?.user) {
      setProfile(null);
      return;
    }

    const fetchProfile = async () => {
      try {
        if (session.user.email === ADMIN_EMAIL) {
          setProfile({ id: session.user.id, role: 'admin', full_name: 'Admin' });
          return;
        }

        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (profileError && profileError.code !== 'PGRST116') {
          throw profileError;
        }

        if (profileData) {
          setProfile(profileData);
        } else {
          const { data: { user }, error: userError } = await supabase.auth.getUser();
          if (userError || !user) {
            throw new Error('Não foi possível obter os dados do usuário para criar o perfil.');
          }

          const { full_name, city, telefone } = user.user_metadata;
          if (full_name) {
            const { data: newProfile, error: createError } = await supabase
              .from('profiles')
              .insert({ id: user.id, full_name, city, telefone, role: 'vendedor' })
              .select()
              .single();
            
            if (createError) throw createError;
            setProfile(newProfile);
          } else {
            await supabase.auth.signOut();
            showToast('Dados de cadastro incompletos. Tente se cadastrar novamente.', 'error');
          }
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Ocorreu um erro desconhecido.';
        showToast(`Erro crítico ao carregar perfil: ${message}. Desconectando por segurança.`, 'error');
        await supabase.auth.signOut();
      }
    };

    fetchProfile();
  }, [session]);


  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      showToast('Erro no servidor ao sair, mas você foi desconectado localmente.', 'error');
    }
    setSession(null);
    setProfile(null);
    setShowSignUp(false);
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center min-h-screen bg-slate-50">
          <div className="text-2xl font-semibold text-slate-700">Carregando...</div>
        </div>
      );
    }
    
    if (!session) {
      if(showSignUp) {
        return <SignUp showToast={showToast} onSwitchToLogin={() => setShowSignUp(false)} />;
      }
      return <Login showToast={showToast} onSwitchToSignUp={() => setShowSignUp(true)} />;
    }

    if (session && !profile) {
       return (
        <div className="flex items-center justify-center min-h-screen bg-slate-50">
          <div className="text-2xl font-semibold text-slate-700">Finalizando configuração...</div>
        </div>
      );
    }

    if (profile?.role === 'admin') {
      return <AdminDashboard showToast={showToast} handleLogout={handleLogout} userEmail={session.user.email} />;
    }
    
    if (profile?.role === 'vendedor') {
      return <SellerDashboard showToast={showToast} handleLogout={handleLogout} userEmail={session.user.email} />;
    }

    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 text-center p-4">
        <h1 className="text-4xl font-bold text-red-500 mb-4">Acesso Indefinido</h1>
        <p className="text-lg text-gray-300 mb-6">Seu papel no sistema não foi definido. Contate o suporte.</p>
        <button
          onClick={handleLogout}
          className="px-6 py-2 bg-green-600 text-white font-semibold rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
        >
          Sair
        </button>
      </div>
    );
  };

  return (
    <>
      {renderContent()}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </>
  );
};

export default App;