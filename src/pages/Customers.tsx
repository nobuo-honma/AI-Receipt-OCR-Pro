// src/pages/Customers.tsx
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

// 顧客データの型定義
type Customer = {
    id: number;
    name: string;
    phone: string;
    email: string;
    points: number;
    total_spent: number;
    visit_count: number;
    last_visit: string;
};

export default function Customers() {
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchWord, setSearchWord] = useState('');

    // 画面を開いたときにSupabaseから顧客データを取得
    useEffect(() => {
        const fetchCustomers = async () => {
            const { data, error } = await supabase
                .from('customers')
                .select('*')
                .order('last_visit', { ascending: false });

            if (!error && data) {
                setCustomers(data);
            }
            setLoading(false);
        };

        fetchCustomers();
    }, []);

    // 検索フィルターのロジック
    const filteredCustomers = customers.filter(c =>
        c.name.includes(searchWord) ||
        (c.phone && c.phone.includes(searchWord)) ||
        (c.email && c.email.includes(searchWord))
    );

    return (
        <div className="p-8 max-w-6xl mx-auto">
            <div className="flex justify-between items-center mb-8 border-b-2 border-bakery-border pb-4">
                <h1 className="text-3xl font-bold text-bakery-textMain">👥 顧客管理</h1>
                <button className="bg-bakery-primary hover:bg-[#8B5E3C] text-white px-6 py-2 rounded-md font-bold transition-colors shadow-sm">
                    ➕ 新規登録
                </button>
            </div>

            {/* 検索バー */}
            <div className="mb-8">
                <input
                    type="text"
                    placeholder="🔍 検索（名前・電話番号・メール）"
                    className="w-full md:w-1/2 p-3 border border-bakery-border rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-bakery-gold"
                    value={searchWord}
                    onChange={(e) => setSearchWord(e.target.value)}
                />
            </div>

            {loading ? (
                <p className="text-bakery-textMain animate-pulse">データを取得中...</p>
            ) : customers.length === 0 ? (
                <div className="border-2 border-dashed border-bakery-border p-16 text-center rounded-lg text-[#8B6340] bg-bakery-surface">
                    <p className="text-4xl mb-4">👥</p>
                    <p>顧客が登録されていません。</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredCustomers.map(customer => {
                        // 累計購入額に応じてランクのアイコンを変える
                        let rank = "";
                        if (customer.total_spent >= 50000) rank = "🥇";
                        else if (customer.total_spent >= 20000) rank = "🥈";
                        else if (customer.total_spent >= 5000) rank = "🥉";

                        return (
                            <div key={customer.id} className="bg-white p-6 rounded-xl border border-bakery-border shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
                                {/* 装飾の上の線 */}
                                <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-bakery-gold to-bakery-primary"></div>

                                <h2 className="text-xl font-bold text-bakery-textMain mb-2 flex items-center gap-2">
                                    <span>{rank}</span> {customer.name}
                                </h2>

                                <div className="text-xs text-[#8B6340] mb-4 space-y-1">
                                    <p>📞 {customer.phone || '未登録'}</p>
                                    <p>✉️ {customer.email || '未登録'}</p>
                                </div>

                                <div className="bg-bakery-surface p-3 rounded-md mb-4 border border-[#E0C898]/50">
                                    <p className="text-sm font-bold text-bakery-primary">
                                        ⭐ 現在のポイント: <span className="text-lg">{customer.points.toLocaleString()} pt</span>
                                    </p>
                                </div>

                                <div className="flex justify-between text-xs text-[#6B4226] border-t border-bakery-border pt-3">
                                    <span>来店 {customer.visit_count}回</span>
                                    <span>累計 ￥{customer.total_spent.toLocaleString()}</span>
                                    <span>{customer.last_visit ? `最終: ${customer.last_visit}` : '未来店'}</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}