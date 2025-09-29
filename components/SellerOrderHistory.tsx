import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase';
import type { Order, OrderStatus } from '../types';
import RlsHelpPedidos from './RlsHelpPedidos';
import ConfirmationModal from './ConfirmationModal';

interface SellerOrderHistoryProps {
  showToast: (message: string, type: 'success' | 'error') => void;
  onEditOrder: (order: Order) => void;
}

const statusColors: { [key in OrderStatus]: string } = {
  Pendente: 'bg-yellow-100 text-yellow-800',
  'Em Processamento': 'bg-blue-100 text-blue-800',
  Enviado: 'bg-purple-100 text-purple-800',
  Entregue: 'bg-green-100 text-green-800',
  Cancelado: 'bg-red-100 text-red-800',
};

const SellerOrderHistory: React.FC<SellerOrderHistoryProps> = ({ showToast, onEditOrder }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingOrderId, setProcessingOrderId] = useState<string | null>(null);
  const [showRlsHelp, setShowRlsHelp] = useState(false);
  const [orderToCancel, setOrderToCancel] = useState<Order | null>(null);


  const fetchOrders = useCallback(async () => {
    setLoading(true);
    setShowRlsHelp(false);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        showToast('Usuário não encontrado', 'error');
        setLoading(false);
        return;
    }

    const { data, error } = await supabase
      .from('pedidos')
      .select(`*, pedido_items ( *, produtos (*) )`)
      .eq('user_id', user.id)
      .neq('status', 'Cancelado')
      .order('created_at', { ascending: false });

    if (error) {
      if (error.message.includes('permission')) {
          setShowRlsHelp(true);
      }
      showToast(`Erro ao buscar seus pedidos: ${error.message}`, 'error');
    } else {
      setOrders(data as any[]);
    }
    setLoading(false);
  }, [showToast]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);
  
  const handleCancelOrder = (order: Order) => {
    setOrderToCancel(order);
  };
  
  const confirmCancelOrder = async () => {
    if (!orderToCancel) return;
    
    setProcessingOrderId(orderToCancel.id);
    setShowRlsHelp(false);

    try {
      const { data, error } = await supabase
        .from('pedidos')
        .update({ status: 'Cancelado' })
        .eq('id', orderToCancel.id)
        .eq('status', 'Pendente')
        .select('id')
        .single();

      if (error || !data) {
        setShowRlsHelp(true);
        if (error && error.code !== 'PGRST116') {
             showToast(`Falha na permissão: ${error.message}`, 'error');
        }
        return; 
      }
      
      showToast('Pedido cancelado com sucesso!', 'success');
      fetchOrders();

    } catch (err) {
      const message = err instanceof Error ? err.message : "Ocorreu um erro desconhecido.";
      showToast(message, 'error');
      setShowRlsHelp(true); 
    } finally {
      setProcessingOrderId(null);
      setOrderToCancel(null);
    }
  };


  if (loading && !processingOrderId) {
    return (
      <div className="bg-white p-6 rounded-2xl shadow-md border border-slate-200 text-center">
        <p className="text-slate-500">Carregando seu histórico de pedidos...</p>
      </div>
    );
  }

  return (
    <>
    <div className="bg-white p-6 rounded-2xl shadow-md border border-slate-200 animate-fade-in">
      <h2 className="text-xl font-bold mb-6 text-slate-800">Meus Pedidos ({orders.length})</h2>
      
      {showRlsHelp && <RlsHelpPedidos />}

      {orders.length === 0 && !loading ? (
        <p className="text-slate-500 text-center py-8">Você ainda não fez nenhum pedido.</p>
      ) : (
        <div className="space-y-6">
          {orders.map((order) => (
            <div key={order.id} className="p-4 bg-white border border-slate-200 rounded-2xl">
              <div className="flex flex-col sm:flex-row justify-between sm:items-start mb-4">
                <div>
                  <h3 className="font-bold text-lg text-slate-800">Pedido #{order.id.substring(0, 8)}</h3>
                  <p className="text-sm text-slate-500">{new Date(order.created_at).toLocaleString('pt-BR')}</p>
                </div>
                <div className="text-left sm:text-right mt-3 sm:mt-0">
                  <p className="font-bold text-2xl text-slate-900">R$ {order.total_price.toFixed(2)}</p>
                  <span className={`mt-1 inline-block px-2 py-1 rounded-full text-xs font-semibold capitalize ${statusColors[order.status] || 'bg-slate-100 text-slate-800'}`}>
                    {order.status}
                  </span>
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
                          <p className="text-slate-600">{item.quantity} x R$ {item.price_at_purchase.toFixed(2)}</p>
                          <p className="font-bold text-slate-800 mt-1">R$ {(item.quantity * item.price_at_purchase).toFixed(2)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
               </div>


              {order.status?.toLowerCase() === 'pendente' && (
                <div className="flex items-center space-x-3">
                    <button
                        onClick={() => onEditOrder(order)}
                        disabled={processingOrderId === order.id}
                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white focus:ring-blue-500 disabled:bg-blue-600/50 transition-all duration-300 shadow-lg shadow-blue-600/20"
                    >
                        Editar Pedido
                    </button>
                    <button
                        onClick={() => handleCancelOrder(order)}
                        disabled={processingOrderId === order.id}
                        className="px-4 py-2 text-sm text-white font-semibold rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white bg-red-600 hover:bg-red-700 focus:ring-red-500 transition-all duration-300 shadow-lg shadow-red-600/20 transform hover:scale-105"
                    >
                        {processingOrderId === order.id ? 'Cancelando...' : 'Cancelar Pedido'}
                    </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
    {orderToCancel && (
        <ConfirmationModal
            isOpen={!!orderToCancel}
            onClose={() => setOrderToCancel(null)}
            onConfirm={confirmCancelOrder}
            title="Confirmar Cancelamento"
            message="Tem certeza que deseja cancelar este pedido? Esta ação não pode ser desfeita."
            confirmText="Sim, Cancelar"
            isDestructive={true}
        />
    )}
    </>
  );
};

export default SellerOrderHistory;