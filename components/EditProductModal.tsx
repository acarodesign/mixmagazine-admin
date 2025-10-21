
import React, { useState, useEffect, useRef } from 'react';
import type { Product } from '../types';
import { supabase } from '../services/supabase';

const TrashIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

const UndoIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3" />
    </svg>
  );

interface EditProductModalProps {
  product: Product;
  onClose: () => void;
  onUpdate: (product: Product) => Promise<void>;
  showToast: (message: string, type: 'success' | 'error') => void;
}

const EditProductModal: React.FC<EditProductModalProps> = ({ product, onClose, onUpdate, showToast }) => {
  const [formData, setFormData] = useState({ ...product, colors: product.colors.join(', '), subgroup: product.subgroup || '' });
  const [loading, setLoading] = useState(false);
  
  // States for image management
  const [orderedImages, setOrderedImages] = useState<string[]>([]);
  const [imagesToDelete, setImagesToDelete] = useState<string[]>([]);
  const [newImageFiles, setNewImageFiles] = useState<FileList | null>(null);
  const [newImagePreviews, setNewImagePreviews] = useState<string[]>([]);

  // Refs for drag and drop
  const draggedItemIndex = useRef<number | null>(null);

  useEffect(() => {
    // Reset state when a new product is passed
    setFormData({ ...product, colors: product.colors.join(', '), subgroup: product.subgroup || '' });
    setOrderedImages(product.image_urls || []);
    setImagesToDelete([]);
    setNewImageFiles(null);
    setNewImagePreviews([]);
  }, [product]);

  useEffect(() => {
    // Create preview URLs for new images
    if (!newImageFiles || newImageFiles.length === 0) {
      setNewImagePreviews([]);
      return;
    }
    const objectUrls = Array.from(newImageFiles).map(file => URL.createObjectURL(file as Blob));
    setNewImagePreviews(objectUrls);
    return () => {
      objectUrls.forEach(url => URL.revokeObjectURL(url));
    };
  }, [newImageFiles]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleToggleDeleteImage = (url: string) => {
    setImagesToDelete(prev =>
      prev.includes(url) ? prev.filter(u => u !== url) : [...prev, url]
    );
  };

  // Drag and Drop Handlers
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    draggedItemIndex.current = index;
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault(); // Necessary to allow dropping
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    e.preventDefault();
    if (draggedItemIndex.current === null || draggedItemIndex.current === index) return;

    const newOrderedImages = [...orderedImages];
    const [reorderedItem] = newOrderedImages.splice(draggedItemIndex.current, 1);
    newOrderedImages.splice(index, 0, reorderedItem);

    setOrderedImages(newOrderedImages);
    draggedItemIndex.current = null;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    if (!formData.name.trim() || !formData.price_vista || !formData.price_cartao || !formData.stock) {
        showToast('Nome, Preços e Estoque são campos obrigatórios.', 'error');
        setLoading(false);
        return;
    }

    try {
        if (imagesToDelete.length > 0) {
            const filePaths = imagesToDelete.map(url => url.split('/').pop()).filter(Boolean) as string[];
            if (filePaths.length > 0) {
                const { error: removeError } = await supabase.storage.from('produtos').remove(filePaths);
                if (removeError) {
                    throw new Error(`Falha ao remover imagens antigas: ${removeError.message}`);
                }
            }
        }

        const uploadedImageUrls: string[] = [];
        if (newImageFiles && newImageFiles.length > 0) {
            for (const file of Array.from(newImageFiles) as File[]) {
                const fileExt = file.name.split('.').pop();
                const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;
                const filePath = `${fileName}`;
                const { error: uploadError } = await supabase.storage.from('produtos').upload(filePath, file);
                if (uploadError) {
                    throw new Error(`Falha no upload da nova imagem: ${uploadError.message}`);
                }
                const { data: { publicUrl } } = supabase.storage.from('produtos').getPublicUrl(filePath);
                if (!publicUrl) {
                    throw new Error('Não foi possível obter a URL pública da nova imagem.');
                }
                uploadedImageUrls.push(publicUrl);
            }
        }

        const finalImageUrls = [
            ...orderedImages.filter(url => !imagesToDelete.includes(url)),
            ...uploadedImageUrls,
        ];

        const dataToUpdate: Product = {
            ...formData,
            subgroup: formData.subgroup.trim() || undefined,
            price_vista: parseFloat(String(formData.price_vista)),
            price_cartao: parseFloat(String(formData.price_cartao)),
            stock: parseInt(String(formData.stock), 10),
            quantity_per_box: parseInt(String(formData.quantity_per_box), 10) || 1,
            colors: formData.colors.split(',').map(c => c.trim()).filter(Boolean),
            image_urls: finalImageUrls,
        };

        await onUpdate(dataToUpdate);

    } catch (error) {
        const message = error instanceof Error ? error.message : 'Ocorreu um erro desconhecido ao atualizar o produto.';
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
              <label htmlFor="edit-subgroup" className="block text-sm font-medium text-slate-600 mb-1">Subgrupo (Opcional)</label>
              <input type="text" id="edit-subgroup" name="subgroup" value={formData.subgroup} onChange={handleChange} className="appearance-none relative block w-full px-4 py-3 border border-slate-300 bg-slate-100 placeholder-slate-400 text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 focus:z-10 sm:text-sm transition-all duration-300" />
            </div>
            <div>
              <label htmlFor="edit-description" className="block text-sm font-medium text-slate-600 mb-1">Descrição</label>
              <textarea id="edit-description" name="description" value={formData.description} onChange={handleChange} rows={3} className="appearance-none relative block w-full px-4 py-3 border border-slate-300 bg-slate-100 placeholder-slate-400 text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 focus:z-10 sm:text-sm transition-all duration-300" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="edit-price-vista" className="block text-sm font-medium text-slate-600 mb-1">Preço à Vista</label>
                <input type="number" id="edit-price-vista" name="price_vista" value={formData.price_vista} onChange={handleChange} required min="0" step="0.01" className="appearance-none relative block w-full px-4 py-3 border border-slate-300 bg-slate-100 placeholder-slate-400 text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 focus:z-10 sm:text-sm transition-all duration-300" />
              </div>
               <div>
                <label htmlFor="edit-price-cartao" className="block text-sm font-medium text-slate-600 mb-1">Preço Cartão</label>
                <input type="number" id="edit-price-cartao" name="price_cartao" value={formData.price_cartao} onChange={handleChange} required min="0" step="0.01" className="appearance-none relative block w-full px-4 py-3 border border-slate-300 bg-slate-100 placeholder-slate-400 text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 focus:z-10 sm:text-sm transition-all duration-300" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="edit-stock" className="block text-sm font-medium text-slate-600 mb-1">Estoque (caixas)</label>
                <input type="number" id="edit-stock" name="stock" value={formData.stock} onChange={handleChange} required min="0" step="1" className="appearance-none relative block w-full px-4 py-3 border border-slate-300 bg-slate-100 placeholder-slate-400 text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 focus:z-10 sm:text-sm transition-all duration-300" />
              </div>
               <div>
                <label htmlFor="edit-quantityPerBox" className="block text-sm font-medium text-slate-600 mb-1">Quantidade por Caixa</label>
                <input type="number" id="edit-quantityPerBox" name="quantity_per_box" value={formData.quantity_per_box} onChange={handleChange} min="1" step="1" className="appearance-none relative block w-full px-4 py-3 border border-slate-300 bg-slate-100 placeholder-slate-400 text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 focus:z-10 sm:text-sm transition-all duration-300" />
              </div>
            </div>
            <div>
              <label htmlFor="edit-colors" className="block text-sm font-medium text-slate-600 mb-1">Cores (separadas por vírgula)</label>
              <input type="text" id="edit-colors" name="colors" value={formData.colors} onChange={handleChange} className="appearance-none relative block w-full px-4 py-3 border border-slate-300 bg-slate-100 placeholder-slate-400 text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 focus:z-10 sm:text-sm transition-all duration-300" />
            </div>
            
            <div className="border-t border-slate-200 pt-4 space-y-4">
                <div>
                    <label className="block text-sm font-medium text-slate-600">Gerenciar Imagens</label>
                    <p className="text-xs text-slate-500 mt-1">Arraste para reordenar. A primeira imagem será a principal.</p>
                </div>
                {orderedImages.length > 0 && (
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4" onDragOver={handleDragOver}>
                        {orderedImages.map((url, index) => {
                            const isMarkedForDeletion = imagesToDelete.includes(url);
                            return (
                                <div 
                                    key={url} 
                                    className={`relative group transition-opacity ${draggedItemIndex.current === index ? 'opacity-50' : ''}`}
                                    draggable
                                    onDragStart={(e) => handleDragStart(e, index)}
                                    onDrop={(e) => handleDrop(e, index)}
                                >
                                    <div className="cursor-grab">
                                        <img src={url} alt="Imagem do produto" className={`w-full h-24 object-cover rounded-lg border-2 border-slate-200 transition-opacity ${isMarkedForDeletion ? 'opacity-40' : ''}`} />
                                    </div>
                                    {index === 0 && !isMarkedForDeletion && (
                                        <span className="absolute top-1 left-1 bg-green-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full z-10 select-none">
                                            Principal
                                        </span>
                                    )}
                                    <button type="button" onClick={() => handleToggleDeleteImage(url)} className={`absolute top-1 right-1 w-7 h-7 rounded-full flex items-center justify-center text-white transition-all duration-200 ${isMarkedForDeletion ? 'bg-blue-500 hover:bg-blue-600' : 'bg-red-500 hover:bg-red-600 opacity-0 group-hover:opacity-100'}`} aria-label={isMarkedForDeletion ? 'Cancelar exclusão' : 'Marcar para excluir'}>
                                      {isMarkedForDeletion ? <UndoIcon className="h-4 w-4" /> : <TrashIcon className="h-4 w-4" />}
                                    </button>
                                    {isMarkedForDeletion && <div className="absolute inset-0 bg-black/30 rounded-lg pointer-events-none"></div>}
                                </div>
                            );
                        })}
                    </div>
                )}
                 <div>
                    <label htmlFor="newImageFiles" className="block text-sm font-medium text-slate-600 mb-1">Adicionar Novas Fotos</label>
                    <input type="file" id="newImageFiles" onChange={e => setNewImageFiles(e.target.files)} multiple className="mt-1 block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-green-100 file:text-green-700 hover:file:bg-green-200 cursor-pointer" />
                </div>
                 {newImagePreviews.length > 0 && (
                  <div className="mt-2">
                    <label className="block text-sm font-medium text-slate-600">Pré-visualização das novas imagens:</label>
                    <div className="mt-2 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
                      {newImagePreviews.map((preview, index) => (
                        <img key={index} src={preview} alt={`Nova pré-visualização ${index + 1}`} className="w-full h-24 object-cover rounded-lg border-2 border-green-300" />
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
