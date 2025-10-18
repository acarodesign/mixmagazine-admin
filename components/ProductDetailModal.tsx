import React, { useState, useEffect } from 'react';
import type { Product } from '../types';

interface ProductDetailModalProps {
  product: Product | null;
  onClose: () => void;
  onAddToCart: (product: Product) => void;
}

const ProductDetailModal: React.FC<ProductDetailModalProps> = ({ product, onClose, onAddToCart }) => {
  const [selectedImage, setSelectedImage] = useState('');

  useEffect(() => {
    if (product) {
      setSelectedImage(product.image_urls[0] || '');
    }
  }, [product]);

  if (!product) return null;

  const handleAddToCartClick = () => {
    onAddToCart(product);
    onClose(); // Close modal after adding to cart
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-40 p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col md:flex-row overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Image Gallery */}
        <div className="w-full md:w-1/2 p-6 flex flex-col bg-slate-50">
          <div className="relative aspect-square mb-4">
             <img
                src={selectedImage}
                alt={product.name}
                className="w-full h-full object-cover rounded-lg shadow-inner"
              />
          </div>
          <div className="grid grid-cols-5 gap-2">
            {product.image_urls.map((url, index) => (
              <img
                key={index}
                src={url}
                alt={`${product.name} thumbnail ${index + 1}`}
                className={`w-full h-auto aspect-square object-cover rounded-md cursor-pointer border-2 transition-all ${selectedImage === url ? 'border-green-500' : 'border-transparent hover:border-slate-300'}`}
                onClick={() => setSelectedImage(url)}
              />
            ))}
          </div>
        </div>

        {/* Product Details */}
        <div className="w-full md:w-1/2 p-8 flex flex-col overflow-y-auto custom-scrollbar">
          <div className="flex justify-between items-start mb-4">
            <h2 className="text-3xl font-bold text-slate-900">{product.name}</h2>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-3xl transition-colors -mt-2 -mr-2">&times;</button>
          </div>
          <p className="text-sm text-slate-500 font-mono mb-4">Código: {product.codigo}</p>
          <p className="text-slate-600 mb-6">{product.description || 'Sem descrição detalhada.'}</p>
          
          <div className="space-y-2 text-sm mb-6 border-t border-slate-200 pt-6">
            <div className="flex justify-between items-center">
              <span className="text-slate-500 font-medium">Preço (à vista)</span>
              <span className="font-bold text-2xl text-slate-900">R$ {product.price.toFixed(2)}</span>
            </div>
             {product.price_card > 0 &&
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-medium">Preço (cartão)</span>
                <span className="font-bold text-2xl text-slate-900">R$ {product.price_card.toFixed(2)}</span>
              </div>
            }
             <div className="flex justify-between items-center bg-slate-100 p-3 rounded-lg mt-4">
              <span className="text-slate-500 font-medium">Unidades por Caixa</span>
              <span className="font-semibold text-slate-800">{product.quantity_per_box}</span>
            </div>
            <div className="flex justify-between items-center bg-slate-100 p-3 rounded-lg">
              <span className="text-slate-500 font-medium">Estoque Disponível</span>
               <span className={`font-semibold px-2 py-0.5 rounded-full ${product.stock > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                {product.stock} caixas
              </span>
            </div>
            {product.colors && product.colors.length > 0 && (
                <div className="bg-slate-100 p-3 rounded-lg">
                    <span className="text-slate-500 font-medium mb-2 block">Cores Disponíveis</span>
                    <div className="flex flex-wrap gap-2">
                        {product.colors.map(color => (
                            <span key={color} className="px-3 py-1 bg-white border border-slate-300 rounded-full text-xs text-slate-700">{color}</span>
                        ))}
                    </div>
                </div>
            )}
          </div>
          
          <div className="mt-auto">
            <button
              onClick={handleAddToCartClick}
              disabled={product.stock === 0}
              className="w-full py-3 px-4 text-sm font-bold rounded-lg text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white focus:ring-green-500 disabled:bg-slate-300 disabled:cursor-not-allowed transition-all duration-300 shadow-lg shadow-green-600/20 transform hover:scale-105"
            >
              {product.stock > 0 ? (product.quantity_per_box > 1 ? `Adicionar 1 Caixa (${product.quantity_per_box} un.)` : 'Adicionar ao Pedido') : 'Indisponível'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetailModal;