import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase';
import type { Product, CartItem, Order } from '../types';
import ShoppingCart from './ShoppingCart';
import SellerOrderHistory from './SellerOrderHistory';
import ImageZoomModal from './ImageZoomModal';
import ProductDetailModal from './ProductDetailModal';
import { LOGO_URL } from '../config';

interface SellerDashboardProps {
  showToast: (message: string, type: 'success' | 'error') => void;
  handleLogout: () => void;
  userEmail: string | undefined;
}

type SellerTab = 'catalog' | 'orders';

const MenuIcon = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
  </svg>
);
const CatalogIcon = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
  </svg>
);
const MyOrdersIcon = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
  </svg>
);
const LogoutIcon = ({ className }: { className?: string }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
    </svg>
);


const SellerDashboard: React.FC<SellerDashboardProps> = ({ showToast, handleLogout, userEmail }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [activeTab, setActiveTab] = useState<SellerTab>('catalog');
  const [zoomedImageUrl, setZoomedImageUrl] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [viewingProduct, setViewingProduct] = useState<Product | null>(null);
  const [currentImageIndices, setCurrentImageIndices] = useState<{ [key: string]: number }>({});

  const handlePrevImage = (productId: string, totalImages: number) => {
    setCurrentImageIndices(prev => ({
        ...prev,
        [productId]: ((prev[productId] || 0) - 1 + totalImages) % totalImages
    }));
  };

  const handleNextImage = (productId: string, totalImages: number) => {
    setCurrentImageIndices(prev => ({
        ...prev,
        [productId]: ((prev[productId] || 0) + 1) % totalImages
    }));
  };

  const fetchProducts = useCallback(async () => {
    setLoadingProducts(true);
    const { data, error } = await supabase
      .from('produtos')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      showToast(`Erro ao buscar produtos: ${error.message}`, 'error');
    } else {
      setProducts(data as Product[]);
    }
    setLoadingProducts(false);
  }, [showToast]);

  useEffect(() => {
    if (activeTab === 'catalog') {
      fetchProducts();
    }
  }, [fetchProducts, activeTab]);
  
  const handleTabChange = (tab: SellerTab) => {
    setActiveTab(tab);
    setIsSidebarOpen(false); // Fecha a sidebar ao selecionar um item no mobile
  }

  const handleAddToCart = (product: Product) => {
    const quantityPerBox = product.quantity_per_box || 1;

    setCartItems(prevItems => {
        const itemInCart = prevItems.find(item => item.id === product.id);

        if (itemInCart) {
            const currentBoxes = itemInCart.quantity / quantityPerBox;
            if (currentBoxes + 1 <= product.stock) {
                showToast(`${product.name} (1 caixa) adicionado.`, 'success');
                return prevItems.map(item =>
                    item.id === product.id ? { ...item, quantity: item.quantity + quantityPerBox } : item
                );
            } else {
                showToast(`Estoque máximo para ${product.name} atingido.`, 'error');
                return prevItems;
            }
        }
        
        if (1 <= product.stock) {
            showToast(`${product.name} (1 caixa) adicionado.`, 'success');
            return [...prevItems, { ...product, quantity: quantityPerBox }];
        } else {
             showToast(`Estoque insuficiente para ${product.name}.`, 'error');
             return prevItems;
        }
    });
  };
  
  const handleEditOrder = (order: Order) => {
      if (cartItems.length > 0) {
        if (!window.confirm("Seu carrinho não está vazio. Carregar este pedido para edição irá substituir os itens atuais. Deseja continuar?")) {
            return;
        }
      }

      if (order.status !== 'Pendente') {
        showToast('Apenas pedidos "Pendentes" podem ser editados.', 'error');
        return;
      }
      
      const cartItemsFromOrder: CartItem[] = order.pedido_items.map(item => ({
        ...(item.produtos as Product),
        quantity: item.quantity,
      }));

      setCartItems(cartItemsFromOrder);
      setActiveTab('catalog');
      showToast('Pedido carregado no carrinho para edição.', 'success');
  };


  const renderContent = () => {
    switch(activeTab) {
        case 'catalog':
            return (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in">
                    <div className="lg:col-span-2">
                         {loadingProducts ? (
                            <div className="text-center text-slate-500 py-10">Carregando produtos...</div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                {products.map(product => {
                                    const currentImageIndex = currentImageIndices[product.id] || 0;
                                    const currentImageUrl = product.image_urls[currentImageIndex];

                                    return (
                                        <div key={product.id} className="bg-white border border-slate-200 rounded-2xl overflow-hidden flex flex-col group shadow-md hover:shadow-lg transition-shadow duration-300">
                                            <div className="relative overflow-hidden group/image-gallery">
                                                <img 
                                                  src={currentImageUrl}
                                                  alt={product.name} 
                                                  className="w-full h-56 object-cover cursor-zoom-in transition-transform duration-300 group-hover:scale-110"
                                                  onClick={() => setZoomedImageUrl(currentImageUrl)}
                                                />
                                                {product.image_urls.length > 1 && (
                                                    <>
                                                        <button onClick={(e) => { e.stopPropagation(); handlePrevImage(product.id, product.image_urls.length); }} className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/40 text-white w-8 h-8 rounded-full flex items-center justify-center opacity-0 group-hover/image-gallery:opacity-100 transition-opacity z-10 hover:bg-black/60">&lt;</button>
                                                        <button onClick={(e) => { e.stopPropagation(); handleNextImage(product.id, product.image_urls.length); }} className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/40 text-white w-8 h-8 rounded-full flex items-center justify-center opacity-0 group-hover/image-gallery:opacity-100 transition-opacity z-10 hover:bg-black/60">&gt;</button>
                                                        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex space-x-1.5 z-10">
                                                            {product.image_urls.map((_, index) => (
                                                                <div key={index} className={`w-2 h-2 rounded-full transition-colors ${index === currentImageIndex ? 'bg-white' : 'bg-white/50'}`}></div>
                                                            ))}
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                            <div className="p-5 flex flex-col flex-grow">
                                                <h3 className="font-bold text-lg text-slate-800 truncate">{product.name}</h3>
                                                <p className="text-sm text-slate-500 font-mono">Cód: {product.codigo}</p>
                                                
                                                <div className="mt-4 flex justify-between items-center">
                                                    <span className="font-bold text-2xl text-slate-900">R$ {product.price.toFixed(2)}</span>
                                                    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${product.stock > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                        {product.stock > 0 ? `${product.stock} cx.` : 'Sem estoque'}
                                                    </span>
                                                </div>
                                                <div className="mt-auto pt-4 space-y-2">
                                                    <button 
                                                        onClick={() => setViewingProduct(product)}
                                                        className="w-full py-2.5 px-4 text-sm font-bold rounded-lg text-slate-700 bg-slate-100 hover:bg-slate-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white focus:ring-slate-300 transition-all duration-300"
                                                    >
                                                        Ver Detalhes
                                                    </button>
                                                    <button 
                                                        onClick={() => handleAddToCart(product)}
                                                        disabled={product.stock === 0}
                                                        className="w-full py-2.5 px-4 text-sm font-bold rounded-lg text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white focus:ring-green-500 disabled:bg-slate-300 disabled:cursor-not-allowed disabled:transform-none transition-all duration-300 shadow-lg shadow-green-600/20 transform hover:scale-105"
                                                    >
                                                        {product.stock > 0 ? (product.quantity_per_box > 1 ? 'Adicionar Caixa' : 'Adicionar ao Pedido') : 'Indisponível'}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                    <div className="lg:col-span-1">
                        <ShoppingCart items={cartItems} setItems={setCartItems} showToast={showToast}/>
                    </div>
                </div>
            );
        case 'orders':
            return <SellerOrderHistory showToast={showToast} onEditOrder={handleEditOrder} />;
        default:
            return null;
    }
  }

  const tabs = [
    { key: 'catalog', label: 'Catálogo de Produtos', icon: CatalogIcon },
    { key: 'orders', label: 'Meus Pedidos', icon: MyOrdersIcon }
  ];


  return (
    <>
      <div className="relative min-h-screen lg:flex bg-slate-50 text-slate-800">
        {isSidebarOpen && (
            <div 
              className="fixed inset-0 bg-black/50 z-20 lg:hidden"
              onClick={() => setIsSidebarOpen(false)}
            ></div>
        )}
        <aside 
            className={`fixed inset-y-0 left-0 z-30 w-64 bg-white border-r border-slate-200 flex flex-col transform transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:relative lg:translate-x-0 lg:flex-shrink-0`}
        >
          <div className="h-20 flex items-center justify-center border-b border-slate-200 flex-shrink-0">
            <img src={LOGO_URL} alt="Mix Magazine Logo" className="h-12" />
          </div>
          <nav className="flex-grow pt-6 overflow-y-auto">
            <ul className="space-y-2">
              {tabs.map(tab => (
                <li key={tab.key} className="px-4">
                  <button
                    onClick={() => handleTabChange(tab.key as SellerTab)}
                    className={`
                      w-full flex items-center space-x-3 px-4 py-3 rounded-lg font-semibold text-sm transition-colors duration-200
                      ${activeTab === tab.key
                        ? 'bg-green-100 text-green-800'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}
                    `}
                  >
                    <tab.icon className="h-5 w-5" />
                    <span>{tab.label}</span>
                  </button>
                </li>
              ))}
            </ul>
          </nav>
          <div className="p-4 border-t border-slate-200 flex-shrink-0">
             <div className="text-xs text-slate-500 truncate mb-2" title={userEmail}>{userEmail}</div>
             <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center space-x-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 py-2 rounded-lg transition-colors"
              >
                <LogoutIcon className="h-5 w-5" />
                <span>Sair</span>
              </button>
          </div>
        </aside>

        <main className="flex-grow p-6 md:p-8 overflow-y-auto">
          <div className="max-w-7xl mx-auto">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden p-2 -ml-2 mb-4 text-slate-600 hover:text-slate-900"
              aria-label="Abrir menu"
            >
              <MenuIcon className="h-6 w-6" />
            </button>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Catálogo de Vendas B2B</h1>
            <p className="text-slate-500 mb-8">Navegue pelos produtos, monte e gerencie seus pedidos.</p>
            {renderContent()}
          </div>
        </main>
      </div>

      {zoomedImageUrl && (
        <ImageZoomModal imageUrl={zoomedImageUrl} onClose={() => setZoomedImageUrl(null)} />
      )}
      {viewingProduct && (
        <ProductDetailModal
          product={viewingProduct}
          onClose={() => setViewingProduct(null)}
          onAddToCart={handleAddToCart}
        />
      )}
    </>
  );
};

export default SellerDashboard;
