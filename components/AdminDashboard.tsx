import React, { useState, useEffect, useCallback } from 'react';
import ProductForm from './ProductForm';
import ProductList from './ProductList';
import AdminOrderList from './AdminOrderList';
import AdminReports from './AdminReports';
import EditProductModal from './EditProductModal';
import ConfirmationModal from './ConfirmationModal';
import { supabase } from '../services/supabase';
import type { Product } from '../types';

interface AdminDashboardProps {
  showToast: (message: string, type: 'success' | 'error') => void;
  handleLogout: () => void;
  userEmail: string | undefined;
}

type AdminTab = 'products' | 'orders' | 'reports';

const ProductsIcon = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
  </svg>
);
const OrdersIcon = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
  </svg>
);
const ReportsIcon = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
);
const LogoutIcon = ({ className }: { className?: string }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
    </svg>
);

const AdminDashboard: React.FC<AdminDashboardProps> = ({ showToast, handleLogout, userEmail }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [activeTab, setActiveTab] = useState<AdminTab>('products');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productToDelete, setProductToDelete] = useState<{id: string; imageUrls: string[]} | null>(null);


  const fetchProducts = useCallback(async () => {
    setLoadingProducts(true);
    const { data, error } = await supabase
      .from('produtos')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      showToast(`Erro ao buscar produtos: ${error.message}`, 'error');
    } else {
      setProducts(data as Product[]);
    }
    setLoadingProducts(false);
  }, [showToast]);

  useEffect(() => {
    if (activeTab === 'products') {
        fetchProducts();
    }
  }, [fetchProducts, activeTab]);

  const handleDeleteProduct = (productId: string, imageUrls: string[]) => {
    setProductToDelete({ id: productId, imageUrls });
  };
  
  const confirmDeleteProduct = async () => {
    if (!productToDelete) return;

    const { id: productId, imageUrls } = productToDelete;

    try {
        const filePaths = imageUrls.map(url => {
            const parts = url.split('/');
            return parts[parts.length - 1];
        }).filter(Boolean);

        if (filePaths.length > 0) {
            const { error: storageError } = await supabase.storage.from('produtos').remove(filePaths);
            if (storageError) {
                console.error('Erro ao remover imagens do Storage, mas continuando:', storageError.message);
                showToast(`Aviso: Falha ao remover imagens do Storage: ${storageError.message}`, 'error');
            }
        }

        const { error: dbError } = await supabase.from('produtos').delete().eq('id', productId);
        if (dbError) {
            throw new Error(`Erro ao excluir produto do banco de dados: ${dbError.message}`);
        }

        showToast('Produto excluído com sucesso!', 'success');
        fetchProducts();
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Ocorreu um erro ao excluir o produto.';
        showToast(message, 'error');
    } finally {
        setProductToDelete(null);
    }
  };

  const handleUpdateProduct = async (updatedProduct: Product) => {
    const { id, created_at, image_urls, ...updateData } = updatedProduct;

    try {
        const { error } = await supabase.from('produtos').update(updateData).eq('id', id);
        if (error) throw error;

        showToast('Produto atualizado com sucesso!', 'success');
        setEditingProduct(null);
        fetchProducts();
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Ocorreu um erro ao atualizar o produto.';
        showToast(message, 'error');
    }
  };

  const renderContent = () => {
    switch(activeTab) {
        case 'products':
            return (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in">
                    <div className="lg:col-span-1">
                        <ProductForm showToast={showToast} onProductAdded={fetchProducts} />
                    </div>
                    <div className="lg:col-span-2">
                        <ProductList
                          products={products}
                          loading={loadingProducts}
                          onEdit={(product) => setEditingProduct(product)}
                          onDelete={handleDeleteProduct}
                        />
                    </div>
                </div>
            );
        case 'orders':
            return <AdminOrderList showToast={showToast} />;
        case 'reports':
            return <AdminReports showToast={showToast} />;
        default:
            return null;
    }
  }
  
  const tabs = [
    { key: 'products', label: 'Gerenciar Produtos', icon: ProductsIcon },
    { key: 'orders', label: 'Pedidos Recebidos', icon: OrdersIcon },
    { key: 'reports', label: 'Relatórios', icon: ReportsIcon }
  ];


  return (
    <>
      <div className="flex min-h-screen bg-slate-50 text-slate-800">
        <aside className="w-64 flex-shrink-0 bg-white border-r border-slate-200 flex flex-col">
          <div className="h-20 flex items-center justify-center border-b border-slate-200">
            <img src="https://plqzupgyvcfelpkmdabr.supabase.co/storage/v1/object/public/assets-publicos/logomarca.png" alt="Mix Magazine Logo" className="h-12" />
          </div>
          <nav className="flex-grow pt-6">
            <ul className="space-y-2">
              {tabs.map(tab => (
                <li key={tab.key} className="px-4">
                  <button
                    onClick={() => setActiveTab(tab.key as AdminTab)}
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
          <div className="p-4 border-t border-slate-200">
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

        <main className="flex-grow p-6 md:p-8 overflow-auto">
          <div className="max-w-7xl mx-auto">
            <h1 className="text-3xl font-bold text-slate-900 mb-2">Painel do Administrador</h1>
            <p className="text-slate-500 mb-8">Bem-vindo! Gerencie produtos, pedidos e relatórios com facilidade.</p>
            {renderContent()}
          </div>
        </main>
      </div>
      
      {editingProduct && (
        <EditProductModal
          product={editingProduct}
          onClose={() => setEditingProduct(null)}
          onUpdate={handleUpdateProduct}
          showToast={showToast}
        />
      )}
      {productToDelete && (
         <ConfirmationModal
            isOpen={!!productToDelete}
            onClose={() => setProductToDelete(null)}
            onConfirm={confirmDeleteProduct}
            title="Confirmar Exclusão"
            message="Tem certeza que deseja excluir este produto? As imagens associadas também serão removidas. Esta ação não pode ser desfeita."
            confirmText="Excluir"
            isDestructive={true}
        />
      )}
    </>
  );
};

export default AdminDashboard;