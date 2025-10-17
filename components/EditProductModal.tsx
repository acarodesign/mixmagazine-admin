import React, { useState, useEffect } from 'react';
import type { Product } from '../types';
import { supabase } from '../services/supabase';

const TrashIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
);

const UndoIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
    </svg>
);


interface EditProductModalProps {
  product: Product;
  onClose: () => void;
  onUpdateSuccess: () => void;
  showToast: (message: string, type: 'success' | 'error') => void;
}

const EditProductModal: React.FC<EditProductModalProps> = ({ product, onClose, onUpdateSuccess, showToast }) => {
  const [formData, setFormData] = useState({ ...product, colors: product.colors.join(', ') });
  const [loading, setLoading] = useState(false);
  const [newImageFiles, setNewImageFiles] = useState<FileList | null>(null);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [imagesToDelete, setImagesToDelete] = useState<Set<string>>(new Set());

  useEffect(() => {
    setFormData({ ...product, colors: product.colors.join(', ') });
    setImagesToDelete(new Set());
    setNewImageFiles(null);
  }, [product]);
  
  useEffect(() => {
    if (!newImageFiles) {
        setImagePreviews([]);
        return;
    }
    const urls = Array.from(newImageFiles).map(file => URL.createObjectURL(file as Blob));
    setImagePreviews(urls);
    return () => {
        urls.forEach(url => URL.revokeObjectURL(url));
    };
  }, [newImageFiles]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleDeleteImage = (url: string) => {
    setImagesToDelete(prev => new Set(prev).add(url));
  };

  const handleUndoDeleteImage = (url: string) => {
    setImagesToDelete(prev => {
        const newSet = new Set(prev);
        newSet.delete(url);
        return newSet;
    });
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
        // 1. Delete marked images from storage
        if (imagesToDelete.size > 0) {
            const pathsToDelete = Array.from(imagesToDelete).map(url => url.split('/produtos/').pop()).filter(Boolean);
            if (pathsToDelete.length > 0) {
                const { error: deleteError } = await supabase.storage.from('produtos').remove(pathsToDelete as string[]);
                if (deleteError) throw new Error(`Falha ao remover imagens antigas: ${deleteError.message}`);
            }
        }

        // 2. Upload new images to storage
        const newUploadedUrls: string[] = [];
        if (newImageFiles) {
            for (const file of Array.from(newImageFiles) as File[]) {
                const fileExt = file.name.split('.').pop();
                const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;
                const filePath = `${fileName}`;

                const { error: uploadError } = await supabase.storage.from('produtos').upload(filePath, file);
                if (uploadError) throw new Error(`Falha no upload da imagem: ${uploadError.message}`);

                const { data: { publicUrl } } = supabase.storage.from('produtos').getPublicUrl(filePath);
                if (!publicUrl) throw new Error('Não foi possível obter a URL pública da imagem enviada.');

                newUploadedUrls.push(publicUrl);
            }
        }

        // 3. Prepare final data for DB update
        const finalImageUrls = [
            ...product.image_urls.filter(url => !imagesToDelete.has(url)),
            ...newUploadedUrls
        ];

        if (finalImageUrls.length === 0) {
             throw new Error('O produto deve ter pelo menos uma imagem.');
        }

        const dataToUpdate = {
            ...formData,
            price: parseFloat(String(formData.price)),
            stock: parseInt(String(formData.stock), 10),
            quantity_per_box: parseInt(String(formData.quantity_per_box), 10) || 1,
            // FIX: Ensure formData.colors is treated as a string before splitting.
            // This prevents a TypeScript error where the type is inferred as 'unknown'.
            colors: String(formData.colors ?? '').split(',').map(c => c.trim()).filter(Boolean),
            image_urls: finalImageUrls,
        };
        
        const { id, created_at, ...updatePayload } = dataToUpdate;

        // 4. Update product in DB
        const { error: updateError } = await supabase
            .from('produtos')
            .update(updatePayload)
            .eq('id', product.id);

        if (updateError) throw updateError;
        
        // 5. Success
        onUpdateSuccess();

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
        
        <form onSubmit={handleSubmit} className="space-y-4">
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

            {/* Gerenciamento de Imagens */}
            <div className="space-y-4 pt-4 border-t border-slate-200">
                <div>
                    <label className="block text-sm font-medium text-slate-600 mb-2">Imagens Atuais</label>
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
                        {product.image_urls.map((url) => {
                            const isMarkedForDeletion = imagesToDelete.has(url);
                            return (
                                <div key={url} className="relative group">
                                    <img src={url} alt="Imagem do produto" className={`w-full h-24 object-cover rounded-lg border-2 transition-opacity ${isMarkedForDeletion ? 'opacity-30 border-red-300' : 'opacity-100 border-slate-200'}`} />
                                    <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        {isMarkedForDeletion ? (
                                            <button type="button" onClick={() => handleUndoDeleteImage(url)} className="text-white hover:text-green-300" title="Desfazer exclusão">
                                                <UndoIcon />
                                            </button>
                                        ) : (
                                            <button type="button" onClick={() => handleDeleteImage(url)} className="text-white hover:text-red-400" title="Marcar para excluir">
                                                <TrashIcon />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
                 <div>
                  <label htmlFor="newImageFiles" className="block text-sm font-medium text-slate-600 mb-1">Adicionar Novas Imagens</label>
                  <input type="file" id="newImageFiles" onChange={e => setNewImageFiles(e.target.files)} multiple className="mt-1 block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-green-100 file:text-green-700 hover:file:bg-green-200 cursor-pointer" />
                </div>
                {imagePreviews.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-slate-600">Pré-visualização das novas imagens:</label>
                    <div className="mt-2 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
                      {imagePreviews.map((preview, index) => (
                        <img key={index} src={preview} alt={`Nova imagem ${index + 1}`} className="w-full h-24 object-cover rounded-lg border-2 border-green-300" />
                      ))}
                    </div>
                  </div>
                )}
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