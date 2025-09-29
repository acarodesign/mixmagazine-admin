import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../config';

// Agora, as credenciais são importadas do arquivo de configuração central.
// FIX: Explicitly type as string to avoid literal type inference causing comparison errors.
const supabaseUrl: string = SUPABASE_URL;
const supabaseAnonKey: string = SUPABASE_ANON_KEY;

// A verificação de placeholder foi mantida para ajudar no setup inicial.
// Certifique-se que estes valores de placeholder sejam diferentes dos seus valores reais.
const isPlaceholderUrl = supabaseUrl === 'COLE_SUA_URL_AQUI';
const isPlaceholderKey = supabaseAnonKey === 'COLE_SUA_CHAVE_ANON_AQUI';

if (!supabaseUrl || !supabaseAnonKey || isPlaceholderUrl || isPlaceholderKey) {
  const rootEl = document.getElementById('root');
  if (rootEl) {
    // A mensagem de erro agora instrui o desenvolvedor a editar o arquivo `config.ts`.
    rootEl.innerHTML = `
      <div class="min-h-screen flex items-center justify-center bg-gray-900 p-4">
        <div class="max-w-md w-full space-y-6 p-10 bg-gray-800 border border-gray-700 rounded-xl shadow-2xl text-center">
            <h1 class="text-2xl font-bold text-red-500">Erro de Configuração do Supabase</h1>
            <p class="mt-4 text-gray-300">
                As credenciais do Supabase não foram configuradas.
            </p>
            <p class="mt-2 text-sm text-gray-400">
                Por favor, abra o arquivo <code>config.ts</code> e substitua os valores de exemplo para
                <code>SUPABASE_URL</code> e <code>SUPABASE_ANON_KEY</code> com as suas credenciais reais do projeto.
            </p>
            <p class="mt-4 text-xs text-gray-500">
                Você pode encontrar essas chaves nas configurações de API do seu projeto no painel do Supabase.
            </p>
        </div>
      </div>
    `;
  }
  // Lança um erro para parar a execução com configuração inválida.
  throw new Error("A URL e a Chave Anon do Supabase devem ser configuradas no arquivo config.ts.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
