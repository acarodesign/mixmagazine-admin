import React, { useState } from 'react';

interface RlsHelpAdminProps {
  errorDetails: string;
}

const RlsHelpAdmin: React.FC<RlsHelpAdminProps> = ({ errorDetails }) => {
  const [copied, setCopied] = useState(false);

  const comprehensiveSqlCode = `-- =================================================================
-- SCRIPT DE PERMISSÕES (RLS) DEFINITIVO PARA MIXMAGAZINE
-- Execute este script completo no SQL Editor do seu projeto Supabase
-- para garantir que todas as permissões estão corretas para Admins e Vendedores.
-- =================================================================

-- 1. POLÍTICAS PARA PERFIS (profiles)
-- -----------------------------------------------------------------
DROP POLICY IF EXISTS "Usuários podem ver seus próprios perfis" ON public.profiles;
DROP POLICY IF EXISTS "Admins podem ler todos os perfis" ON public.profiles;

-- Permite que um usuário logado veja seu próprio perfil.
CREATE POLICY "Usuários podem ver seus próprios perfis"
ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);

-- Permite que o ADMIN veja o perfil de TODOS os vendedores (essencial para relatórios e pedidos).
CREATE POLICY "Admins podem ler todos os perfis"
ON public.profiles FOR SELECT TO authenticated USING (auth.email() = 'admin@mixmagazine.com');

-- 2. POLÍTICAS PARA PEDIDOS (pedidos)
-- -----------------------------------------------------------------
DROP POLICY IF EXISTS "Vendedores podem ver seus próprios pedidos" ON public.pedidos;
DROP POLICY IF EXISTS "Vendedores podem cancelar seus próprios pedidos pendentes" ON public.pedidos;
DROP POLICY IF EXISTS "Admins podem ver todos os pedidos" ON public.pedidos;
DROP POLICY IF EXISTS "Admins podem atualizar todos os pedidos" ON public.pedidos;

-- Permite que um VENDEDOR veja apenas os seus próprios pedidos.
CREATE POLICY "Vendedores podem ver seus próprios pedidos"
ON public.pedidos FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Permite que um VENDEDOR cancele seu próprio pedido APENAS SE o status for 'Pendente'.
CREATE POLICY "Vendedores podem cancelar seus próprios pedidos pendentes"
ON public.pedidos FOR UPDATE TO authenticated USING (auth.uid() = user_id AND status = 'Pendente') WITH CHECK (status = 'Cancelado');

-- Permite que o ADMIN veja TODOS os pedidos de todos os vendedores.
CREATE POLICY "Admins podem ver todos os pedidos"
ON public.pedidos FOR SELECT TO authenticated USING (auth.email() = 'admin@mixmagazine.com');

-- Permite que o ADMIN atualize o status de QUALQUER pedido.
CREATE POLICY "Admins podem atualizar todos os pedidos"
ON public.pedidos FOR UPDATE TO authenticated USING (auth.email() = 'admin@mixmagazine.com');

-- 3. POLÍTICAS PARA ITENS DO PEDIDO (pedido_items)
-- -----------------------------------------------------------------
DROP POLICY IF EXISTS "Vendedores podem ver os itens de seus pedidos" ON public.pedido_items;
DROP POLICY IF EXISTS "Admins podem ver todos os itens de pedidos" ON public.pedido_items;

-- Permite que um VENDEDOR veja os itens de um pedido que ele pode ver.
CREATE POLICY "Vendedores podem ver os itens de seus pedidos"
ON public.pedido_items FOR SELECT TO authenticated USING (pedido_id IN (SELECT id FROM public.pedidos WHERE user_id = auth.uid()));

-- Permite que o ADMIN veja TODOS os itens de TODOS os pedidos.
CREATE POLICY "Admins podem ver todos os itens de pedidos"
ON public.pedido_items FOR SELECT TO authenticated USING (auth.email() = 'admin@mixmagazine.com');
`;

  const handleCopy = () => {
    navigator.clipboard.writeText(comprehensiveSqlCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-blue-50 border border-blue-200 text-blue-800 p-6 rounded-lg space-y-4">
      <h3 className="text-xl font-bold text-blue-900">Ação Necessária: Configurar Permissões de Administrador</h3>
      <p>
        Ocorreu um erro ao buscar os dados. A causa mais comum é que a política de segurança (RLS) do Supabase está ativa, mas o usuário administrador (<code className="bg-blue-100 text-sm p-1 rounded">admin@mixmagazine.com</code>) ainda não tem permissão para ler todas as tabelas necessárias (como <code className="bg-blue-100 text-sm p-1 rounded">pedidos</code> e <code className="bg-blue-100 text-sm p-1 rounded">profiles</code>).
      </p>
      <div className="space-y-2">
        <h4 className="font-semibold text-blue-900">Solução Completa (SQL):</h4>
        <p className="text-sm">O script abaixo resolve as permissões para <strong>Admins e Vendedores</strong> de uma vez. Copie-o e execute no <strong>SQL Editor</strong> do seu projeto Supabase.</p>
        <div className="relative bg-slate-800 p-4 rounded-md font-mono text-sm border border-slate-600 max-h-64 overflow-y-auto custom-scrollbar">
          <button 
            onClick={handleCopy}
            className="absolute top-2 right-2 px-3 py-1 text-xs bg-slate-600 hover:bg-slate-500 rounded-md text-white transition-colors sticky"
          >
            {copied ? 'Copiado!' : 'Copiar'}
          </button>
          <pre><code className="text-slate-300 whitespace-pre-wrap">{comprehensiveSqlCode}</code></pre>
        </div>
      </div>
       <div className="text-xs p-3 bg-blue-100 rounded-md">
        <p className="font-bold text-blue-800">Detalhe do Erro Técnico:</p>
        <p className="text-blue-700 font-mono">{errorDetails}</p>
      </div>
      <p className="text-sm text-blue-700">
        Após executar o script no Supabase, os pedidos e relatórios devem carregar corretamente.
      </p>
    </div>
  );
};

export default RlsHelpAdmin;