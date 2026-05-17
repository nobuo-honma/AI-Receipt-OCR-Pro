/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                zen: ['"Zen Kaku Gothic New"', 'sans-serif'],
                playfair: ['"Playfair Display"', 'serif'],
            },
            colors: {
                bakery: {
                    bg: '#F5EDD6',       /* 背景のクリーム色 */
                    surface: '#FDF0D5',  /* カードの表面色 */
                    border: '#E0C898',   /* 枠線の色 */
                    textMain: '#3D2B1F', /* メインの文字色（濃い茶色） */
                    primary: '#6B4226',  /* ボタンなどのメインカラー */
                    gold: '#D4A96A',     /* アクセントのゴールド */
                    danger: '#C0392B',   /* 削除ボタンなどの赤色 */
                }
            },
            backgroundImage: {
                // 全体の背景にかけるうっすらとした柄
                'pattern': "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23C4A882' fill-opacity='0.07'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/svg%3E\")",
                // ホーム画面上部のグラデーション
                'hero-gradient': "linear-gradient(135deg, #3D2B1F 0%, #6B4226 50%, #8B5E3C 100%)",
                // メニューカードのグラデーション
                'card-wide': "linear-gradient(135deg, #FDF0D5 60%, #EDD9A3 100%)",
                'card-wide-hover': "linear-gradient(135deg, #FFF8E7 60%, #F5E6B5 100%)",
            }
        },
    },
    plugins: [],
}