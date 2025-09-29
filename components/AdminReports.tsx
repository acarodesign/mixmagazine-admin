import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase';
// FIX: Import Profile type to correctly type data from the 'profiles' table.
import type { SellerReportData, Profile } from '../types';
import RlsHelpAdmin from './RlsHelpAdmin';

interface AdminReportsProps {
  showToast: (message: string, type: 'success' | 'error') => void;
}

const AdminReports: React.FC<AdminReportsProps> = ({ showToast }) => {
  const [reportData, setReportData] = useState<SellerReportData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const generateReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
        const { data: orders, error: ordersError } = await supabase
            .from('pedidos')
            .select('total_price, created_at, user_id')
            .neq('status', 'Cancelado');
        
        if (ordersError) throw ordersError;
        
        if (!orders || orders.length === 0) {
            setReportData([]);
            return;
        }

        const { data: profiles, error: profilesError } = await supabase
            .from('profiles')
            .select('id, full_name, city')
            .eq('role', 'vendedor');

        if (profilesError) throw profilesError;
        
        if (!profiles || profiles.length === 0) {
             throw new Error("Não foi possível buscar os dados dos vendedores para o relatório. Verifique a política de segurança (RLS) da tabela 'profiles'.");
        }

        // FIX: Cast profiles to Profile[] to correctly type its items. This resolves issues with accessing p.id, seller.full_name, etc.
        const profilesMap = new Map((profiles as Profile[]).map(p => [p.id, p]));
        const aggregatedData: { [key: string]: SellerReportData } = {};

        for (const order of orders) {
            if (!order.user_id) continue;
            
            const seller = profilesMap.get(order.user_id);
            if (!seller) continue;
            
            const sellerId = seller.id;
            
            if (!aggregatedData[sellerId]) {
                aggregatedData[sellerId] = {
                    id: sellerId,
                    fullName: seller.full_name || 'Vendedor Anônimo',
                    city: seller.city || 'Cidade Desconhecida',
                    totalSales: 0,
                    monthlySales: {},
                };
            }
            
            aggregatedData[sellerId].totalSales += order.total_price;
            
            const orderDate = new Date(order.created_at);
            const monthKey = `${String(orderDate.getMonth() + 1).padStart(2, '0')}/${orderDate.getFullYear()}`;
            
            if (!aggregatedData[sellerId].monthlySales[monthKey]) {
                aggregatedData[sellerId].monthlySales[monthKey] = 0;
            }
            aggregatedData[sellerId].monthlySales[monthKey] += order.total_price;
        }

        const sortedData = Object.values(aggregatedData).sort((a, b) => b.totalSales - a.totalSales);
        
        setReportData(sortedData);

    } catch (err) {
        const message = err instanceof Error ? err.message : "Ocorreu um erro desconhecido";
        setError(message);
        setReportData([]);
    } finally {
        setLoading(false);
    }
  }, []);

  useEffect(() => {
    generateReport();
  }, [generateReport]);

  const renderContent = () => {
    if (loading) {
      return <div className="text-center p-8 text-slate-500">Gerando relatório de vendas...</div>;
    }
  
    if (error) {
       return <RlsHelpAdmin errorDetails={error} />;
    }

    if (reportData.length === 0) {
      return <div className="text-center p-8 text-slate-500">Nenhum dado de vendas para exibir.</div>;
    }

     return (
        <div className="space-y-6 animate-fade-in">
          {reportData.map((seller, index) => (
            <div key={seller.id} className="bg-white border border-slate-200 shadow-md p-5 rounded-2xl">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center">
                  <span className={`flex-shrink-0 w-10 h-10 rounded-full text-center leading-10 font-bold mr-4 text-slate-800 ${index === 0 ? 'bg-yellow-400' : index === 1 ? 'bg-gray-400' : index === 2 ? 'bg-yellow-600' : 'bg-gray-600'}`}>{index + 1}</span>
                  <div>
                    <h3 className="font-bold text-lg text-slate-800">{seller.fullName}</h3>
                    <p className="text-sm text-slate-500">{seller.city}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-slate-600">Total Vendido</p>
                  <p className="font-bold text-xl text-green-600">
                    {seller.totalSales.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </p>
                </div>
              </div>

              <div className="border-t border-slate-200 pt-4 mt-4">
                  <h4 className="font-semibold mb-2 text-slate-700 text-sm">Vendas por Mês:</h4>
                  <div className="space-y-2 text-sm">
                    {Object.entries(seller.monthlySales)
                      // FIX: The complex sort with `new Date()` can cause type inference issues downstream.
                      // Replaced with a simpler, more robust string comparison to ensure correct sorting and type safety.
                      .sort((a, b) => {
                        const monthA = a[0];
                        const monthB = b[0];
                        const dateStrA = `${monthA.split('/')[1]}-${monthA.split('/')[0]}`; // YYYY-MM
                        const dateStrB = `${monthB.split('/')[1]}-${monthB.split('/')[0]}`; // YYYY-MM
                        return dateStrB.localeCompare(dateStrA); // Sort descending
                      })
                      .map(([month, sales]) => (
                      <div key={month} className="flex justify-between p-2 bg-slate-100 rounded-lg">
                        <span className="text-slate-600">{month}:</span>
                        <span className="font-semibold text-slate-800">
                          {/* FIX: Cast sales to a number to resolve a TypeScript error where toLocaleString was expecting 0 arguments due to a type inference issue. */}
                          {(sales as number).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </span>
                      </div>
                    ))}
                  </div>
              </div>
            </div>
          ))}
        </div>
      )
  }

  return (
    <div className="bg-white border border-slate-200 shadow-md p-6 rounded-2xl">
      <h2 className="text-xl font-bold mb-6 text-slate-800">Relatório de Vendas por Vendedor</h2>
      {renderContent()}
    </div>
  );
};

export default AdminReports;