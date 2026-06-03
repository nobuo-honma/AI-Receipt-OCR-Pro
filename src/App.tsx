// src/App.tsx
import { HashRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import Customers from './pages/Customers';
import Master from './pages/Master';
import Analyze from './pages/Analyze';
import MobileCamera from './pages/MobileCamera';
import Contact from './pages/Contact';
import Production from './pages/Production'; // ⭐️ 追加
import Manual from './pages/Manual';

export default function App() {
  return (
    <HashRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/analyze" element={<Analyze />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/customers" element={<Customers />} />
          <Route path="/master" element={<Master />} />
          <Route path="/mobile" element={<MobileCamera />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/production" element={<Production />} />
          <Route path="/manual" element={<Manual />} />
        </Routes>
      </Layout>
    </HashRouter>
  );
}