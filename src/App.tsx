// 👇 BrowserRouter を HashRouter に変更
import { HashRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import Customers from './pages/Customers';
import Master from './pages/Master';
import Analyze from './pages/Analyze';
import MobileCamera from './pages/MobileCamera';

function App() {
  return (
    // 👇 ここも HashRouter に変更
    <HashRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/analyze" element={<Analyze />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/customers" element={<Customers />} />
          <Route path="/master" element={<Master />} />
          <Route path="/mobile" element={<MobileCamera />} />
        </Routes>
      </Layout>
    </HashRouter>
  );
}

export default App;