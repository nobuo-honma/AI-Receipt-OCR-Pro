import React, { useState } from 'react';

interface HomeProps {
    onNavigate?: (path: string) => void;
}

export default function Home({ onNavigate }: HomeProps) {
    const [imageError, setImageError] = useState(false);

    const handleNavigation = (e: React.MouseEvent<HTMLAnchorElement>, path: string) => {
        if (onNavigate) {
            e.preventDefault();
            onNavigate(path);
        }
    };

    return (
        <div className="min-h-screen pb-10 flex flex-col bg-bakery-bg font-zen text-bakery-textMain selection:bg-amber-200">

            <div
                className={`relative text-center px-10 pt-12 pb-10 shadow-lg overflow-hidden rounded-b-2xl mb-4 bg-cover bg-center transition-all duration-500 ${imageError ? 'bg-gradient-to-b from-[#4A3525] to-[#2D1E15]' : 'bg-[#3D2B1F]'}`}
                style={!imageError ? { backgroundImage: "url('./bakery-hero.jpg')" } : undefined}
            >
                <img
                    src="./bakery-hero.jpg"
                    alt=""
                    className="hidden"
                    onError={() => {
                        console.warn("Hero image failed to load.");
                        setImageError(true);
                    }}
                />

                <div className="absolute inset-0 bg-[#3D2B1F]/70 z-0"></div>

                <div className="relative z-10">
                    <p className="font-playfair italic text-[#D4A96A] tracking-[0.15em] text-sm mb-1">
                        Welcome to
                    </p>
                    <h1 className="font-zen font-black text-[#FDF6E3] text-3xl md:text-4xl tracking-widest mb-3 drop-shadow-md">
                        AI Bakery Manager
                    </h1>
                    <p className="font-zen text-[#E0C898] tracking-[0.15em] text-xs font-bold">
                        OCR · Reservation · Sales · Chat
                    </p>
                </div>
            </div>

            <div className="flex items-center justify-center gap-3 my-6 px-4">
                <div className="h-px w-24 bg-gradient-to-r from-transparent to-[#C4A882]"></div>
                <p className="font-playfair italic text-[#9B7B52] tracking-[0.14em] text-xs md:text-sm">— Main Menu —</p>
                <div className="h-px w-24 bg-gradient-to-l from-transparent to-[#C4A882]"></div>
            </div>

            <div className="max-w-5xl mx-auto px-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 w-full">

                <a href="#/analyze" onClick={(e) => handleNavigation(e, '/analyze')} className="group block">
                    <div className="relative flex flex-col items-center justify-center h-full min-h-[140px] p-5 bg-bakery-surface border border-bakery-border rounded-lg shadow-sm transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-lg group-hover:bg-[#FFF8E7] group-hover:border-[#8B5E3C]">
                        <span className="font-playfair italic text-xl text-bakery-textMain">Receipt</span>
                        <span className="font-zen font-bold tracking-widest mt-1 text-bakery-textMain">Receipt Analysis</span>
                        <span className="text-3xl mt-2">📸</span>
                        <span className="absolute bottom-2 right-2 bg-bakery-textMain text-bakery-gold font-bold text-[9px] px-2 py-0.5 rounded">OPEN</span>
                    </div>
                </a>

                <a href="#/customers" onClick={(e) => handleNavigation(e, '/customers')} className="group block">
                    <div className="relative flex flex-col items-center justify-center h-full min-h-[140px] p-5 bg-bakery-surface border border-bakery-border rounded-lg shadow-sm transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-lg group-hover:bg-[#FFF8E7] group-hover:border-[#8B5E3C]">
                        <span className="font-playfair italic text-xl text-bakery-textMain">Customers</span>
                        <span className="font-zen font-bold tracking-widest mt-1 text-bakery-textMain">Customer Management</span>
                        <span className="text-3xl mt-2">👥</span>
                        <span className="absolute bottom-2 right-2 bg-bakery-textMain text-bakery-gold font-bold text-[9px] px-2 py-0.5 rounded">OPEN</span>
                    </div>
                </a>

                <a href="#/dashboard" onClick={(e) => handleNavigation(e, '/dashboard')} className="group block">
                    <div className="relative flex flex-col items-center justify-center h-full min-h-[140px] p-5 bg-bakery-surface border border-bakery-border rounded-lg shadow-sm transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-lg group-hover:bg-[#FFF8E7] group-hover:border-[#8B5E3C]">
                        <span className="font-playfair italic text-xl text-bakery-textMain">Dashboard</span>
                        <span className="font-zen font-bold tracking-widest mt-1 text-bakery-textMain">Sales Dashboard</span>
                        <span className="text-3xl mt-2">📈</span>
                        <span className="absolute bottom-2 right-2 bg-bakery-textMain text-bakery-gold font-bold text-[9px] px-2 py-0.5 rounded">OPEN</span>
                    </div>
                </a>

                <a href="#/master" onClick={(e) => handleNavigation(e, '/master')} className="group block">
                    <div className="relative flex flex-col items-center justify-center h-full min-h-[140px] p-5 bg-bakery-surface border border-bakery-border rounded-lg shadow-sm transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-lg group-hover:bg-[#FFF8E7] group-hover:border-[#8B5E3C]">
                        <span className="font-playfair italic text-xl text-bakery-textMain">Menu</span>
                        <span className="font-zen font-bold tracking-widest mt-1 text-bakery-textMain">Master Settings</span>
                        <span className="text-3xl mt-2">📖</span>
                        <span className="absolute bottom-2 right-2 bg-bakery-textMain text-bakery-gold font-bold text-[9px] px-2 py-0.5 rounded">OPEN</span>
                    </div>
                </a>

                <a href="#/contact" onClick={(e) => handleNavigation(e, '/contact')} className="group block">
                    <div className="relative flex flex-col items-center justify-center h-full min-h-[140px] p-5 bg-bakery-surface border border-bakery-border rounded-lg shadow-sm transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-lg group-hover:bg-[#FFF8E7] group-hover:border-[#8B5E3C]">
                        <span className="font-playfair italic text-xl text-bakery-textMain">Chat</span>
                        <span className="font-zen font-bold tracking-widest mt-1 text-bakery-textMain">Business Chat</span>
                        <span className="text-3xl mt-2">💬</span>
                        <span className="absolute bottom-2 right-2 bg-bakery-textMain text-bakery-gold font-bold text-[9px] px-2 py-0.5 rounded">OPEN</span>
                    </div>
                </a>

                <a href="#/manual" onClick={(e) => handleNavigation(e, '/manual')} className="group block">
                    <div className="relative flex flex-col items-center justify-center h-full min-h-[140px] p-5 bg-bakery-surface border border-bakery-border rounded-lg shadow-sm transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-lg group-hover:bg-[#FFF8E7] group-hover:border-[#8B5E3C]">
                        <span className="font-playfair italic text-xl text-bakery-textMain">Manual</span>
                        <span className="font-zen font-bold tracking-widest mt-1 text-bakery-textMain">User Manual</span>
                        <span className="text-3xl mt-2">ℹ️</span>
                        <span className="absolute bottom-2 right-2 bg-bakery-textMain text-bakery-gold font-bold text-[9px] px-2 py-0.5 rounded">OPEN</span>
                    </div>
                </a>

            </div>
        </div>
    );
}