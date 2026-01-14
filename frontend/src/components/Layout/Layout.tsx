// src/components/Layout/Layout.tsx
import { Outlet } from 'react-router-dom';
import { Header, Sidebar } from './index';

const Layout = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;