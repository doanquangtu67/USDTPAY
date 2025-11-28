import React from 'react';
import { StoreProvider, useStore } from './contexts/StoreContext';
import { Auth } from './pages/Auth';
import { AdminDashboard } from './pages/AdminDashboard';
import { UserDashboard } from './pages/UserDashboard';
import { UserRole } from './types';

const AppContent: React.FC = () => {
  const { currentUser } = useStore();

  if (!currentUser) {
    return <Auth />;
  }

  if (currentUser.role === UserRole.ADMIN) {
    return <AdminDashboard />;
  }

  return <UserDashboard />;
};

const App: React.FC = () => {
  return (
    <StoreProvider>
      <AppContent />
    </StoreProvider>
  );
};

export default App;
