
import React from 'react';
import type { Product } from '../types';

interface ProductListProps {
  products: Product[];
  loading: boolean;
  onEdit: (product: Product) => void;
  onDelete: (productId: string, imageUrls: string[]) => void;
}

const ProductList = ({ products, loading, onEdit, onDelete }: ProductListProps) => {
  if (loading) {
    return (
      <div className="bg-white p-6 rounded-2xl shadow-md border border-slate-200 text-center">
        <p className="text-slate-500">Carregando produtos...</p>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-2xl shadow-md border border-slate-200">
      <h2 className="text-xl font-bold mb-6 text-slate-800">Produtos Cadastrados ({products.length})</h2>
      {products.length === 0 ? (
        <p className="text-slate-500 text-center py-8">Nenhum produto encontrado.</p>
      ) : (
        <div className="space-y-6 max-h-[calc(100vh-18rem)] overflow-y-auto pr-2 custom-scrollbar">
          {products.map((product) => (
            <div 
              key={product.id} 
              className="p-4 bg-white border border-slate-200 rounded-2xl grid grid-cols-1 md:grid-cols-3 gap-6 items-center transition-all duration-300 hover:bg-slate-50 hover:border-slate-300"
            >
              {/* Informações do Produto */}
              <div className="md:col-span-2">
                 <div className="flex justify-between items-start">
                    <div>
                        <h3 className="font-bold text-lg text-green-600">{product.name}</h3>
                        {product.categoria && <p className="text-xs text-slate-500 -mt-1">{product.categoria}</p>}
                        <p className="text-sm text-slate-500 font-mono mt-1">Código: {product.codigo}</p>
                    </div>
                    <div className="text-right ml-4">
                        <p className="font-semibold text-lg text-slate-800 whitespace-nowrap">
                            <span className="text-xs text-slate-500">À Vista:</span> R$ {product.price_vista.toFixed(2)}
                        </p>
                        <p className="font-semibold text-lg text-slate-800 whitespace-nowrap">
                            <span className="text-xs text-slate-500">Cartão:</span> R$ {product.price_cartao.toFixed(2)}
                        </p>
                    </div>
                </div>
                <p className="mt-2 text-slate-600 text-sm line-clamp-2">{product.description}</p>
                 <div className="mt-4 flex justify-between items-center">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${product.stock > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    Estoque: {product.stock} caixas
                  </span>
                   <div className="flex items-center space-x-2">
                      <button 
                        onClick={() => onEdit(product)}
                        className="px-3 py-1 text-xs font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors"
                      >
                        Editar
                      </button>
                      <button 
                        onClick={() => onDelete(product.id, product.image_urls)}
                        className="px-3 py-1 text-xs font-medium text-white bg-red-600 rounded-md hover:bg-red-700 transition-colors"
                      >
                        Excluir
                      </button>
                   </div>
                 </div>
              </div>
              
              {/* Imagens do Produto */}
              <div className="md:col-span-1 flex flex-wrap gap-2 items-center justify-start md:justify-end">
                {product.image_urls.slice(0, 3).map((url, index) => (
                  <img
                    key={index}
                    src={url}
                    alt={`${product.name} ${index + 1}`}
                    className="w-20 h-20 object-cover rounded-lg border-2 border-slate-200"
                  />
                ))}
                {product.image_urls.length > 3 && (
                    <div className="w-20 h-20 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-lg">
                        +{product.image_urls.length - 3}
                    </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProductList;