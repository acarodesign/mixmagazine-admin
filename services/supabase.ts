import { createClient } from '@supabase/supabase-js';

// FIX: Extend the Window interface to include process.env for environment variables.
declare global {
  interface Window {
    process?: {
      env?: {
        SUPABASE_URL?: string;
        SUPABASE_ANON_KEY?: string;
      };
    };
  }
}

// In this no-build setup, env vars are defined on `window.process` in `index.html`.
const supabaseUrl = window.process?.env?.SUPABASE_URL;
const supabaseAnonKey = window.process?.env?.SUPABASE_ANON_KEY;

// The placeholder check must match the exact strings in index.html
const isPlaceholderUrl = supabaseUrl === 'COLE_SUA_NOVA_URL_AQUI';
const isPlaceholderKey = supabaseAnonKey === 'COLE_SUA_NOVA_CHAVE_ANON_AQUI';

if (!supabaseUrl || !supabaseAnonKey || isPlaceholderUrl || isPlaceholderKey) {
  const rootEl = document.getElementById('root');
  if (rootEl) {
    // Display a helpful message to the developer in the UI, matching the app's theme.
    rootEl.innerHTML = `
      <div class="min-h-screen flex items-center justify-center bg-gray-900 p-4">
        <div class="max-w-md w-full space-y-6 p-10 bg-gray-800 border border-gray-700 rounded-xl shadow-2xl text-center">
            <h1 class="text-2xl font-bold text-red-500">Erro de Configuração do Supabase</h1>
            <p class="mt-4 text-gray-300">
                As credenciais do Supabase não foram configuradas.
            </p>
            <p class="mt-2 text-sm text-gray-400">
                Por favor, abra o arquivo <code>index.html</code> e substitua os valores de exemplo para
                <code>SUPABASE_URL</code> e <code>SUPABASE_ANON_KEY</code> com as suas credenciais reais do projeto.
            </p>
            <p class="mt-4 text-xs text-gray-500">
                Você pode encontrar essas chaves nas configurações de API do seu projeto no painel do Supabase.
            </p>
        </div>
      </div>
    `;
  }
  // Throw an error to stop the application from running with invalid config.
  throw new Error("A URL e a Chave Anon do Supabase devem ser configuradas no index.html.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);