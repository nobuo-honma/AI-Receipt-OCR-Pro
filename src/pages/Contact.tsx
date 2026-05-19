import { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';

export default function Contact() {
    const [messages, setMessages] = useState<any[]>([]);
    const [newMessage, setNewMessage] = useState("");
    const [myRole, setMyRole] = useState<'販売' | '製造'>('販売');
    const endRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        supabase.from('messages').select('*').order('created_at').limit(50).then(({ data }) => setMessages(data || []));
        const sub = supabase.channel('msgs').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, p => {
            setMessages(prev => [...prev, p.new]); setTimeout(() => endRef.current?.scrollIntoView(), 100);
        }).subscribe();
        return () => { supabase.removeChannel(sub); };
    }, []);

    const send = async (e: any) => { e.preventDefault(); if (newMessage) { await supabase.from('messages').insert({ sender: myRole, content: newMessage }); setNewMessage(""); } };

    return (
        <div className="p-4 max-w-4xl mx-auto h-[80vh] flex flex-col">
            <div className="flex justify-between mb-2">
                <h1 className="text-2xl font-bold">📞 業務連絡</h1>
                <div><button onClick={() => setMyRole('販売')} className={`px-4 ${myRole === '販売' ? 'bg-bakery-gold text-white' : 'bg-white'}`}>🛒 販売</button><button onClick={() => setMyRole('製造')} className={`px-4 ${myRole === '製造' ? 'bg-[#8B5E3C] text-white' : 'bg-white'}`}>🥖 製造</button></div>
            </div>

            <div className="flex items-start gap-2 bg-[#FFF8E7] border border-bakery-border/50 text-[#8B6340] text-xs p-2 rounded-lg mb-4">
                <span className="text-bakery-gold text-base leading-none">💡</span>
                <p className="leading-relaxed">店舗と厨房のリアルタイムな連絡ツールです。右上のボタンで自分の立場を切り替えてから送信してください。</p>
            </div>

            <div className="flex-1 bg-white p-4 overflow-y-auto rounded-t-xl border">
                {messages.map(m => (<div key={m.id} className={`flex flex-col ${m.sender === myRole ? 'items-end' : 'items-start'} mb-4`}><div className={`px-4 py-3 rounded-2xl max-w-[80%] whitespace-pre-wrap ${m.sender === myRole ? 'bg-bakery-gold text-white rounded-br-none' : 'bg-gray-100 rounded-bl-none'}`}>{m.content}</div></div>))}
                <div ref={endRef} />
            </div>
            <form onSubmit={send} className="flex gap-2 bg-white p-2 border-t"><input value={newMessage} onChange={e => setNewMessage(e.target.value)} className="flex-1 p-3 border rounded" placeholder="送信..." /><button className="bg-bakery-primary text-white px-6 rounded font-bold">送信</button></form>
        </div>
    );
}