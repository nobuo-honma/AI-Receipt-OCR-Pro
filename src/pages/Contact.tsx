// src/pages/Contact.tsx
import { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';

export default function Contact() {
    const [messages, setMessages] = useState<any[]>([]);
    const [newMessage, setNewMessage] = useState("");
    const [myRole, setMyRole] = useState<'販売' | '製造'>('販売');
    const endRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        supabase.from('messages').select('*').order('created_at', { ascending: false }).limit(50)
            .then(({ data }) => { setMessages((data || []).reverse()); setTimeout(() => endRef.current?.scrollIntoView(), 100); });

        const sub = supabase.channel('msgs').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, p => {
            setMessages(prev => [...prev, p.new]); setTimeout(() => endRef.current?.scrollIntoView(), 100);
        }).subscribe();

        return () => { supabase.removeChannel(sub); };
    }, []);

    const send = async (e: any) => { e.preventDefault(); if (newMessage) { await supabase.from('messages').insert({ sender: myRole, content: newMessage }); setNewMessage(""); } };

    return (
        <div className="p-4 md:p-8 max-w-4xl mx-auto h-[calc(100vh-80px)] flex flex-col">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 border-b-2 border-bakery-border pb-4 gap-4">
                <h1 className="text-3xl font-bold text-bakery-textMain">💬 業務連絡チャット</h1>
                <div className="flex bg-white rounded-lg p-1 border border-bakery-border shadow-sm">
                    <button onClick={() => setMyRole('販売')} className={`px-6 py-2 rounded-md font-bold text-sm transition-colors ${myRole === '販売' ? 'bg-bakery-gold text-white' : 'text-gray-500 hover:bg-gray-50'}`}>🛒 販売として参加</button>
                    <button onClick={() => setMyRole('製造')} className={`px-6 py-2 rounded-md font-bold text-sm transition-colors ${myRole === '製造' ? 'bg-[#8B5E3C] text-white' : 'text-gray-500 hover:bg-gray-50'}`}>🥖 製造として参加</button>
                </div>
            </div>

            <div className="flex items-start gap-2 bg-[#FFF8E7] border border-bakery-border/50 text-[#8B6340] text-sm p-4 rounded-lg shadow-sm mb-6">
                <span className="text-bakery-gold text-lg leading-none mt-0.5">💡</span>
                <p className="leading-relaxed">店舗と厨房のリアルタイムな連絡ツールです。右上のボタンで自分の立場を切り替えてから送信してください。</p>
            </div>

            <div className="flex-1 bg-white p-4 md:p-6 overflow-y-auto rounded-t-2xl border border-bakery-border shadow-inner">
                {messages.length === 0 && <div className="h-full flex items-center justify-center text-gray-400">メッセージはまだありません</div>}
                {messages.map(m => (
                    <div key={m.id} className={`flex flex-col ${m.sender === myRole ? 'items-end' : 'items-start'} mb-4`}>
                        {m.sender !== myRole && <span className="text-xs text-[#8B6340] mb-1 ml-2">{m.sender}部門</span>}
                        <div className={`px-5 py-3 rounded-2xl max-w-[80%] whitespace-pre-wrap shadow-sm ${m.sender === myRole ? 'bg-bakery-gold text-white rounded-br-none' : 'bg-gray-100 rounded-bl-none text-bakery-textMain'}`}>
                            {m.content}
                        </div>
                    </div>
                ))}
                <div ref={endRef} />
            </div>

            <form onSubmit={send} className="flex gap-2 bg-bakery-surface p-4 border border-t-0 border-bakery-border rounded-b-2xl shadow-sm">
                <input
                    value={newMessage}
                    onChange={e => setNewMessage(e.target.value)}
                    className="flex-1 p-4 border border-bakery-border rounded-xl focus:ring-2 focus:ring-bakery-gold outline-none text-bakery-textMain"
                    placeholder="メッセージを入力..."
                />
                <button
                    disabled={!newMessage.trim()}
                    className="bg-bakery-primary text-white px-8 rounded-xl font-bold shadow-md hover:bg-[#8B5E3C] disabled:bg-gray-400 transition-colors"
                >
                    送信 🚀
                </button>
            </form>
        </div>
    );
}