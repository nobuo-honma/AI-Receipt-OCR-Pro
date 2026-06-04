// src/pages/Customers.tsx
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

// ── 型定義 ──
type Customer = { id: number; name: string; phone: string; address: string; total_spent: number; visit_count: number; last_visit: string; };
type Reservation = { id: number; customer_id: number | null; guest_name: string; guest_phone: string; reservation_date: string; reservation_time: string; order_details: string; status: string; memo: string; customers: { name: string; phone: string } };
type Product = { id: number; name: string; price: number; };

export default function Customers() {
    const [activeTab, setActiveTab] = useState<'list' | 'reservation'>('list');
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [reservations, setReservations] = useState<Reservation[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
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
        setLoading(true);
        const { data: cData } = await supabase.from('customers').select('*').order('last_visit', { ascending: false });
        if (cData) setCustomers(cData);
        const { data: rData } = await supabase.from('reservations').select('*, customers(name, phone)').order('reservation_date', { ascending: true }).order('reservation_time', { ascending: true });
        if (rData) setReservations(rData as any);
        const { data: pData } = await supabase.from('products').select('*').order('id', { ascending: true });
        if (pData) setProducts(pData);
        setLoading(false);
    };

    useEffect(() => { fetchData(); }, []);

    const handleAddCustomer = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (!newName.trim()) { alert("氏名は必須です！"); return; }
            setIsSaving(true);
            const normalizedName = newName.trim().normalize("NFKC");
            const normalizedAddress = newAddress ? newAddress.trim().normalize("NFKC") : '';
            // ⭐️ points は登録しないように変更（テーブルにカラムがあっても自動で0になります）
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

    const handleDeleteAllCustomers = async () => {
        if (window.confirm("【重大な警告】\n登録されている全ての顧客データ、購買履歴、予約データを完全に削除しますか？\n※この操作は絶対に取り消せません！")) {
            await supabase.from('reservations').delete().neq('id', 0);
            await supabase.from('customer_purchases').delete().neq('id', 0);
            const { error } = await supabase.from('customers').delete().neq('id', 0);
            if (error) { alert("削除に失敗しました。\n" + error.message); }
            else { alert("全ての顧客と予約データをリセットしました。"); fetchData(); }
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

    const handlePrint = () => window.print();

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
                            {customers.length > 0 && <button onClick={handleDeleteAllCustomers} className="bg-white border-2 border-red-400 text-red-500 hover:bg-red-50 px-4 py-2 rounded-md font-bold transition-colors shadow-sm">🗑️ 全削除</button>}
                            <button onClick={handlePrint} disabled={filteredCustomers.length === 0} className="bg-white border-2 border-[#8B6340] text-[#8B6340] hover:bg-bakery-surface px-6 py-2 rounded-md font-bold transition-colors shadow-sm disabled:opacity-50">🖨️ ラベル印刷</button>
                            <button onClick={() => setShowModal(true)} className="bg-bakery-primary hover:bg-[#8B5E3C] text-white px-6 py-2 rounded-md font-bold transition-colors shadow-sm">➕ 新規顧客</button>
                        </div>
                    ) : (
                        <button onClick={() => setShowResModal(true)} className="bg-bakery-gold hover:bg-[#C4A882] text-white px-6 py-2 rounded-md font-bold transition-colors shadow-sm">🥐 予約注文を入れる</button>
                    )}
                </div>

                <div className="flex items-start gap-2 bg-[#FFF8E7] border border-bakery-border/50 text-[#8B6340] text-sm p-3 rounded-lg mb-6 animate-fade-in-up">
                    <span className="text-bakery-gold text-lg leading-none mt-0.5">💡</span>
                    <p className="leading-relaxed">{activeTab === 'list' ? "常連のお客様を登録しておくと、来店回数や購入履歴を確認できます。また「宛名ラベル」の印刷も可能です。" : "電話や店頭で受けた予約を登録します。まだ会員登録していないお客様でも、直接お名前を入力するだけで注文を受け付けられます。"}</p>
                </div>

                {loading ? (
                    <p className="text-bakery-textMain animate-pulse">データを取得中...</p>
                ) : (
                    <>
                        {activeTab === 'list' && (
                            <div className="animate-fade-in-up">
                                <input type="text" placeholder="🔍 検索（名前・電話・住所）" value={searchWord} onChange={e => setSearchWord(e.target.value)} className="w-full md:w-1/2 p-3 mb-6 border border-bakery-border rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-bakery-gold text-bakery-textMain" />
                                {filteredCustomers.length === 0 ? (
                                    <div className="border-2 border-dashed border-bakery-border p-16 text-center rounded-lg text-[#8B6340] bg-bakery-surface"><p>顧客が見つかりません。</p></div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {filteredCustomers.map(customer => {
                                            let rank = "";
                                            if (customer.total_spent >= 50000) rank = "🥇";
                                            else if (customer.total_spent >= 20000) rank = "🥈";
                                            else if (customer.total_spent >= 5000) rank = "🥉";

                                            return (
                                                <div key={customer.id} className="bg-white p-6 rounded-xl border border-bakery-border shadow-sm hover:shadow-md transition-shadow relative group overflow-hidden">
                                                    <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-bakery-gold to-bakery-primary"></div>
                                                    <button onClick={() => handleDeleteCustomer(customer.id, customer.name)} className="absolute top-3 right-3 text-red-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">🗑️</button>
                                                    <h2 className="text-xl font-bold text-bakery-textMain mb-2">{rank} {customer.name}</h2>
                                                    <div className="text-xs text-[#8B6340] mb-4 space-y-1">
                                                        <p className="flex items-start gap-1"><span className="shrink-0">📞</span> <span>{customer.phone || '未登録'}</span></p>
                                                        <p className="flex items-start gap-1"><span className="shrink-0">🏠</span> <span className="line-clamp-2">{customer.address || '未登録'}</span></p>
                                                    </div>

                                                    {/* ⭐️ ポイントの表示エリアを削除してスッキリさせました */}

                                                    <div className="flex justify-between text-xs text-bakery-primary border-t border-bakery-border pt-3 mt-4">
                                                        <span>来店 {customer.visit_count}回</span>
                                                        <span>累計 ￥{customer.total_spent.toLocaleString()}</span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'reservation' && (
                            <div className="animate-fade-in-up">
                                {reservations.length === 0 ? (
                                    <div className="border-2 border-dashed border-bakery-border p-16 text-center rounded-lg text-[#8B6340] bg-bakery-surface"><p>現在、予約注文は入っていません。</p></div>
                                ) : (
                                    <div className="bg-white rounded-xl shadow-sm border border-bakery-border overflow-hidden">
                                        <table className="w-full text-left border-collapse">
                                            <thead>
                                                <tr className="bg-bakery-bg text-bakery-primary text-sm">
                                                    <th className="p-4 border-b border-bakery-border w-32">受渡日時</th>
                                                    <th className="p-4 border-b border-bakery-border w-48">お客様名</th>
                                                    <th className="p-4 border-b border-bakery-border">注文内容</th>
                                                    <th className="p-4 border-b border-bakery-border text-center w-32">状態</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {reservations.map(res => {
                                                    const isCanceled = res.status === 'キャンセル';
                                                    const isDone = res.status === '受渡済み';
                                                    return (
                                                        <tr key={res.id} className={`border-b border-gray-100 ${isCanceled ? 'bg-gray-50 opacity-60' : 'hover:bg-[#FAFAFA]'}`}>
                                                            <td className="p-4"><span className="font-bold text-bakery-primary">{res.reservation_date}</span><br /><span className="text-sm text-[#8B6340]">{res.reservation_time}</span></td>
                                                            <td className="p-4 font-bold text-bakery-textMain">
                                                                {res.customer_id ? res.customers?.name : res.guest_name}
                                                                {!res.customer_id && <span className="text-[10px] text-bakery-primary ml-2 bg-bakery-surface px-1.5 py-0.5 rounded border border-bakery-border">非会員</span>}
                                                                <br /><span className="text-xs text-gray-500 font-normal">📞 {res.customer_id ? (res.customers?.phone || '未登録') : (res.guest_phone || '未登録')}</span>
                                                            </td>
                                                            <td className="p-4">
                                                                <div className="text-sm font-bold text-bakery-textMain whitespace-pre-wrap">{res.order_details}</div>
                                                                {res.memo && <p className="text-xs text-gray-500 mt-2 bg-gray-50 p-2 rounded">💡 備考: {res.memo}</p>}
                                                            </td>
                                                            <td className="p-4 text-center">
                                                                {isDone ? <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold">受渡完了</span>
                                                                    : isCanceled ? <span className="bg-gray-200 text-gray-500 px-3 py-1 rounded-full text-xs font-bold">取消</span>
                                                                        : (
                                                                            <div className="flex flex-col gap-2">
                                                                                <button onClick={() => updateReservationStatus(res.id, '受渡済み')} className="text-xs bg-[#10B981] text-white px-3 py-2 rounded hover:bg-green-600 transition-colors font-bold shadow-sm">受渡完了</button>
                                                                                <button onClick={() => updateReservationStatus(res.id, 'キャンセル')} className="text-xs bg-white border border-gray-300 text-gray-600 px-3 py-1 rounded hover:bg-gray-50 transition-colors">取消</button>
                                                                            </div>
                                                                        )}
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        )}
                    </>
                )}

                {showResModal && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-start justify-center z-50 p-4 pt-10 overflow-y-auto">
                        <div className="bg-bakery-bg p-8 rounded-xl shadow-2xl w-full max-w-2xl relative border-2 border-bakery-border animate-fade-in-up my-auto">
                            <button onClick={() => { setShowResModal(false); setOrderItems([]); }} className="absolute top-4 right-4 text-gray-500 hover:text-black text-xl">✖</button>
                            <h2 className="text-2xl font-bold text-bakery-textMain mb-6">🥐 予約注文の登録</h2>

                            <form onSubmit={handleAddReservation} className="space-y-4">
                                <div className="bg-bakery-surface p-4 rounded-lg border border-bakery-border">
                                    <label className="block text-sm font-bold text-[#8B6340] mb-2">お客様の選択・入力 <span className="text-red-500">*</span></label>
                                    <select value={resCustomerId} onChange={e => { setResCustomerId(e.target.value); setResGuestName(''); setResGuestPhone(''); }} className="w-full p-3 border border-bakery-border rounded bg-white focus:outline-none focus:ring-2 focus:ring-bakery-gold mb-3">
                                        <option value="">-- 会員から選択（または下に入力） --</option>
                                        {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                    {!resCustomerId && (
                                        <div className="flex flex-col sm:flex-row gap-3 animate-fade-in-up mt-3">
                                            <input type="text" placeholder="お名前 (例: 佐藤)" value={resGuestName} onChange={e => setResGuestName(e.target.value)} className="w-full sm:flex-1 p-3 border border-bakery-border rounded bg-white focus:outline-none focus:ring-2 focus:ring-bakery-gold" />
                                            <input type="text" placeholder="電話番号" value={resGuestPhone} onChange={e => setResGuestPhone(e.target.value)} className="w-full sm:flex-1 p-3 border border-bakery-border rounded bg-white focus:outline-none focus:ring-2 focus:ring-bakery-gold" />
                                        </div>
                                    )}
                                </div>

                                <div className="flex gap-4">
                                    <div className="flex-1">
                                        <label className="block text-sm font-bold text-[#8B6340] mb-1">受渡日 <span className="text-red-500">*</span></label>
                                        <input required type="date" value={resDate} onChange={e => setResDate(e.target.value)} className="w-full p-3 border border-bakery-border rounded bg-white" />
                                    </div>
                                    <div className="flex-1">
                                        <label className="block text-sm font-bold text-[#8B6340] mb-1">受渡時間 <span className="text-red-500">*</span></label>
                                        <input required type="time" value={resTime} onChange={e => setResTime(e.target.value)} className="w-full p-3 border border-bakery-border rounded bg-white" />
                                    </div>
                                </div>

                                <div className="bg-white p-4 rounded-lg border border-bakery-border">
                                    <label className="block text-sm font-bold text-[#8B6340] mb-3">注文する商品（個数を入力） <span className="text-red-500">*</span></label>
                                    {products.length === 0 ? (
                                        <p className="text-xs text-red-500">※マスタに商品が登録されていません。「マスタ管理」から商品を登録してください。</p>
                                    ) : (
                                        <div className="max-h-60 overflow-y-auto pr-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                                            {products.map(p => {
                                                const currentItem = orderItems.find(item => item.productId === p.id);
                                                const qty = currentItem ? currentItem.qty : 0;
                                                return (
                                                    <div key={p.id} className={`flex items-center justify-between p-2 border rounded ${qty > 0 ? 'bg-bakery-surface border-bakery-gold' : 'border-gray-200 hover:bg-gray-50'}`}>
                                                        <div className="text-sm font-bold text-bakery-textMain truncate pr-2">{p.name} <span className="text-xs text-gray-500 font-normal ml-1">￥{p.price}</span></div>
                                                        <div className="flex items-center gap-2 shrink-0">
                                                            <button type="button" onClick={() => handleOrderChange(p.id, qty - 1)} className="w-6 h-6 rounded-full bg-gray-200 text-gray-600 hover:bg-gray-300 flex items-center justify-center font-bold">-</button>
                                                            <span className="w-4 text-center text-sm font-bold">{qty}</span>
                                                            <button type="button" onClick={() => handleOrderChange(p.id, qty + 1)} className="w-6 h-6 rounded-full bg-bakery-primary text-white hover:bg-[#8B5E3C] flex items-center justify-center font-bold">+</button>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                    {orderItems.length > 0 && (
                                        <div className="mt-4 pt-3 border-t border-dashed border-bakery-border text-right text-sm">
                                            選択中: <span className="font-bold text-bakery-primary text-lg">{orderItems.reduce((sum, item) => sum + item.qty, 0)}</span> 個
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-[#8B6340] mb-1">備考・メモ（任意）</label>
                                    <input type="text" placeholder="紙袋が必要、ギフト包装など" value={resMemo} onChange={e => setResMemo(e.target.value)} className="w-full p-3 border border-bakery-border rounded bg-white" />
                                </div>

                                <div className="pt-4">
                                    <button type="submit" disabled={isSaving} className="w-full py-3 bg-bakery-gold text-white rounded-lg font-bold hover:bg-[#C4A882] transition-colors shadow-md disabled:bg-gray-400">
                                        {isSaving ? '登録中...' : '🥐 注文を確定する'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {showModal && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                        <div className="bg-bakery-bg p-8 rounded-xl shadow-2xl w-full max-w-md relative border-2 border-bakery-border animate-fade-in-up">
                            <button onClick={() => setShowModal(false)} className="absolute top-4 right-4 text-gray-500 hover:text-black">✖</button>
                            <h2 className="text-2xl font-bold text-bakery-textMain mb-6">➕ 新規顧客の登録</h2>
                            <form onSubmit={handleAddCustomer} className="space-y-4">
                                <div><label className="block text-sm font-bold text-[#8B6340] mb-1">氏名 <span className="text-red-500">*</span></label><input required type="text" value={newName} onChange={e => setNewName(e.target.value)} className="w-full p-3 border border-bakery-border rounded bg-white focus:ring-2 focus:ring-bakery-gold outline-none" /></div>
                                <div><label className="block text-sm font-bold text-[#8B6340] mb-1">電話番号</label><input type="text" value={newPhone} onChange={e => setNewPhone(e.target.value)} className="w-full p-3 border border-bakery-border rounded bg-white focus:ring-2 focus:ring-bakery-gold outline-none" /></div>
                                <div><label className="block text-sm font-bold text-[#8B6340] mb-1">住所（配送先）</label><textarea rows={2} value={newAddress} onChange={e => setNewAddress(e.target.value)} className="w-full p-3 border border-bakery-border rounded bg-white focus:ring-2 focus:ring-bakery-gold outline-none resize-none" /></div>
                                <button type="submit" disabled={isSaving} className="w-full py-3 bg-bakery-primary text-bakery-gold rounded font-bold hover:bg-[#8B5E3C] shadow-md mt-2">登録する</button>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}