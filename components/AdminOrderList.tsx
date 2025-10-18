import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase';
import type { Order, OrderStatus } from '../types';
import RlsHelpAdmin from './RlsHelpAdmin';

interface AdminOrderListProps {
  showToast: (message: string, type: 'success' | 'error') => void;
}

const statusColors: { [key in OrderStatus]: string } = {
  Pendente: 'bg-yellow-100 text-yellow-800 ring-yellow-500/30',
  'Em Processamento': 'bg-blue-100 text-blue-800 ring-blue-500/30',
  Enviado: 'bg-purple-100 text-purple-800 ring-purple-500/30',
  Entregue: 'bg-green-100 text-green-800 ring-green-500/30',
  Cancelado: 'bg-red-100 text-red-800 ring-red-500/30',
};


const orderStatuses: OrderStatus[] = ['Pendente', 'Em Processamento', 'Enviado', 'Entregue', 'Cancelado'];

const AdminOrderList: React.FC<AdminOrderListProps> = ({ showToast }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingStatusOrderId, setUpdatingStatusOrderId] = useState<string | null>(null);
  const [authorizingOrderId, setAuthorizingOrderId] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: ordersData, error: ordersError } = await supabase
        .from('pedidos')
        .select(`
          id, created_at, total_price, status, user_id, payment_method,
          cep, logradouro, numero, complemento, bairro, cidade, estado,
          pedido_items ( *, produtos (*) )
        `)
        .order('created_at', { ascending: false });

      if (ordersError) throw ordersError;

      if (!ordersData || ordersData.length === 0) {
        setOrders([]);
        return;
      }

      const sellerIds = [...new Set(ordersData.map(o => o.user_id).filter(Boolean))];
      let profilesMap = new Map<string, string>();

      if (sellerIds.length > 0) {
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', sellerIds);

        if (profilesError) throw profilesError;

        if (!profilesData || profilesData.length === 0) {
          throw new Error("Não foi possível buscar os dados dos vendedores. Verifique a política de segurança (RLS) da tabela 'profiles'.");
        }
        
        profilesMap = new Map(profilesData.map(p => [p.id, p.full_name]));
      }

      const combinedOrders = ordersData.map(order => ({
        ...order,
        profiles: {
          full_name: order.user_id ? profilesMap.get(order.user_id) || 'Vendedor não encontrado' : 'N/A'
        }
      }));

      setOrders(combinedOrders as any[]);

    } catch (err) {
      const message = err instanceof Error ? err.message : "Ocorreu um erro desconhecido";
      setError(message);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);
  
  const handleStatusChange = async (orderId: string, newStatus: OrderStatus) => {
    setUpdatingStatusOrderId(orderId);
    const { error } = await supabase
      .from('pedidos')
      .update({ status: newStatus })
      .eq('id', orderId);

    if (error) {
      showToast(`Erro ao atualizar status: ${error.message}`, 'error');
    } else {
      showToast('Status do pedido atualizado!', 'success');
      fetchOrders(); // Re-fetch para garantir consistência
    }
    setUpdatingStatusOrderId(null);
  };
  
  const handleAuthorizeOrder = async (order: Order) => {
    setAuthorizingOrderId(order.id);

    try {
        // Esta função agora é uma RPC no Supabase para garantir a transação atômica
        const { error } = await supabase.rpc('authorize_order', {
            p_order_id: order.id
        });

        if (error) {
            // O erro da RPC já vem formatado com a mensagem correta
            throw new Error(error.message);
        }

        showToast('Pedido autorizado e estoque atualizado!', 'success');
        fetchOrders();

    } catch (error) {
        const message = error instanceof Error ? error.message : "Ocorreu um erro ao autorizar o pedido.";
        showToast(message, 'error');
    } finally {
        setAuthorizingOrderId(null);
    }
  };

  const renderContent = () => {
    if (loading) {
      return <div className="text-center p-8 text-slate-500">Carregando pedidos...</div>;
    }
  
    if (error) {
       return <RlsHelpAdmin errorDetails={error} />;
    }

    if (orders.length === 0) {
       return <div className="text-center p-8 text-slate-500">Nenhum pedido foi realizado ainda.</div>;
    }

    return (
      <div className="space-y-6 animate-fade-in">
        {orders.map((order) => (
          <div key={order.id} className="bg-white border border-slate-200 shadow-md p-5 rounded-2xl">
            <div className="flex flex-col sm:flex-row justify-between sm:items-start mb-4">
              <div>
                <h3 className="font-bold text-lg text-slate-800">Pedido #{order.id.substring(0, 8)}</h3>
                <p className="text-sm text-slate-500">{new Date(order.created_at).toLocaleString('pt-BR')}</p>
                {order.payment_method && <p className="text-sm text-slate-500">Pagamento: <span className="font-medium">{order.payment_method}</span></p>}
                <p className="text-sm text-slate-600">Vendedor: <span className="font-medium text-slate-800">{order.profiles?.full_name || 'Não identificado'}</span></p>
              </div>
              <div className="text-left sm:text-right mt-3 sm:mt-0">
                <p className="font-bold text-2xl text-slate-900">R$ {order.total_price.toFixed(2)}</p>
                <div className="relative mt-1 inline-block">
                  <select
                    value={order.status}
                    onChange={(e) => handleStatusChange(order.id, e.target.value as OrderStatus)}
                    disabled={updatingStatusOrderId === order.id || authorizingOrderId === order.id}
                    className={`appearance-none w-full pl-3 pr-8 py-1 rounded-full text-xs font-semibold capitalize focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white ring-1 cursor-pointer ${statusColors[order.status] || 'bg-gray-100 text-gray-800'}`}
                  >
                    {orderStatuses.map(status => (
                      <option key={status} value={status} className="bg-white text-slate-800 font-medium">{status}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            
            <div className="border-y border-slate-200 my-4 py-4 space-y-3">
                {order.logradouro && (
                    <div className="text-xs text-slate-500">
                        <p className="font-semibold text-slate-600 mb-1">Endereço de Entrega:</p>
                        <p>{order.logradouro}, {order.numero}{order.complemento ? ` - ${order.complemento}` : ''} | {order.bairro}</p>
                        <p>{order.cidade} - {order.estado}, {order.cep}</p>
                    </div>
                )}

                <h4 className="font-semibold text-slate-700 pt-2">Itens do Pedido:</h4>
                <div className="space-y-2">
                  {order.pedido_items.map((item) => (
                    <div key={item.id} className="flex items-center gap-4 p-2 bg-slate-50 rounded-lg">
                      <img src={item.produtos?.image_urls?.[0]} alt={item.produtos?.name} className="w-12 h-12 object-cover rounded"/>
                      <div className="flex-grow">
                          <p className="font-semibold text-slate-800">{item.produtos?.name || 'Produto não encontrado'}</p>
                          <p className="text-sm text-slate-500">Cód: {item.produtos?.codigo}</p>
                      </div>
                      <div className="text-sm text-right">
                          <p className="text-slate-600">{item.quantity} un. x R$ {item.price_at_purchase.toFixed(2)}</p>
                          <p className="font-bold text-slate-800 mt-1">R$ {(item.quantity * item.price_at_purchase).toFixed(2)}</p>
                      </div>
                    </div>
                  ))}
                </div>
            </div>
            
            {order.status === 'Pendente' && (
                <div className="flex items-center">
                    <button
                        onClick={() => handleAuthorizeOrder(order)}
                        disabled={authorizingOrderId === order.id || updatingStatusOrderId === order.id}
                        className="flex justify-center py-2 px-4 border border-transparent text-sm font-bold rounded-lg text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white focus:ring-green-500 disabled:bg-green-600/50 disabled:cursor-not-allowed transition-all duration-300 shadow-lg shadow-green-600/20 transform hover:scale-105 disabled:transform-none"
                    >
                         {authorizingOrderId === order.id ? 'Autorizando...' : 'Autorizar e Deduzir Estoque'}
                    </button>
                </div>
            )}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 shadow-md p-6 rounded-2xl">
      <h2 className="text-xl font-bold mb-6 text-slate-800">Pedidos Recebidos</h2>
      {renderContent()}
    </div>
  );
};

export default AdminOrderList;