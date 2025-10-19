
import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import type { NewProduct } from '../types';

interface ProductFormProps {
  showToast: (message: string, type: 'success' | 'error') => void;
  onProductAdded: () => void;
}

const ProductForm: React.FC<ProductFormProps> = ({ showToast, onProductAdded }) => {
  const [codigo, setCodigo] = useState('');
  const [name, setName] = useState('');
  const [subgroup, setSubgroup] = useState(''); // NOVO ESTADO
  const [description, setDescription] = useState('');
  const [priceVista, setPriceVista] = useState('');
  const [priceCartao, setPriceCartao] = useState('');
  const [quantityPerBox, setQuantityPerBox] = useState('');
  const [colors, setColors] = useState('');
  const [stock, setStock] = useState('');
  const [imageFiles, setImageFiles] = useState<FileList | null>(null);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!imageFiles || imageFiles.length === 0) {
      setImagePreviews([]);
      return;
    }

    // FIX: Cast file to Blob for URL.createObjectURL, as File is a subclass of Blob.
    const newImagePreviews = Array.from(imageFiles).map(file => URL.createObjectURL(file as Blob));
    setImagePreviews(newImagePreviews);

    return () => {
      newImagePreviews.forEach(url => URL.revokeObjectURL(url));
    };
  }, [imageFiles]);


  const resetForm = () => {
    setCodigo('');
    setName('');
    setSubgroup(''); // LIMPAR SUBGRUPO
    setDescription('');
    setPriceVista('');
    setPriceCartao('');
    setQuantityPerBox('');
    setColors('');
    setStock('');
    setImageFiles(null);
    const fileInput = document.getElementById('imageFiles') as HTMLInputElement;
    if(fileInput) fileInput.value = '';
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const { data: { user } } = await supabase.auth.getUser();
    if (user?.email !== 'admin@mixmagazine.com') {
      showToast('Acesso negado. Apenas o administrador pode criar produtos.', 'error');
      return;
    }

    if (!codigo.trim() || !name.trim() || !priceVista || !priceCartao || !stock || !imageFiles || imageFiles.length === 0) {
      showToast('Por favor, preencha todos os campos obrigatórios e selecione pelo menos uma imagem.', 'error');
      return;
    }

    setLoading(true);

    try {
      const uploadedImageUrls: string[] = [];
      // FIX: Cast Array.from(imageFiles) to File[] to correctly type `file` inside the loop.
      for (const file of Array.from(imageFiles) as File[]) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage.from('produtos').upload(filePath, file);

        if (uploadError) {
          throw new Error(`Falha no upload da imagem para o Storage: ${uploadError.message}`);
        }

        const { data: { publicUrl } } = supabase.storage.from('produtos').getPublicUrl(filePath);
        if (!publicUrl) {
            throw new Error('Não foi possível obter a URL pública da imagem enviada.');
        }
        uploadedImageUrls.push(publicUrl);
      }

      const newProduct: NewProduct = {
        codigo,
        name,
        subgroup: subgroup.trim() || undefined, // ADICIONAR SUBGRUPO
        description,
        price_vista: parseFloat(priceVista),
        price_cartao: parseFloat(priceCartao),
        quantity_per_box: parseInt(quantityPerBox) || 1,
        colors: colors.split(',').map(c => c.trim()).filter(Boolean),
        stock: parseInt(stock),
        image_urls: uploadedImageUrls,
      };

      const { error: insertError } = await supabase.from('produtos').insert([newProduct]);

      if (insertError) {
        for(const url of uploadedImageUrls) {
            const path = url.split('/').pop();
            if(path) await supabase.storage.from('produtos').remove([path]);
        }
        throw new Error(`Falha ao salvar produto no Banco de Dados: ${insertError.message}`);
      }

      showToast('Produto criado com sucesso!', 'success');
      resetForm();
      onProductAdded();

    } catch (error) {
      let message = 'Ocorreu um erro ao adicionar o produto.';
      if (error instanceof Error) {
        message = error.message;
      }
      showToast(message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-md border border-slate-200">
      <h2 className="text-2xl font-bold mb-6 text-slate-800">Adicionar Novo Produto</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="codigo" className="block text-sm font-medium text-slate-600 mb-1">Código do Produto *</label>
          <input type="text" id="codigo" value={codigo} onChange={e => setCodigo(e.target.value)} required className="appearance-none relative block w-full px-4 py-3 border border-slate-300 bg-slate-100 placeholder-slate-400 text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 focus:z-10 sm:text-sm transition-all duration-300" />
        </div>
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-slate-600 mb-1">Nome *</label>
          <input type="text" id="name" value={name} onChange={e => setName(e.target.value)} required className="appearance-none relative block w-full px-4 py-3 border border-slate-300 bg-slate-100 placeholder-slate-400 text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 focus:z-10 sm:text-sm transition-all duration-300" />
        </div>
        <div>
          <label htmlFor="subgroup" className="block text-sm font-medium text-slate-600 mb-1">Subgrupo (Opcional)</label>
          <input type="text" id="subgroup" value={subgroup} onChange={e => setSubgroup(e.target.value)} placeholder="Ex: Papai Noel Roupa Vermelha" className="appearance-none relative block w-full px-4 py-3 border border-slate-300 bg-slate-100 placeholder-slate-400 text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 focus:z-10 sm:text-sm transition-all duration-300" />
        </div>
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-slate-600 mb-1">Descrição</label>
          <textarea id="description" value={description} onChange={e => setDescription(e.target.value)} rows={3} className="appearance-none relative block w-full px-4 py-3 border border-slate-300 bg-slate-100 placeholder-slate-400 text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 focus:z-10 sm:text-sm transition-all duration-300" />
        </div>
        <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="priceVista" className="block text-sm font-medium text-slate-600 mb-1">Preço à Vista *</label>
              <input type="number" id="priceVista" value={priceVista} onChange={e => setPriceVista(e.target.value)} required min="0" step="0.01" className="appearance-none relative block w-full px-4 py-3 border border-slate-300 bg-slate-100 placeholder-slate-400 text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 focus:z-10 sm:text-sm transition-all duration-300" />
            </div>
            <div>
              <label htmlFor="priceCartao" className="block text-sm font-medium text-slate-600 mb-1">Preço Cartão *</label>
              <input type="number" id="priceCartao" value={priceCartao} onChange={e => setPriceCartao(e.target.value)} required min="0" step="0.01" className="appearance-none relative block w-full px-4 py-3 border border-slate-300 bg-slate-100 placeholder-slate-400 text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 focus:z-10 sm:text-sm transition-all duration-300" />
            </div>
        </div>
        <div>
          <label htmlFor="stock" className="block text-sm font-medium text-slate-600 mb-1">Estoque (caixas) *</label>
          <input type="number" id="stock" value={stock} onChange={e => setStock(e.target.value)} required min="0" step="1" className="appearance-none relative block w-full px-4 py-3 border border-slate-300 bg-slate-100 placeholder-slate-400 text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 focus:z-10 sm:text-sm transition-all duration-300" />
        </div>
        <div>
            <label htmlFor="quantityPerBox" className="block text-sm font-medium text-slate-600 mb-1">Quantidade por Caixa</label>
            <input type="number" id="quantityPerBox" value={quantityPerBox} onChange={e => setQuantityPerBox(e.target.value)} min="1" step="1" className="appearance-none relative block w-full px-4 py-3 border border-slate-300 bg-slate-100 placeholder-slate-400 text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 focus:z-10 sm:text-sm transition-all duration-300" />
            <p className="mt-1 text-xs text-slate-500">Padrão: 1 (se vendido individualmente).</p>
        </div>
        <div>
          <label htmlFor="colors" className="block text-sm font-medium text-slate-600 mb-1">Cores (separadas por vírgula)</label>
          <input type="text" id="colors" value={colors} onChange={e => setColors(e.target.value)} className="appearance-none relative block w-full px-4 py-3 border border-slate-300 bg-slate-100 placeholder-slate-400 text-slate-900 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 focus:z-10 sm:text-sm transition-all duration-300" />
        </div>
        <div>
          <label htmlFor="imageFiles" className="block text-sm font-medium text-slate-600 mb-1">Fotos do Produto (2 a 3 recomendadas) *</label>
          <input type="file" id="imageFiles" onChange={e => setImageFiles(e.target.files)} multiple required className="mt-1 block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-green-100 file:text-green-700 hover:file:bg-green-200 cursor-pointer" />
          <p className="mt-1 text-xs text-slate-500">Você pode selecionar múltiplas imagens de uma vez (segure Ctrl/Cmd para selecionar várias).</p>
        </div>
         {imagePreviews.length > 0 && (
          <div className="mt-4">
            <label className="block text-sm font-medium text-slate-600">Pré-visualização:</label>
            <div className="mt-2 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-3 gap-4">
              {imagePreviews.map((preview, index) => (
                <img
                  key={index}
                  src={preview}
                  alt={`Pré-visualização ${index + 1}`}
                  className="w-full h-24 object-cover rounded-lg border-2 border-slate-200"
                />
              ))}
            </div>
          </div>
        )}
        <div className="pt-4">
            <button type="submit" disabled={loading} className="w-full flex justify-center py-3 px-4 border border-transparent text-sm font-bold rounded-lg text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white focus:ring-green-500 disabled:bg-green-600/50 disabled:cursor-not-allowed transition-all duration-300 shadow-lg shadow-green-600/20 transform hover:scale-105">
              {loading ? 'Adicionando...' : 'Adicionar Produto'}
            </button>
        </div>
      </form>
    </div>
  );
};

export default ProductForm;
