// src/pages/Customers.tsx
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

// 型定義
type Customer = { id: number; name: string; phone: string; email: string; points: number; total_spent: number; visit_count: number; last_visit: string; };
type Reservation = { id: number; customer_id: number; reservation_date: string; reservation_time: string; order_details: string; status: string; memo: string; customers: { name: string; phone: string } };

export default function Customers() {
    const [activeTab, setActiveTab] = useState<'list' | 'reservation'>('list');
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [reservations, setReservations] = useState<Reservation[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchWord, setSearchWord] = useState('');

    // 新規顧客登録モーダル用
    const [showModal, setShowModal] = useState(false);
    const [newName, setNewName] = useState('');
    const [newPhone, setNewPhone] = useState('');

    // 予約注文モーダル用
    const [showResModal, setShowResModal] = useState(false);
    const [resCustomerId, setResCustomerId] = useState('');
    const [resDate, setResDate] = useState('');
    const [resTime, setResTime] = useState('');
    const [resOrderDetails, setResOrderDetails] = useState(''); // ← 注文内容
    const [resMemo, setResMemo] = useState('');

    const [isSaving, setIsSaving] = useState(false);

    // データ取得
    const fetchData = async () => {
        setLoading(true);
        const { data: cData } = await supabase.from('customers').select('*').order('last_visit', { ascending: false });
        if (cData) setCustomers(cData);

        // 予約の取得（未来の予約を近い順に表示）
        const { data: rData } = await supabase
            .from('reservations')
            .select('*, customers(name, phone)')
            .order('reservation_date', { ascending: true })
            .order('reservation_time', { ascending: true });
        if (rData) setReservations(rData as any);

        setLoading(false);
    };

    useEffect(() => { fetchData(); }, []);

    // ── 顧客登録・削除 ──
    const handleAddCustomer = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newName.trim()) return alert("氏名は必須です！");
        setIsSaving(true);
        const { error } = await supabase.from('customers').insert({ name: newName, phone: newPhone, created_at: new Date().toISOString() });
        setIsSaving(false);
        if (!error) {
            alert("登録しました！");
            setShowModal(false); setNewName(''); setNewPhone(''); fetchData();
        }
    };

    const handleDeleteCustomer = async (id: number, name: string) => {
        if (!window.confirm(`本当に「${name}」さんを削除しますか？`)) return;
        await supabase.from('customer_purchases').delete().eq('customer_id', id);
        await supabase.from('customers').delete().eq('id', id);
        fetchData();
    };

    // ── 予約注文登録・ステータス変更 ──
    const handleAddReservation = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!resCustomerId || !resDate || !resTime || !resOrderDetails) return alert("必須項目を入力してください");
        setIsSaving(true);

        const { error } = await supabase.from('reservations').insert({
            customer_id: Number(resCustomerId),
            reservation_date: resDate,
            reservation_time: resTime,
            order_details: resOrderDetails,
            memo: resMemo,
            status: '未受渡' // ステータスを受渡しに変更
        });

        setIsSaving(false);
        if (!error) {
            alert("予約注文を登録しました！");
            setShowResModal(false); setResCustomerId(''); setResDate(''); setResTime(''); setResOrderDetails(''); setResMemo('');
            fetchData();
        } else {
            alert("予約の登録に失敗しました。");
            console.error(error);
        }
    };

    const updateReservationStatus = async (id: number, newStatus: string) => {
        if (window.confirm(`ステータスを「${newStatus}」に変更しますか？`)) {
            await supabase.from('reservations').update({ status: newStatus }).eq('id', id);
            fetchData();
        }
    };

    const filteredCustomers = customers.filter(c => c.name.includes(searchWord) || (c.phone && c.phone.includes(searchWord)));

    return (
        <div className="p-8 max-w-6xl mx-auto relative">

            {/* ── ヘッダー & タブ切り替え ── */}
            <div className="flex flex-col md:flex-row justify-between items-end md:items-center mb-8 border-b-2 border-bakery-border pb-4 gap-4">
                <div className="flex items-center gap-6">
                    <h1 className="text-3xl font-bold text-bakery-textMain">👥 顧客と予約</h1>
                    <div className="flex bg-bakery-bg rounded-lg p-1 border border-bakery-border">
                        <button onClick={() => setActiveTab('list')} className={`px-4 py-2 rounded-md font-bold text-sm transition-colors ${activeTab === 'list' ? 'bg-white text-bakery-primary shadow' : 'text-[#8B6340] hover:bg-white/50'}`}>📋 顧客一覧</button>
                        <button onClick={() => setActiveTab('reservation')} className={`px-4 py-2 rounded-md font-bold text-sm transition-colors ${activeTab === 'reservation' ? 'bg-white text-bakery-primary shadow' : 'text-[#8B6340] hover:bg-white/50'}`}>🥐 予約注文一覧</button>
                    </div>
                </div>

                {activeTab === 'list' ? (
                    <button onClick={() => setShowModal(true)} className="bg-bakery-primary hover:bg-[#8B5E3C] text-white px-6 py-2 rounded-md font-bold transition-colors shadow-sm">➕ 新規顧客</button>
                ) : (
                    <button onClick={() => setShowResModal(true)} className="bg-[#D4A96A] hover:bg-[#C4A882] text-white px-6 py-2 rounded-md font-bold transition-colors shadow-sm">🥐 予約注文を入れる</button>
                )}
            </div>

            {loading ? (
                <p className="text-bakery-textMain animate-pulse">データを取得中...</p>
            ) : (
                <>
                    {/* =========================================
              タブ1: 顧客一覧 
             ========================================= */}
                    {activeTab === 'list' && (
                        <div className="animate-fade-in-up">
                            <input type="text" placeholder="🔍 検索（名前・電話番号）" value={searchWord} onChange={e => setSearchWord(e.target.value)} className="w-full md:w-1/2 p-3 mb-6 border border-bakery-border rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-bakery-gold text-bakery-textMain" />

                            {filteredCustomers.length === 0 ? (
                                <div className="border-2 border-dashed border-bakery-border p-16 text-center rounded-lg text-[#8B6340] bg-bakery-surface"><p>顧客が見つかりません。</p></div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {filteredCustomers.map(customer => (
                                        <div key={customer.id} className="bg-white p-6 rounded-xl border border-bakery-border shadow-sm hover:shadow-md transition-shadow relative group overflow-hidden">
                                            <div className="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-bakery-gold to-bakery-primary"></div>
                                            <button onClick={() => handleDeleteCustomer(customer.id, customer.name)} className="absolute top-3 right-3 text-red-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">🗑️</button>
                                            <h2 className="text-xl font-bold text-bakery-textMain mb-2">{customer.name}</h2>
                                            <p className="text-xs text-[#8B6340] mb-4">📞 {customer.phone || '未登録'}</p>
                                            <div className="bg-bakery-surface p-3 rounded-md mb-4 border border-[#E0C898]/50 text-sm font-bold text-bakery-primary">
                                                ⭐ ポイント: <span className="text-lg">{customer.points.toLocaleString()}</span>
                                            </div>
                                            <div className="flex justify-between text-xs text-[#6B4226] border-t border-bakery-border pt-3">
                                                <span>来店 {customer.visit_count}回</span>
                                                <span>累計 ￥{customer.total_spent.toLocaleString()}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {/* =========================================
              タブ2: 予約注文一覧 
             ========================================= */}
                    {activeTab === 'reservation' && (
                        <div className="animate-fade-in-up">
                            {reservations.length === 0 ? (
                                <div className="border-2 border-dashed border-bakery-border p-16 text-center rounded-lg text-[#8B6340] bg-bakery-surface"><p>現在、予約注文は入っていません。</p></div>
                            ) : (
                                <div className="bg-white rounded-xl shadow-sm border border-bakery-border overflow-hidden">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="bg-bakery-bg text-[#6B4226] text-sm">
                                                <th className="p-4 border-b border-bakery-border w-32">受渡日時</th>
                                                <th className="p-4 border-b border-bakery-border w-48">お客様名</th>
                                                <th className="p-4 border-b border-bakery-border">注文内容（パン・クッキー等）</th>
                                                <th className="p-4 border-b border-bakery-border text-center w-32">状態</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {reservations.map(res => {
                                                const isCanceled = res.status === 'キャンセル';
                                                const isDone = res.status === '受渡済み';

                                                return (
                                                    <tr key={res.id} className={`border-b border-gray-100 ${isCanceled ? 'bg-gray-50 opacity-60' : 'hover:bg-[#FAFAFA]'}`}>
                                                        <td className="p-4">
                                                            <span className="font-bold text-bakery-primary">{res.reservation_date}</span><br />
                                                            <span className="text-sm text-[#8B6340]">{res.reservation_time}</span>
                                                        </td>
                                                        <td className="p-4 font-bold text-bakery-textMain">
                                                            {res.customers?.name}<br />
                                                            <span className="text-xs text-gray-500 font-normal">📞 {res.customers?.phone || '未登録'}</span>
                                                        </td>
                                                        <td className="p-4">
                                                            {/* 注文内容（改行を反映させる） */}
                                                            <div className="text-sm font-bold text-bakery-textMain whitespace-pre-wrap">
                                                                {res.order_details}
                                                            </div>
                                                            {res.memo && (
                                                                <p className="text-xs text-gray-500 mt-2 bg-gray-50 p-2 rounded">
                                                                    💡 備考: {res.memo}
                                                                </p>
                                                            )}
                                                        </td>
                                                        <td className="p-4 text-center">
                                                            {isDone ? (
                                                                <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold">受渡済み</span>
                                                            ) : isCanceled ? (
                                                                <span className="bg-gray-200 text-gray-500 px-3 py-1 rounded-full text-xs font-bold">キャンセル</span>
                                                            ) : (
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

            {/* ── 予約注文登録モーダル ── */}
            {showResModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-bakery-bg p-8 rounded-xl shadow-2xl w-full max-w-lg relative border-2 border-bakery-border animate-fade-in-up">
                        <button onClick={() => setShowResModal(false)} className="absolute top-4 right-4 text-gray-500 hover:text-black">✖</button>
                        <h2 className="text-2xl font-bold text-bakery-textMain mb-6">🥐 予約注文の登録</h2>

                        <form onSubmit={handleAddReservation} className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-[#8B6340] mb-1">お客様 <span className="text-red-500">*</span></label>
                                <select required value={resCustomerId} onChange={e => setResCustomerId(e.target.value)} className="w-full p-3 border border-bakery-border rounded bg-white focus:outline-none focus:ring-2 focus:ring-bakery-gold">
                                    <option value="">-- 顧客を選択 --</option>
                                    {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
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
                            <div>
                                <label className="block text-sm font-bold text-[#8B6340] mb-1">注文内容（商品と個数） <span className="text-red-500">*</span></label>
                                <textarea
                                    required
                                    rows={4}
                                    placeholder="例：&#13;&#10;食パン 1斤&#13;&#10;チョコクロワッサン 2個&#13;&#10;ブレンドコーヒー 1杯"
                                    value={resOrderDetails}
                                    onChange={e => setResOrderDetails(e.target.value)}
                                    className="w-full p-3 border border-bakery-border rounded bg-white focus:outline-none focus:ring-2 focus:ring-bakery-gold"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-[#8B6340] mb-1">備考・メモ（任意）</label>
                                <input type="text" placeholder="紙袋が必要、ギフト包装など" value={resMemo} onChange={e => setResMemo(e.target.value)} className="w-full p-3 border border-bakery-border rounded bg-white" />
                            </div>

                            <div className="pt-4">
                                <button type="submit" disabled={isSaving} className="w-full py-3 bg-[#D4A96A] text-white rounded-lg font-bold hover:bg-[#C4A882] transition-colors shadow-md disabled:bg-gray-400">
                                    {isSaving ? '登録中...' : '🥐 注文を確定する'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ── 顧客登録モーダル ── */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-bakery-bg p-8 rounded-xl shadow-2xl w-full max-w-md relative border-2 border-bakery-border animate-fade-in-up">
                        <button onClick={() => setShowModal(false)} className="absolute top-4 right-4 text-gray-500 hover:text-black">✖</button>
                        <h2 className="text-2xl font-bold text-bakery-textMain mb-6">➕ 新規顧客の登録</h2>
                        <form onSubmit={handleAddCustomer} className="space-y-4">
                            <div><label className="block text-sm font-bold text-[#8B6340] mb-1">氏名 <span className="text-red-500">*</span></label><input required type="text" value={newName} onChange={e => setNewName(e.target.value)} className="w-full p-3 border rounded bg-white" /></div>
                            <div><label className="block text-sm font-bold text-[#8B6340] mb-1">電話番号</label><input type="text" value={newPhone} onChange={e => setNewPhone(e.target.value)} className="w-full p-3 border rounded bg-white" /></div>
                            <button type="submit" disabled={isSaving} className="w-full py-3 bg-bakery-primary text-bakery-gold rounded font-bold hover:bg-[#8B5E3C] shadow-md">登録する</button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}