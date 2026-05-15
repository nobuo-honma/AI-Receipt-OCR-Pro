// src/pages/Contact.tsx
import { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';

type Message = {
    id: number;
    sender: '販売' | '製造';
    content: string;
    created_at: string;
};

export default function Contact() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState("");
    // 自分が「販売部門」か「製造部門」かを選択するステート（初期値は販売）
    const [myRole, setMyRole] = useState<'販売' | '製造'>('販売');

    // チャットの自動スクロール用
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // 1. 初回のメッセージ取得とリアルタイム監視
    useEffect(() => {
        // 過去のメッセージを古い順に取得
        const fetchMessages = async () => {
            const { data } = await supabase
                .from('messages')
                .select('*')
                .order('created_at', { ascending: true })
                .limit(50); // 直近50件
            if (data) setMessages(data as Message[]);
            scrollToBottom();
        };
        fetchMessages();

        // ⭐️ リアルタイム監視：新しいメッセージが来たら自動で画面に追加
        const subscription = supabase
            .channel('public:messages')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, payload => {
                setMessages(prev => [...prev, payload.new as Message]);
                scrollToBottom();
            })
            .subscribe();

        return () => { supabase.removeChannel(subscription); };
    }, []);

    // 2. メッセージの送信
    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim()) return;

        const textToSend = newMessage.trim();
        setNewMessage(""); // 送信ボタンを押したらすぐに入力欄を空にする

        const { error } = await supabase.from('messages').insert({
            sender: myRole,
            content: textToSend,
        });

        if (error) alert("送信に失敗しました。");
    };

    // 常に最新のメッセージ（一番下）にスクロールする関数
    const scrollToBottom = () => {
        setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
    };

    // 時間を「HH:MM」形式にする
    const formatTime = (isoString: string) => {
        const d = new Date(isoString);
        return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    };

    return (
        <div className="p-4 md:p-8 max-w-4xl mx-auto h-[calc(100vh-80px)] flex flex-col">

            {/* ── ヘッダー ── */}
            <div className="flex flex-col sm:flex-row justify-between items-center mb-4 border-b-2 border-bakery-border pb-4 gap-4">
                <h1 className="text-3xl font-bold text-bakery-textMain flex items-center gap-2">
                    📞 業務連絡チャット
                </h1>

                {/* 部門切り替えスイッチ */}
                <div className="flex bg-bakery-bg rounded-lg p-1 border border-bakery-border">
                    <button
                        onClick={() => setMyRole('販売')}
                        className={`px-6 py-2 rounded-md font-bold text-sm transition-colors ${myRole === '販売' ? 'bg-bakery-gold text-white shadow' : 'text-[#8B6340] hover:bg-white/50'}`}
                    >
                        🛒 販売部門（レジ）
                    </button>
                    <button
                        onClick={() => setMyRole('製造')}
                        className={`px-6 py-2 rounded-md font-bold text-sm transition-colors ${myRole === '製造' ? 'bg-[#8B5E3C] text-white shadow' : 'text-[#8B6340] hover:bg-white/50'}`}
                    >
                        🥖 製造部門（厨房）
                    </button>
                </div>
            </div>

            {/* ── チャット表示エリア（スクロール可能） ── */}
            <div className="flex-1 bg-white rounded-t-xl border border-bakery-border p-4 overflow-y-auto bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjEiIGZpbGw9IiNFMEM4OTgiLz48L3N2Zz4=')]">

                {messages.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-[#8B6340]">
                        <p>まだメッセージはありません。挨拶してみましょう！</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {messages.map((msg) => {
                            const isMe = msg.sender === myRole;
                            return (
                                <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                    {/* 送信者名（相手の時だけ表示） */}
                                    {!isMe && <span className="text-xs text-[#8B6340] mb-1 ml-1">{msg.sender === '販売' ? '🛒 販売部門' : '🥖 製造部門'}</span>}

                                    <div className="flex items-end gap-2">
                                        {/* 吹き出し */}
                                        <div className={`max-w-[280px] md:max-w-md px-4 py-3 rounded-2xl shadow-sm whitespace-pre-wrap ${isMe ? 'bg-bakery-gold text-white rounded-br-none' : 'bg-white border border-bakery-border text-bakery-textMain rounded-bl-none'}`}>
                                            {msg.content}
                                        </div>
                                        {/* 時間 */}
                                        <span className="text-[10px] text-gray-400 mb-1">{formatTime(msg.created_at)}</span>
                                    </div>
                                </div>
                            );
                        })}
                        <div ref={messagesEndRef} /> {/* スクロールの目印 */}
                    </div>
                )}
            </div>

            {/* ── 入力エリア ── */}
            <form onSubmit={handleSendMessage} className="bg-bakery-surface p-4 rounded-b-xl border border-t-0 border-bakery-border flex gap-2">
                <input
                    type="text"
                    value={newMessage}
                    onChange={e => setNewMessage(e.target.value)}
                    placeholder={`${myRole}としてメッセージを送信...`}
                    className="flex-1 p-3 rounded-lg border border-bakery-border focus:outline-none focus:ring-2 focus:ring-bakery-gold"
                />
                <button
                    type="submit"
                    disabled={!newMessage.trim()}
                    className="bg-bakery-primary text-white px-6 py-3 rounded-lg font-bold shadow-md hover:bg-[#8B5E3C] transition-colors disabled:bg-gray-400"
                >
                    送信 🚀
                </button>
            </form>

        </div>
    );
}