

export interface Product {
  id: string;
  codigo: string;
  name: string;
  description: string;
  price: number;
  quantity_per_box: number;
  colors: string[];
  image_urls: string[];
  stock: number;
  created_at: string;
}

export interface NewProduct {
  codigo: string;
  name: string;
  description: string;
  price: number;
  quantity_per_box: number;
  colors: string[];
  stock: number;
  image_urls: string[];
}

export interface ToastMessage {
  message: string;
  type: 'success' | 'error';
}

export interface Profile {
  id: string;
  full_name: string;
  role: 'admin' | 'vendedor';
  city?: string;
  telefone?: string;
  cpf?: string;
}

export interface CartItem extends Product {
  quantity: number;
}

// NOVO TIPO PARA OPÇÕES DE FRETE
export interface ShippingOption {
  name: string;
  cost: number;
  days: number;
}


// NOVOS TIPOS E ATUALIZAÇÕES PARA PEDIDOS
export type OrderStatus = 'Pendente' | 'Em Processamento' | 'Enviado' | 'Entregue' | 'Cancelado';

export interface ProductInOrder extends Product {
    // Adicione campos específicos se necessário no futuro
}

export interface OrderItem {
    id: number;
    pedido_id: string;
    produto_id: string;
    quantity: number;
    price_at_purchase: number;
    // O 'produtos' será preenchido pelo Supabase ao fazer a consulta com join
    produtos?: ProductInOrder; 
}

export interface Order {
    id: string;
    created_at: string;
    user_id: string;
    total_price: number;
    shipping_cost: number | null;
    status: OrderStatus; // Atualizado para usar o tipo
    // Campos de endereço
    cep: string | null;
    logradouro: string | null;
    numero: string | null;
    complemento: string | null;
    bairro: string | null;
    cidade: string | null;
    estado: string | null;
    // O 'pedido_items' será preenchido pelo Supabase ao fazer a consulta com join
    pedido_items: OrderItem[];
    // Adicionado para o join com profiles
    profiles?: { 
      full_name: string;
    };
}

// NOVO TIPO PARA RELATÓRIOS
export interface SellerReportData {
  id: string;
  fullName: string;
  city: string;
  totalSales: number;
  monthlySales: {
    [key: string]: number; // ex: { '07/2024': 1500.00 }
  };
}