import React from 'react';
import { Outlet } from 'react-router-dom';
import BottomNav from './BottomNav';

export const MainLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-background pb-20">
      <Outlet />
      <BottomNav />
    </div>
  );
};

export default MainLayout;
