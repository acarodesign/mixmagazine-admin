
import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import type { Product } from '../types';

interface EditProductModalProps {
  product: Product;
  onClose: () => void;
  onUpdate: (product: Product) => Promise<void>;
  showToast: (message: string, type: 'success' | 'error') => void;
}

const EditProductModal: React.FC<EditProductModalProps> = ({ product, onClose, onUpdate, showToast }) => {
  const [formData, setFormData] = useState({ 
    ...product, 
    colors: product.colors.join(', '), 
    parent_product_id: product.parent_product_id || '' 
  });
  const [loading, setLoading] = useState(false);
  const [parentProducts, setParentProducts] = useState<Product[]>([]);

  useEffect(() => {
    setFormData({ 
        ...product, 
        colors: product.colors.join(', '),
        parent_product_id: product.parent_product_id || '' 
    });
  }, [product]);
  
  useEffect(() => {
    // Carrega produtos que podem ser pais (e que não seja o próprio produto sendo editado)
    const fetchParentProducts = async () => {
      const { data, error } = await supabase
        .from('produtos')
        .select('id, name, codigo')
        .is('parent_product_id', null)
        .neq('id', product.id)
        .order('name', { ascending: true });
      
      if (error) {
        showToast('Erro ao carregar produtos para agrupamento.', 'error');
      } else {
        setParentProducts(data as Product[]);
      }
    };
    fetchParentProducts();
  }, [product.id, showToast]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    if (!formData.name.trim() || !formData.price || !formData.stock) {
        showToast('Nome, Preço e Estoque são campos obrigatórios.', 'error');
        setLoading(false);
        return;
    }

    const dataToUpdate: Product = {
        ...formData,
        price: parseFloat(String(formData.price)),
        stock: parseInt(String(formData.stock), 10),
        quantity_per_box: parseInt(String(formData.quantity_per_box), 10) || 1,
        colors: formData.colors.split(',').map(c => c.trim()).filter(Boolean),
        parent_product_id: formData.parent_product_id || null
    };

    await onUpdate(dataToUpdate);
    setLoading(false);
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-75 flex justify-center items-center z-40 p-4 animate-fade-in" 
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl shadow-xl p-6 md:p-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto custom-scrollbar" 
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-slate-900">Editar Produto</h2>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-3xl transition-colors">&times;</button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="edit-parent_product_id" className="block text-sm font-medium text-slate-600 mb-1">Subgrupo de (Opcional)</label>
              <select 
                id="edit-parent_product_id" 
                name="parent_product_id"
                value={formData.parent_product_id}
                onChange={handleChange}
                className="appearance-none relative block w-full px-4 py-3 border border-slate-300 bg-slate-100 placeholder-slate-400 text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 focus:z-10 sm:text-sm transition-all duration-300"
              >
                <option value="">Nenhum (Produto Principal)</option>
                {parentProducts.map(p => (
                  <option key={p.id} value={p.id}>{p.name} (Cód: {p.codigo})</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="edit-codigo" className="block text-sm font-medium text-slate-600 mb-1">Código do Produto</label>
              <input type="text" id="edit-codigo" name="codigo" value={formData.codigo} onChange={handleChange} required className="appearance-none relative block w-full px-4 py-3 border border-slate-300 bg-slate-100 placeholder-slate-400 text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 focus:z-10 sm:text-sm transition-all duration-300" />
            </div>
            <div>
              <label htmlFor="edit-name" className="block text-sm font-medium text-slate-600 mb-1">Nome</label>
              <input type="text" id="edit-name" name="name" value={formData.name} onChange={handleChange} required className="appearance-none relative block w-full px-4 py-3 border border-slate-300 bg-slate-100 placeholder-slate-400 text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 focus:z-10 sm:text-sm transition-all duration-300" />
            </div>
            <div>
              <label htmlFor="edit-description" className="block text-sm font-medium text-slate-600 mb-1">Descrição</label>
              <textarea id="edit-description" name="description" value={formData.description} onChange={handleChange} rows={3} className="appearance-none relative block w-full px-4 py-3 border border-slate-300 bg-slate-100 placeholder-slate-400 text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 focus:z-10 sm:text-sm transition-all duration-300" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="edit-price" className="block text-sm font-medium text-slate-600 mb-1">Preço (unidade)</label>
                <input type="number" id="edit-price" name="price" value={formData.price} onChange={handleChange} required min="0" step="0.01" className="appearance-none relative block w-full px-4 py-3 border border-slate-300 bg-slate-100 placeholder-slate-400 text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 focus:z-10 sm:text-sm transition-all duration-300" />
              </div>
              <div>
                <label htmlFor="edit-stock" className="block text-sm font-medium text-slate-600 mb-1">Estoque (caixas)</label>
                <input type="number" id="edit-stock" name="stock" value={formData.stock} onChange={handleChange} required min="0" step="1" className="appearance-none relative block w-full px-4 py-3 border border-slate-300 bg-slate-100 placeholder-slate-400 text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 focus:z-10 sm:text-sm transition-all duration-300" />
              </div>
            </div>
             <div>
                <label htmlFor="edit-quantityPerBox" className="block text-sm font-medium text-slate-600 mb-1">Quantidade por Caixa</label>
                <input type="number" id="edit-quantityPerBox" name="quantity_per_box" value={formData.quantity_per_box} onChange={handleChange} min="1" step="1" className="appearance-none relative block w-full px-4 py-3 border border-slate-300 bg-slate-100 placeholder-slate-400 text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 focus:z-10 sm:text-sm transition-all duration-300" />
            </div>
            <div>
              <label htmlFor="edit-colors" className="block text-sm font-medium text-slate-600 mb-1">Cores (separadas por vírgula)</label>
              <input type="text" id="edit-colors" name="colors" value={formData.colors} onChange={handleChange} className="appearance-none relative block w-full px-4 py-3 border border-slate-300 bg-slate-100 placeholder-slate-400 text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 focus:z-10 sm:text-sm transition-all duration-300" />
            </div>
            <div className="pt-4 flex justify-end items-center space-x-4">
              <button type="button" onClick={onClose} className="px-4 py-2 bg-slate-200 text-slate-800 font-semibold rounded-lg hover:bg-slate-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white focus:ring-slate-400 transition-all duration-300">
                Cancelar
              </button>
              <button type="submit" disabled={loading} className="w-auto flex justify-center py-3 px-4 border border-transparent text-sm font-bold rounded-lg text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white focus:ring-green-500 disabled:bg-green-600/50 disabled:cursor-not-allowed transition-all duration-300 shadow-lg shadow-green-600/20 transform hover:scale-105">
                {loading ? 'Salvando...' : 'Salvar Alterações'}
              </button>
            </div>
        </form>
      </div>
    </div>
  );
};

export default EditProductModal;
