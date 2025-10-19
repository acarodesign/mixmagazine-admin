
import React, { useState, useMemo } from 'react';
import type { CartItem, ShippingOption } from '../types';
import { supabase } from '../services/supabase';

interface ShoppingCartProps {
    items: CartItem[];
    setItems: React.Dispatch<React.SetStateAction<CartItem[]>>;
    showToast: (message: string, type: 'success' | 'error') => void;
}

const ShoppingCart: React.FC<ShoppingCartProps> = ({ items, setItems, showToast }) => {
    const [cep, setCep] = useState('');
    const [shippingOptions, setShippingOptions] = useState<ShippingOption[]>([]);
    const [selectedShipping, setSelectedShipping] = useState<ShippingOption | null>(null);
    const [isCalculating, setIsCalculating] = useState(false);
    const [orderPlaced, setOrderPlaced] = useState(false);
    const [placingOrder, setPlacingOrder] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState<'vista' | 'cartao'>('vista');

    const [address, setAddress] = useState({
        logradouro: '',
        numero: '',
        complemento: '',
        bairro: '',
        cidade: '',
        estado: '',
    });
    const [addressFetched, setAddressFetched] = useState(false);
    
    const subtotal = useMemo(() => {
        return items.reduce((acc, item) => {
            const price = paymentMethod === 'cartao' ? item.price_cartao : item.price_vista;
            return acc + price * item.quantity;
        }, 0);
    }, [items, paymentMethod]);

    const total = useMemo(() => {
        return subtotal + (selectedShipping?.cost || 0);
    }, [subtotal, selectedShipping]);

    const handleQuantityChange = (id: string, newQuantityInUnits: number) => {
        setItems(prevItems => {
            const updatedItems = prevItems.map(item => {
                if (item.id === id) {
                    if (newQuantityInUnits <= 0) return null;
                    
                    const quantityPerBox = item.quantity_per_box || 1;
                    const newBoxes = newQuantityInUnits / quantityPerBox;

                    if (newBoxes <= item.stock) {
                        return { ...item, quantity: newQuantityInUnits };
                    } else {
                        showToast(`Estoque máximo para ${item.name} é ${item.stock} caixas.`, 'error');
                        return item;
                    }
                }
                return item;
            }).filter(Boolean) as CartItem[];
            return updatedItems;
        });
    };

    const handleRemoveItem = (id: string) => {
        setItems(prevItems => prevItems.filter(item => item.id !== id));
    };

    const handleCepLookup = async () => {
        const cleanedCep = cep.replace(/\D/g, '');
        if (cleanedCep.length !== 8) {
            showToast('Por favor, insira um CEP válido com 8 dígitos.', 'error');
            return;
        }
        setIsCalculating(true);
        setShippingOptions([]);
        setSelectedShipping(null);
        setAddressFetched(false);

        try {
            const response = await fetch(`https://viacep.com.br/ws/${cleanedCep}/json/`);
            if (!response.ok) throw new Error('Falha ao consultar o CEP.');
            const data = await response.json();
            if (data.erro) {
                throw new Error('CEP não encontrado. Verifique o número digitado.');
            }

            setAddress({
                logradouro: data.logradouro,
                numero: '',
                complemento: '',
                bairro: data.bairro,
                cidade: data.localidade,
                estado: data.uf,
            });
            setAddressFetched(true);

            const baseCost = 20 + Math.random() * 20; 
            const options: ShippingOption[] = [
                { name: 'PAC', cost: parseFloat(baseCost.toFixed(2)), days: 8 + Math.floor(Math.random() * 4) },
                { name: 'SEDEX', cost: parseFloat((baseCost * 1.8).toFixed(2)), days: 3 + Math.floor(Math.random() * 2) },
                { name: 'Jadlog', cost: parseFloat((baseCost * 1.4).toFixed(2)), days: 5 + Math.floor(Math.random() * 3) },
            ];
            setShippingOptions(options);

            showToast(`Endereço encontrado para ${cep}.`, 'success');
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Erro ao buscar CEP.';
            showToast(message, 'error');
        } finally {
            setIsCalculating(false);
        }
    };
    
    const handlePlaceOrder = async () => {
        if (!selectedShipping) {
            showToast('Por favor, selecione uma opção de frete.', 'error');
            return;
        }
         if (!address.numero.trim()) {
            showToast('Por favor, preencha o número do endereço.', 'error');
            return;
        }
        setPlacingOrder(true);
        try {
            const { data: { user }, error: userError } = await supabase.auth.getUser();

            if (userError || !user) {
                throw new Error(userError?.message || "Sessão do usuário não encontrada.");
            }

            const { data: orderData, error: orderError } = await supabase
                .from('pedidos')
                .insert({
                    user_id: user.id,
                    total_price: total,
                    shipping_cost: selectedShipping.cost,
                    status: 'Pendente',
                    payment_method: paymentMethod,
                    cep: cep,
                    logradouro: address.logradouro,
                    numero: address.numero,
                    complemento: address.complemento,
                    bairro: address.bairro,
                    cidade: address.cidade,
                    estado: address.estado,
                })
                .select()
                .single();
            
            if (orderError) throw orderError;
            if (!orderData) throw new Error("Não foi possível obter os dados do pedido criado.");

            const orderItems = items.map(item => ({
                pedido_id: orderData.id,
                produto_id: item.id,
                quantity: item.quantity,
                price_at_purchase: paymentMethod === 'cartao' ? item.price_cartao : item.price_vista
            }));
            
            const { error: itemsError } = await supabase.from('pedido_items').insert(orderItems);
            
            if (itemsError) {
                await supabase.from('pedidos').delete().eq('id', orderData.id);
                throw itemsError;
            }
            
            setOrderPlaced(true);
            
        } catch (error) {
            let message = 'Ocorreu um erro ao finalizar o pedido.';
            if (error instanceof Error) message = error.message;
            showToast(message, 'error');
        } finally {
            setPlacingOrder(false);
        }
    };
    
    const resetCart = () => {
        setItems([]);
        setCep('');
        setShippingOptions([]);
        setSelectedShipping(null);
        setOrderPlaced(false);
        setAddressFetched(false);
        setAddress({ logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', estado: ''});
        setPaymentMethod('vista');
    }
    
    if (orderPlaced) {
        return (
             <div className="sticky top-8 bg-white border border-slate-200 shadow-md p-6 flex flex-col text-center animate-fade-in rounded-2xl">
                <h2 className="text-2xl font-bold mb-4 text-green-600">Pedido Realizado!</h2>
                <p className="text-slate-600 mb-6">Seu pedido foi enviado para aprovação e o boleto simulado foi gerado.</p>
                <div className="border-2 border-dashed border-slate-300 p-4 rounded-lg space-y-3 text-sm text-left">
                    <p className="font-bold text-lg text-center text-slate-800">Boleto Simulado</p>
                    <div className="flex justify-between text-slate-800"><span>Valor Total:</span><span className="font-bold">R$ {total.toFixed(2)}</span></div>
                    <p className="text-center font-mono tracking-widest bg-slate-100 p-2 rounded text-slate-500 break-all">
                        12345.67890 12345.678901 ...
                    </p>
                </div>
                 <button onClick={resetCart} className="mt-6 w-full flex justify-center py-3 px-4 border border-transparent text-sm font-bold rounded-lg text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white focus:ring-green-500 disabled:bg-green-600/50 disabled:cursor-not-allowed transition-all duration-300 shadow-lg shadow-green-600/20 transform hover:scale-105">
                    Iniciar Novo Pedido
                </button>
            </div>
        )
    }

    return (
        <div className="sticky top-8 bg-white border border-slate-200 shadow-md flex flex-col h-[calc(100vh-4rem)] rounded-2xl">
            <div className="p-6 flex-shrink-0 border-b border-slate-200">
                <h2 className="text-2xl font-bold text-slate-900">Resumo do Pedido</h2>
            </div>

            {items.length === 0 ? (
                <div className="p-6 flex-grow flex items-center justify-center">
                    <p className="text-slate-500">Seu carrinho está vazio.</p>
                </div>
            ) : (
                <div className="p-6 flex-grow overflow-y-auto space-y-4 custom-scrollbar">
                    {items.map(item => {
                        const quantityPerBox = item.quantity_per_box || 1;
                        const numBoxes = item.quantity / quantityPerBox;
                        const price = paymentMethod === 'cartao' ? item.price_cartao : item.price_vista;

                        return (
                            <div key={item.id} className="flex items-start gap-4">
                                <img src={item.image_urls[0]} alt={item.name} className="w-16 h-16 object-cover rounded-lg" />
                                <div className="flex-grow">
                                    <h3 className="font-semibold text-slate-800 truncate">{item.name}</h3>
                                    <p className="text-sm text-slate-500">R$ {price.toFixed(2)} / un.</p>
                                    <div className="flex items-center gap-3 mt-2">
                                        <button onClick={() => handleQuantityChange(item.id, item.quantity - quantityPerBox)} className="w-7 h-7 border border-slate-300 rounded-full text-slate-600 hover:bg-slate-100 transition-colors">-</button>
                                        <div className="text-center leading-tight">
                                           <span className="text-slate-800 font-bold">{numBoxes}</span>
                                           <span className="text-xs text-slate-500 block">{quantityPerBox > 1 ? 'caixa(s)' : 'un.'}</span>
                                        </div>
                                        <button onClick={() => handleQuantityChange(item.id, item.quantity + quantityPerBox)} className="w-7 h-7 border border-slate-300 rounded-full text-slate-600 hover:bg-slate-100 transition-colors">+</button>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="font-bold text-slate-800">R$ {(price * item.quantity).toFixed(2)}</p>
                                    <button onClick={() => handleRemoveItem(item.id)} className="text-xs text-red-500 hover:underline mt-1">Remover</button>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
            
            <div className="p-6 border-t border-slate-200 space-y-4 flex-shrink-0 bg-white overflow-y-auto custom-scrollbar rounded-b-2xl">
                
                {items.length > 0 && (
                    <div className="space-y-2">
                        <p className="text-sm font-semibold text-slate-600">Forma de Pagamento:</p>
                        <div className="grid grid-cols-2 gap-2">
                            <label className={`p-3 rounded-lg cursor-pointer border-2 text-center transition-all ${paymentMethod === 'vista' ? 'border-green-500 bg-green-50' : 'border-slate-200 bg-slate-100'}`}>
                                <input type="radio" name="paymentMethod" value="vista" checked={paymentMethod === 'vista'} onChange={() => setPaymentMethod('vista')} className="sr-only"/>
                                <span className="font-semibold text-slate-800">À Vista</span>
                            </label>
                            <label className={`p-3 rounded-lg cursor-pointer border-2 text-center transition-all ${paymentMethod === 'cartao' ? 'border-green-500 bg-green-50' : 'border-slate-200 bg-slate-100'}`}>
                                <input type="radio" name="paymentMethod" value="cartao" checked={paymentMethod === 'cartao'} onChange={() => setPaymentMethod('cartao')} className="sr-only"/>
                                <span className="font-semibold text-slate-800">Cartão</span>
                            </label>
                        </div>
                    </div>
                )}
                
                <div className="flex gap-2">
                    <input type="text" value={cep} onChange={e => setCep(e.target.value)} placeholder="CEP do cliente" className="flex-grow appearance-none relative block w-full px-4 py-3 border border-slate-300 bg-slate-100 placeholder-slate-400 text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 focus:z-10 sm:text-sm transition-all duration-300" />
                    <button onClick={handleCepLookup} disabled={isCalculating} className="px-4 py-2 bg-slate-200 text-slate-800 font-semibold rounded-lg hover:bg-slate-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white focus:ring-slate-400 transition-all duration-300 disabled:cursor-wait">
                        {isCalculating ? '...' : 'Buscar'}
                    </button>
                </div>

                {addressFetched && (
                    <div className="space-y-3 pt-2 animate-fade-in">
                        <h4 className="text-sm font-semibold text-slate-600">Endereço de Entrega:</h4>
                        <input type="text" value={address.logradouro} readOnly placeholder="Rua / Avenida" className="appearance-none relative block w-full px-4 py-3 border border-slate-300 bg-slate-200 placeholder-slate-400 text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 focus:z-10 sm:text-sm transition-all duration-300 cursor-not-allowed" />
                        <div className="grid grid-cols-3 gap-2">
                            <input type="text" value={address.numero} onChange={e => setAddress(a => ({...a, numero: e.target.value}))} placeholder="Número *" className="appearance-none relative block w-full px-4 py-3 border border-slate-300 bg-slate-100 placeholder-slate-400 text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 focus:z-10 sm:text-sm transition-all duration-300 col-span-1" />
                            <input type="text" value={address.complemento} onChange={e => setAddress(a => ({...a, complemento: e.target.value}))} placeholder="Complemento" className="appearance-none relative block w-full px-4 py-3 border border-slate-300 bg-slate-100 placeholder-slate-400 text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 focus:z-10 sm:text-sm transition-all duration-300 col-span-2" />
                        </div>
                    </div>
                )}


                {isCalculating && <div className="text-center text-sm text-slate-500">Calculando frete...</div>}
                
                {shippingOptions.length > 0 && (
                    <div className="space-y-2 pt-2">
                        <p className="text-sm font-semibold text-slate-600">Escolha a transportadora:</p>
                        {shippingOptions.map((option) => (
                            <label key={option.name} className="flex items-center justify-between p-3 bg-slate-100 rounded-lg cursor-pointer border-2 border-transparent has-[:checked]:border-green-500 has-[:checked]:bg-green-500/10 transition-all">
                                <div>
                                    <span className="font-semibold text-slate-800">{option.name}</span>
                                    <p className="text-xs text-slate-500">Entrega em até {option.days} dias</p>
                                </div>
                                <div className="flex items-center">
                                    <span className="font-bold text-lg text-slate-800 mr-4">R$ {option.cost.toFixed(2)}</span>
                                    <input 
                                        type="radio" 
                                        name="shippingOption" 
                                        value={option.name} 
                                        checked={selectedShipping?.name === option.name}
                                        onChange={() => setSelectedShipping(option)}
                                        className="form-radio h-5 w-5 text-green-600 bg-slate-200 border-slate-400 focus:ring-green-500"
                                    />
                                </div>
                            </label>
                        ))}
                    </div>
                )}

                <div className="space-y-2 text-sm text-slate-600 pt-2">
                    <div className="flex justify-between"><span>Subtotal</span><span>R$ {subtotal.toFixed(2)}</span></div>
                    {selectedShipping && <div className="flex justify-between"><span>Frete ({selectedShipping.name})</span><span>R$ {selectedShipping.cost.toFixed(2)}</span></div>}
                    <div className="flex justify-between font-bold text-xl border-t border-slate-200 pt-3 mt-2 text-slate-900"><span>Total</span><span>R$ {total.toFixed(2)}</span></div>
                </div>
                
                <button onClick={handlePlaceOrder} disabled={items.length === 0 || placingOrder || !selectedShipping || !address.numero} className="w-full flex justify-center py-3 px-4 border border-transparent text-sm font-bold rounded-lg text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white focus:ring-green-500 disabled:bg-green-600/50 disabled:cursor-not-allowed transition-all duration-300 shadow-lg shadow-green-600/20 transform hover:scale-105">
                   {placingOrder ? 'Finalizando...' : 'Gerar Boleto'}
                </button>
            </div>
        </div>
    );
};

export default ShoppingCart;
