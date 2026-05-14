// src/App.tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import Customers from './pages/Customers';
import Master from './pages/Master';
import Analyze from './pages/Analyze'; // ← 追加

function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/analyze" element={<Analyze />} /> {/* ← 追加 */}
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/customers" element={<Customers />} />
          <Route path="/master" element={<Master />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}

export default App;