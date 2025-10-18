import React, { useState, useEffect } from 'react';
import type { Product } from '../types';
import { supabase } from '../services/supabase';

interface EditProductModalProps {
  product: Product;
  onClose: () => void;
  onUpdate: () => void;
  showToast: (message: string, type: 'success' | 'error') => void;
}

const EditProductModal: React.FC<EditProductModalProps> = ({ product, onClose, onUpdate, showToast }) => {
  const [formData, setFormData] = useState({ ...product, colors: product.colors.join(', ') });
  const [loading, setLoading] = useState(false);
  const [imagesToRemove, setImagesToRemove] = useState<string[]>([]);
  const [newImageFiles, setNewImageFiles] = useState<File[]>([]);
  const [newImagePreviews, setNewImagePreviews] = useState<string[]>([]);

  useEffect(() => {
    setFormData({ ...product, colors: product.colors.join(', ') });
    setImagesToRemove([]);
    setNewImageFiles([]);
  }, [product]);

  useEffect(() => {
    if (newImageFiles.length === 0) {
      setNewImagePreviews([]);
      return;
    }
    const objectUrls = newImageFiles.map(file => URL.createObjectURL(file));
    setNewImagePreviews(objectUrls);

    return () => {
      objectUrls.forEach(url => URL.revokeObjectURL(url));
    };
  }, [newImageFiles]);


  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleToggleRemoveExistingImage = (url: string) => {
    setImagesToRemove(prev =>
      prev.includes(url) ? prev.filter(u => u !== url) : [...prev, url]
    );
  };

  const handleNewImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setNewImageFiles(prev => [...prev, ...Array.from(e.target.files!)]);
    }
     // Reset file input to allow selecting the same file again
    e.target.value = '';
  };

  const handleRemoveNewImage = (index: number) => {
    setNewImageFiles(prev => prev.filter((_, i) => i !== index));
  };


  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    if (!formData.name.trim() || !formData.price || !formData.stock) {
        showToast('Nome, Preço e Estoque são campos obrigatórios.', 'error');
        setLoading(false);
        return;
    }

    try {
      // 1. Upload new images
      const uploadedImageUrls: string[] = [];
      for (const file of newImageFiles) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage.from('produtos').upload(filePath, file);

        if (uploadError) {
          throw new Error(`Falha no upload da imagem: ${uploadError.message}`);
        }
        
        const { data: { publicUrl } } = supabase.storage.from('produtos').getPublicUrl(filePath);
        if (!publicUrl) {
          throw new Error('Não foi possível obter a URL pública da imagem enviada.');
        }
        uploadedImageUrls.push(publicUrl);
      }

      // 2. Prepare final list of image URLs
      const keptImageUrls = product.image_urls.filter(url => !imagesToRemove.includes(url));
      const finalImageUrls = [...keptImageUrls, ...uploadedImageUrls];

      // 3. Prepare data and update database
      const dataToUpdateForDb = {
          codigo: formData.codigo,
          name: formData.name,
          description: formData.description,
          price: parseFloat(String(formData.price)),
          quantity_per_box: parseInt(String(formData.quantity_per_box), 10) || 1,
          colors: formData.colors.split(',').map(c => c.trim()).filter(Boolean),
          stock: parseInt(String(formData.stock), 10),
          image_urls: finalImageUrls,
      };

      const { error: dbError } = await supabase.from('produtos').update(dataToUpdateForDb).eq('id', product.id);
      
      if (dbError) {
        // If DB update fails, try to clean up newly uploaded images
        if (uploadedImageUrls.length > 0) {
          const paths = uploadedImageUrls.map(url => url.split('/').pop()).filter(Boolean);
          if (paths.length > 0) await supabase.storage.from('produtos').remove(paths);
        }
        throw new Error(`Erro ao atualizar o produto no banco de dados: ${dbError.message}`);
      }

      // 4. If DB update is successful, delete removed images from storage
      if (imagesToRemove.length > 0) {
        const pathsToRemove = imagesToRemove.map(url => {
          try {
            const urlObject = new URL(url);
            const pathParts = urlObject.pathname.split('/');
            return pathParts.slice(pathParts.indexOf('produtos') + 1).join('/');
          } catch(e) {
            console.error("Invalid URL for storage object:", url);
            return null;
          }
        }).filter(Boolean) as string[];
        
        if (pathsToRemove.length > 0) {
            const { error: storageError } = await supabase.storage.from('produtos').remove(pathsToRemove);
            if (storageError) {
                console.error("Falha ao remover imagens antigas, mas o produto foi atualizado.", storageError);
                showToast('Produto atualizado, mas houve falha ao remover imagens antigas do armazenamento.', 'error');
            }
        }
      }

      showToast('Produto atualizado com sucesso!', 'success');
      onUpdate();

    } catch (error) {
      const message = error instanceof Error ? error.message : 'Ocorreu um erro desconhecido.';
      showToast(message, 'error');
    } finally {
      setLoading(false);
    }
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
        
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
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
            </div>

            <div className="space-y-4 border-t border-slate-200 pt-6">
              <label className="block text-sm font-medium text-slate-600 mb-1">Gerenciar Imagens</label>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
                  {product.image_urls.map(url => (
                      <div key={url} className="relative group">
                          <img
                              src={url}
                              alt="Imagem existente"
                              className={`w-full h-24 object-cover rounded-lg border-2 transition-all ${imagesToRemove.includes(url) ? 'border-red-400 opacity-50' : 'border-slate-200'}`}
                          />
                          <button
                              type="button"
                              onClick={() => handleToggleRemoveExistingImage(url)}
                              title={imagesToRemove.includes(url) ? 'Cancelar remoção' : 'Remover imagem'}
                              className={`absolute top-1 right-1 bg-white/80 rounded-full w-6 h-6 flex items-center justify-center transition-all transform scale-0 group-hover:scale-100 ${imagesToRemove.includes(url) ? 'text-blue-500 hover:bg-blue-500' : 'text-red-500 hover:bg-red-500'} hover:text-white`}
                          >
                            {imagesToRemove.includes(url) ? '↺' : '×'}
                          </button>
                      </div>
                  ))}
              </div>

              {newImagePreviews.length > 0 && (
                  <div className="mt-4">
                      <label className="block text-sm font-medium text-slate-600 mb-1">Novas Imagens para Adicionar</label>
                      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
                          {newImagePreviews.map((preview, index) => (
                              <div key={index} className="relative group">
                                  <img
                                      src={preview}
                                      alt={`Pré-visualização ${index + 1}`}
                                      className="w-full h-24 object-cover rounded-lg border-2 border-green-300"
                                  />
                                  <button
                                      type="button"
                                      onClick={() => handleRemoveNewImage(index)}
                                      title="Não adicionar esta imagem"
                                      className="absolute top-1 right-1 bg-white/80 rounded-full w-6 h-6 flex items-center justify-center text-red-500 hover:bg-red-500 hover:text-white transition-all transform scale-0 group-hover:scale-100"
                                  >
                                      ×
                                  </button>
                              </div>
                          ))}
                      </div>
                  </div>
              )}

              <div>
                <label htmlFor="new-images" className="block text-sm font-medium text-slate-600 mb-1">Adicionar Novas Imagens</label>
                <input type="file" id="new-images" onChange={handleNewImageChange} multiple accept="image/*" className="mt-1 block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-green-100 file:text-green-700 hover:file:bg-green-200 cursor-pointer" />
              </div>
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
