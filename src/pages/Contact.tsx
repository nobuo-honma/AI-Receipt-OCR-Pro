// src/pages/Contact.tsx
import { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';

type Product = { id: number; name: string; target_qty: number; sort_order: number; };

export default function Contact() {
    const [messages, setMessages] = useState<any[]>([]);
    const [newMessage, setNewMessage] = useState("");
    const [myRole, setMyRole] = useState<'販売' | '製造'>('製造');
    const endRef = useRef<HTMLDivElement>(null);

    const [products, setProducts] = useState<Product[]>([]);
    const [productionDate, setProductionDate] = useState(() => new Date().toISOString().split('T')[0]);
    const [productionQuantities, setProductionQuantities] = useState<Record<number, number>>({});
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        supabase.from('messages').select('*').order('created_at', { ascending: false }).limit(50)
            .then(({ data }) => { setMessages((data || []).reverse()); setTimeout(() => endRef.current?.scrollIntoView(), 100); });

        const sub = supabase.channel('msgs').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, p => {
            setMessages(prev => [...prev, p.new]); setTimeout(() => endRef.current?.scrollIntoView(), 100);
        }).subscribe();

        supabase.from('products').select('*').order('sort_order', { ascending: true })
            .then(({ data }) => { if (data) setProducts(data); });

        return () => { supabase.removeChannel(sub); };
    }, []);

    useEffect(() => {
        const fetchTodayProduction = async () => {
            const { data } = await supabase.from('production_records').select('*').eq('production_date', productionDate);
            const qtys: Record<number, number> = {};
            if (data) {
                data.forEach(record => { qtys[record.product_id] = record.quantity; });
            }
            setProductionQuantities(qtys);
        };
        fetchTodayProduction();
    }, [productionDate]);

    const send = async (e: any) => { e.preventDefault(); if (newMessage) { await supabase.from('messages').insert({ sender: myRole, content: newMessage }); setNewMessage(""); } };

    const handleQtyChange = (productId: number, qty: number) => {
        setProductionQuantities(prev => ({ ...prev, [productId]: Math.max(0, qty) }));
    };

    const saveProduction = async () => {
        setIsSaving(true);
        const upsertData = Object.entries(productionQuantities).map(([productId, qty]) => ({
            product_id: parseInt(productId),
            production_date: productionDate,
            quantity: qty
        }));

        if (upsertData.length > 0) {
            const { error } = await supabase.from('production_records').upsert(upsertData, { onConflict: 'product_id, production_date' });
            if (error) alert("保存に失敗しました。\n" + error.message);
            else alert(`${productionDate} の製造実績を保存しました！`);
        } else {
            alert("入力されたデータがありません。");
        }
        setIsSaving(false);
    };

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto h-[calc(100vh-80px)] flex flex-col md:flex-row gap-8">

            <div className="w-full md:w-1/2 flex flex-col bg-white rounded-xl shadow-sm border border-bakery-border overflow-hidden">
                <div className="bg-bakery-bg p-4 border-b border-bakery-border flex justify-between items-center">
                    <h2 className="text-xl font-bold text-bakery-primary flex items-center gap-2">👨‍🍳 本日の製造入力</h2>
                    <input type="date" value={productionDate} onChange={e => setProductionDate(e.target.value)} className="p-2 border rounded font-bold outline-none focus:ring-2 focus:ring-bakery-gold" />
                </div>

                <div className="flex-1 overflow-y-auto p-2">
                    <table className="w-full text-sm">
                        <thead className="sticky top-0 bg-white shadow-sm"><tr className="text-[#8B6340]"><th className="p-2 text-left">商品名</th><th className="p-2 text-center w-20">予定数</th><th className="p-2 text-center w-32">製造数 (実績)</th></tr></thead>
                        <tbody>
                            {products.map(p => {
                                const currentQty = productionQuantities[p.id] || 0;
                                const diffColor = currentQty < p.target_qty ? 'text-red-500' : currentQty > p.target_qty ? 'text-blue-500' : 'text-green-600';
                                return (
                                    <tr key={p.id} className="border-b hover:bg-[#FAFAFA]">
                                        <td className="p-2 font-bold text-bakery-textMain">{p.name}</td>
                                        <td className="p-2 text-center text-gray-500">{p.target_qty > 0 ? p.target_qty : '-'}</td>
                                        <td className="p-2 flex items-center justify-center gap-1">
                                            <button onClick={() => handleQtyChange(p.id, currentQty - 1)} className="w-7 h-7 bg-gray-200 rounded-full font-bold text-gray-600 hover:bg-gray-300">-</button>
                                            <input type="number" value={currentQty || ''} onChange={e => handleQtyChange(p.id, parseInt(e.target.value) || 0)} className={`w-12 text-center font-bold border-b-2 outline-none bg-transparent ${diffColor}`} placeholder="0" />
                                            <button onClick={() => handleQtyChange(p.id, currentQty + 1)} className="w-7 h-7 bg-bakery-primary rounded-full font-bold text-white hover:bg-[#8B5E3C]">+</button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                <div className="p-4 border-t border-bakery-border bg-gray-50">
                    <button onClick={saveProduction} disabled={isSaving} className="w-full py-3 bg-[#10B981] text-white rounded-lg font-bold shadow-md hover:bg-green-600 disabled:bg-gray-400">
                        {isSaving ? '保存中...' : '💾 製造実績を確定して保存'}
                    </button>
                </div>
            </div>

            <div className="w-full md:w-1/2 flex flex-col h-full">
                <div className="flex justify-between mb-2">
                    <h1 className="text-2xl font-bold">📞 業務連絡チャット</h1>
                    <div>
                        <button onClick={() => setMyRole('販売')} className={`px-4 py-1 rounded-l-md font-bold text-sm border border-r-0 border-bakery-border ${myRole === '販売' ? 'bg-bakery-gold text-white' : 'bg-white text-gray-500'}`}>🛒 販売</button>
                        <button onClick={() => setMyRole('製造')} className={`px-4 py-1 rounded-r-md font-bold text-sm border border-l-0 border-bakery-border ${myRole === '製造' ? 'bg-[#8B5E3C] text-white' : 'bg-white text-gray-500'}`}>🥖 製造</button>
                    </div>
                </div>
                <div className="flex-1 bg-white p-4 overflow-y-auto rounded-t-xl border border-bakery-border shadow-inner">
                    {messages.map(m => (
                        <div key={m.id} className={`flex flex-col ${m.sender === myRole ? 'items-end' : 'items-start'} mb-4`}>
                            <div className={`px-4 py-3 rounded-2xl max-w-[80%] whitespace-pre-wrap shadow-sm ${m.sender === myRole ? 'bg-bakery-gold text-white rounded-br-none' : 'bg-gray-100 rounded-bl-none text-bakery-textMain'}`}>
                                {m.content}
                            </div>
                        </div>
                    ))}
                    <div ref={endRef} />
                </div>
                <form onSubmit={send} className="flex gap-2 bg-bakery-surface p-3 border border-t-0 border-bakery-border rounded-b-xl">
                    <input value={newMessage} onChange={e => setNewMessage(e.target.value)} className="flex-1 p-3 border border-bakery-border rounded focus:ring-2 focus:ring-bakery-gold outline-none" placeholder={`${myRole}として送信...`} />
                    <button className="bg-bakery-primary text-white px-6 rounded font-bold shadow-md hover:bg-[#8B5E3C]">送信</button>
                </form>
            </div>

        </div>
    );
}