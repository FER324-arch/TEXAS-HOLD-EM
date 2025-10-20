import React from 'react';
import { ThemeProvider } from '../theme/ThemeProvider';
import { useAuthStore } from '../store/authStore';
import { LoginScreen } from './LoginScreen';
import { HubScreen } from './HubScreen';
import { VsAiScreen } from './VsAiScreen';
import { HostScreen } from './HostScreen';
import { JoinScreen } from './JoinScreen';
import { TableScreen } from './TableScreen';
import { AdminScreen } from './AdminScreen';

type Route = '/' | '/hub' | '/vs-ai' | '/host' | '/join' | `/table/${string}` | '/admin';

export const App: React.FC = () => {
  const { token, profile } = useAuthStore();
  const [route, setRoute] = React.useState<Route>('/');
  const navigate = (path: Route) => setRoute(path);

  let content: React.ReactNode;

  if (!token) {
    content = <LoginScreen onNavigate={navigate} />;
  } else if (route === '/hub') {
    content = <HubScreen onNavigate={navigate} />;
  } else if (route === '/vs-ai') {
    content = <VsAiScreen onNavigate={navigate} />;
  } else if (route === '/host') {
    content = <HostScreen onNavigate={navigate} />;
  } else if (route === '/join') {
    content = <JoinScreen onNavigate={navigate} />;
  } else if (route.startsWith('/table/')) {
    content = <TableScreen roomId={route.split('/')[2]} onNavigate={navigate} />;
  } else if (route === '/admin' && profile?.role === 'admin') {
    content = <AdminScreen onNavigate={navigate} />;
  } else {
    content = <HubScreen onNavigate={navigate} />;
  }

  return <ThemeProvider>{content}</ThemeProvider>;
};
