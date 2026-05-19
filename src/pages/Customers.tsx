import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

type Customer = { id: number; name: string; phone: string; address: string; points: number; total_spent: number; visit_count: number; last_visit: string; };
type Reservation = { id: number; customer_id: number | null; guest_name: string; guest_phone: string; reservation_date: string; reservation_time: string; order_details: string; status: string; memo: string; customers: { name: string; phone: string } };
type Product = { id: number; name: string; price: number; };

export default function Customers() {
    const [activeTab, setActiveTab] = useState<'list' | 'reservation'>('list');
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [reservations, setReservations] = useState<Reservation[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [searchWord, setSearchWord] = useState('');

    const [showModal, setShowModal] = useState(false);
    const [newName, setNewName] = useState('');
    const [newPhone, setNewPhone] = useState('');
    const [newAddress, setNewAddress] = useState('');

    const [showResModal, setShowResModal] = useState(false);
    const [resCustomerId, setResCustomerId] = useState('');
    const [resGuestName, setResGuestName] = useState('');
    const [resGuestPhone, setResGuestPhone] = useState('');
    const [resDate, setResDate] = useState('');
    const [resTime, setResTime] = useState('');
    const [resMemo, setResMemo] = useState('');
    const [orderItems, setOrderItems] = useState<{ productId: number, qty: number }[]>([]);

    const [isSaving, setIsSaving] = useState(false);

    const fetchData = async () => {
        const { data: cData } = await supabase.from('customers').select('*').order('last_visit', { ascending: false });
        if (cData) setCustomers(cData);
        const { data: rData } = await supabase.from('reservations').select('*, customers(name, phone)').order('reservation_date', { ascending: true }).order('reservation_time', { ascending: true });
        if (rData) setReservations(rData as any);
        const { data: pData } = await supabase.from('products').select('*').order('id', { ascending: true });
        if (pData) setProducts(pData);
    };
    useEffect(() => { fetchData(); }, []);

    const handleAddCustomer = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (!newName.trim()) { alert("氏名は必須です！"); return; }
            setIsSaving(true);
            const normalizedName = newName.trim().normalize("NFKC");
            const normalizedAddress = newAddress ? newAddress.trim().normalize("NFKC") : '';
            const { error } = await supabase.from('customers').insert({ name: normalizedName, phone: newPhone, address: normalizedAddress, created_at: new Date().toISOString() });
            if (error) { alert("【データベースエラー】\n" + error.message); }
            else { alert("登録しました！"); setShowModal(false); setNewName(''); setNewPhone(''); setNewAddress(''); fetchData(); }
        } catch (err: any) { alert("【予期せぬエラー】\n" + err.message); }
        finally { setIsSaving(false); }
    };

    const handleDeleteCustomer = async (id: number, name: string) => {
        if (window.confirm(`本当に「${name}」さんを削除しますか？`)) {
            await supabase.from('customer_purchases').delete().eq('customer_id', id);
            await supabase.from('customers').delete().eq('id', id);
            fetchData();
        }
    };

    const handleOrderChange = (productId: number, qty: number) => {
        setOrderItems(prev => {
            if (qty <= 0) return prev.filter(item => item.productId !== productId);
            const existing = prev.find(item => item.productId === productId);
            if (existing) return prev.map(item => item.productId === productId ? { ...item, qty } : item);
            return [...prev, { productId, qty }];
        });
    };

    const handleAddReservation = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!resCustomerId && !resGuestName.trim()) return alert("お客様を選択するか、お名前を入力してください");
        if (!resDate || !resTime) return alert("受渡日時を入力してください");
        if (orderItems.length === 0) return alert("注文商品を選択してください");

        setIsSaving(true);
        const orderDetailsText = orderItems.map(item => { const p = products.find(prod => prod.id === item.productId); return p ? `${p.name} x ${item.qty}` : ""; }).filter(Boolean).join("\n");

        await supabase.from('reservations').insert({
            customer_id: resCustomerId ? Number(resCustomerId) : null,
            guest_name: resCustomerId ? '' : resGuestName.normalize("NFKC"),
            guest_phone: resCustomerId ? '' : resGuestPhone,
            reservation_date: resDate, reservation_time: resTime, order_details: orderDetailsText, memo: resMemo, status: '未受渡'
        });

        setIsSaving(false);
        setShowResModal(false); setResCustomerId(''); setResGuestName(''); setResGuestPhone(''); setResDate(''); setResTime(''); setResMemo(''); setOrderItems([]); fetchData();
        alert("予約注文を登録しました！");
    };

    const updateReservationStatus = async (id: number, newStatus: string) => {
        if (window.confirm(`ステータスを「${newStatus}」に変更しますか？`)) { await supabase.from('reservations').update({ status: newStatus }).eq('id', id); fetchData(); }
    };

    const filteredCustomers = customers.filter(c => c.name.includes(searchWord) || (c.phone && c.phone.includes(searchWord)) || (c.address && c.address.includes(searchWord)));

    return (
        <>
            <div className="print-only">
                <div className="label-container">
                    {filteredCustomers.map(c => (
                        <div key={c.id} className="label-card">
                            <div style={{ marginBottom: '10px' }}>〒________ - ________<br />{c.address || '（住所未登録）'}</div>
                            <div style={{ fontSize: '18pt', fontWeight: 'bold', marginTop: '15px' }}>{c.name} 様</div>
                            <div style={{ fontSize: '10pt', color: '#666', marginTop: '10px' }}>TEL: {c.phone || '未登録'}</div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="p-8 max-w-6xl mx-auto relative no-print">
                <div className="flex flex-col md:flex-row justify-between items-end md:items-center mb-4 border-b-2 border-bakery-border pb-4 gap-4">
                    <div className="flex items-center gap-6">
                        <h1 className="text-3xl font-bold text-bakery-textMain">👥 顧客と予約</h1>
                        <div className="flex bg-bakery-bg rounded-lg p-1 border border-bakery-border">
                            <button onClick={() => setActiveTab('list')} className={`px-4 py-2 rounded-md font-bold text-sm ${activeTab === 'list' ? 'bg-white text-bakery-primary shadow' : 'text-[#8B6340]'}`}>📋 顧客一覧</button>
                            <button onClick={() => setActiveTab('reservation')} className={`px-4 py-2 rounded-md font-bold text-sm ${activeTab === 'reservation' ? 'bg-white text-bakery-primary shadow' : 'text-[#8B6340]'}`}>🥐 予約注文</button>
                        </div>
                    </div>
                    {activeTab === 'list' ? (
                        <div className="flex gap-2">
                            <button onClick={() => window.print()} disabled={filteredCustomers.length === 0} className="bg-white border-2 border-[#8B6340] text-[#8B6340] hover:bg-bakery-surface px-6 py-2 rounded-md font-bold">🖨️ ラベル印刷</button>
                            <button onClick={() => setShowModal(true)} className="bg-bakery-primary hover:bg-[#8B5E3C] text-white px-6 py-2 rounded-md font-bold">➕ 新規顧客</button>
                        </div>
                    ) : (
                        <button onClick={() => setShowResModal(true)} className="bg-bakery-gold hover:bg-[#C4A882] text-white px-6 py-2 rounded-md font-bold">🥐 予約注文を入れる</button>
                    )}
                </div>

                <div className="flex items-start gap-2 bg-[#FFF8E7] border border-bakery-border/50 text-[#8B6340] text-sm p-3 rounded-lg mb-6 animate-fade-in-up">
                    <span className="text-bakery-gold text-lg leading-none mt-0.5">💡</span>
                    <p className="leading-relaxed">{activeTab === 'list' ? "常連のお客様を登録しておくと、レシート読込時にポイントを付与できます。また「宛名ラベル」の印刷も可能です。" : "電話や店頭で受けた予約を登録します。まだ会員登録していないお客様でも、直接お名前を入力するだけで注文を受け付けられます。"}</p>
                </div>

                {activeTab === 'list' && (
                    <div className="animate-fade-in-up">
                        <input type="text" placeholder="🔍 検索（名前・電話・住所）" value={searchWord} onChange={e => setSearchWord(e.target.value)} className="w-full md:w-1/2 p-3 mb-6 border rounded-md" />
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {filteredCustomers.map(c => (
                                <div key={c.id} className="bg-white p-6 rounded-xl border shadow-sm relative group hover:shadow-md">
                                    <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-bakery-gold to-bakery-primary"></div>
                                    <button onClick={() => handleDeleteCustomer(c.id, c.name)} className="absolute top-3 right-3 text-red-300 hover:text-red-500 opacity-0 group-hover:opacity-100">🗑️</button>
                                    <h2 className="text-xl font-bold mb-2">{c.name}</h2>
                                    <div className="text-xs text-[#8B6340] mb-4 space-y-1"><p>📞 {c.phone}</p><p>🏠 {c.address}</p></div>
                                    <div className="bg-bakery-surface p-3 rounded-md mb-4 text-sm font-bold text-bakery-primary">⭐ ポイント: {c.points} pt</div>
                                    <div className="flex justify-between text-xs text-bakery-primary border-t pt-3"><span>来店 {c.visit_count}回</span><span>累計 ￥{c.total_spent.toLocaleString()}</span></div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'reservation' && (
                    <div className="bg-white rounded-xl shadow-sm border border-bakery-border overflow-hidden">
                        <table className="w-full text-left border-collapse">
                            <thead><tr className="bg-bakery-bg"><th className="p-4">日時</th><th className="p-4">お客様名</th><th className="p-4">注文内容</th><th className="p-4 text-center">状態</th></tr></thead>
                            <tbody>
                                {reservations.map(res => (
                                    <tr key={res.id} className={`border-b ${res.status === 'キャンセル' ? 'bg-gray-50 opacity-60' : ''}`}>
                                        <td className="p-4 font-bold text-bakery-primary">{res.reservation_date}<br /><span className="text-sm text-gray-500">{res.reservation_time}</span></td>
                                        <td className="p-4 font-bold text-bakery-textMain">
                                            {res.customer_id ? res.customers?.name : res.guest_name}
                                            {!res.customer_id && <span className="text-[10px] text-bakery-primary ml-2 bg-bakery-surface px-1.5 py-0.5 rounded border">非会員</span>}<br />
                                            <span className="text-xs text-gray-500 font-normal">📞 {res.customer_id ? res.customers?.phone : res.guest_phone}</span>
                                        </td>
                                        <td className="p-4">
                                            <div className="text-sm font-bold whitespace-pre-wrap">{res.order_details}</div>
                                            {res.memo && <p className="text-xs text-gray-500 mt-2 bg-gray-50 p-2 rounded">💡 備考: {res.memo}</p>}
                                        </td>
                                        <td className="p-4 text-center">
                                            {res.status === '受渡済み' ? <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold">受渡完了</span> :
                                                res.status === 'キャンセル' ? <span className="bg-gray-200 text-gray-500 px-3 py-1 rounded-full text-xs font-bold">取消</span> :
                                                    <div className="flex gap-2 justify-center"><button onClick={() => updateReservationStatus(res.id, '受渡済み')} className="bg-[#10B981] text-white px-3 py-1 rounded text-xs">完了</button><button onClick={() => updateReservationStatus(res.id, 'キャンセル')} className="border px-3 py-1 rounded text-xs">取消</button></div>}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {showResModal && (
                    <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 p-4 pt-10 overflow-y-auto">
                        <div className="bg-bakery-bg p-8 rounded-xl shadow-2xl w-full max-w-2xl relative border-2 border-bakery-border animate-fade-in-up my-auto">
                            <button onClick={() => { setShowResModal(false); setOrderItems([]); }} className="absolute top-4 right-4 text-gray-500 hover:text-black">✖</button>
                            <h2 className="text-2xl font-bold mb-6">🥐 予約注文の登録</h2>
                            <form onSubmit={handleAddReservation} className="space-y-4">
                                <div className="bg-bakery-surface p-4 rounded-lg border">
                                    <label className="block text-sm font-bold mb-2">お客様 <span className="text-red-500">*</span></label>
                                    <select value={resCustomerId} onChange={e => { setResCustomerId(e.target.value); setResGuestName(''); setResGuestPhone(''); }} className="w-full p-3 border rounded mb-3"><option value="">-- 会員から選択 --</option>{customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
                                    {!resCustomerId && <div className="flex gap-3"><input type="text" placeholder="お名前" value={resGuestName} onChange={e => setResGuestName(e.target.value)} className="flex-1 p-3 border rounded" /><input type="text" placeholder="電話番号" value={resGuestPhone} onChange={e => setResGuestPhone(e.target.value)} className="flex-1 p-3 border rounded" /></div>}
                                </div>
                                <div className="flex gap-4"><input type="date" value={resDate} onChange={e => setResDate(e.target.value)} className="w-full p-3 border rounded" /><input type="time" value={resTime} onChange={e => setResTime(e.target.value)} className="w-full p-3 border rounded" /></div>
                                <div className="bg-white p-4 rounded-lg border">
                                    <label className="block text-sm font-bold mb-3">注文商品 <span className="text-red-500">*</span></label>
                                    {products.length === 0 ? <p className="text-xs text-red-500">マスタに商品がありません。</p> : (
                                        <div className="max-h-60 overflow-y-auto grid grid-cols-2 gap-2">
                                            {products.map(p => {
                                                const qty = orderItems.find(i => i.productId === p.id)?.qty || 0;
                                                return <div key={p.id} className={`flex justify-between items-center p-2 border rounded ${qty > 0 ? 'bg-bakery-surface border-bakery-gold' : ''}`}><span className="text-sm font-bold truncate pr-2">{p.name} ￥{p.price}</span><div className="flex items-center gap-2"><button type="button" onClick={() => handleOrderChange(p.id, qty - 1)} className="w-6 h-6 bg-gray-200 rounded-full font-bold">-</button><span className="w-4 text-center text-sm font-bold">{qty}</span><button type="button" onClick={() => handleOrderChange(p.id, qty + 1)} className="w-6 h-6 bg-bakery-primary text-white rounded-full font-bold">+</button></div></div>
                                            })}
                                        </div>
                                    )}
                                </div>
                                <input type="text" placeholder="備考・メモ" value={resMemo} onChange={e => setResMemo(e.target.value)} className="w-full p-3 border rounded" />
                                <button type="submit" disabled={isSaving} className="w-full py-3 bg-bakery-gold text-white rounded-lg font-bold">注文確定</button>
                            </form>
                        </div>
                    </div>
                )}

                {showModal && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                        <form onSubmit={handleAddCustomer} className="bg-bakery-bg p-8 rounded-xl w-full max-w-md space-y-4 relative">
                            <button type="button" onClick={() => setShowModal(false)} className="absolute top-4 right-4 text-gray-500">✖</button>
                            <h2 className="text-2xl font-bold mb-6">➕ 新規顧客</h2>
                            <input required type="text" value={newName} onChange={e => setNewName(e.target.value)} placeholder="氏名 *" className="w-full p-3 border rounded" />
                            <input type="text" value={newPhone} onChange={e => setNewPhone(e.target.value)} placeholder="電話番号" className="w-full p-3 border rounded" />
                            <textarea rows={2} value={newAddress} onChange={e => setNewAddress(e.target.value)} placeholder="住所（配送先）" className="w-full p-3 border rounded" />
                            <button type="submit" disabled={isSaving} className="w-full py-3 bg-bakery-primary text-white rounded font-bold">登録する</button>
                        </form>
                    </div>
                )}
            </div>
        </>
    );
}