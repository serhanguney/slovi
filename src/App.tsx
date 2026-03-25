import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/contexts/AuthContext';
import { ProtectedRoute } from '@/features/routes/ProtectedRoute';
import { PublicRoute } from '@/features/routes/PublicRoute';
import { LoginPage } from '@/pages/LoginPage';
import { SignupPage } from '@/pages/SignupPage';
import { HomePage } from '@/pages/HomePage';
import { PracticePage } from '@/pages/PracticePage';
import { SessionPage } from '@/pages/SessionPage';
import { WordDetailPage } from '@/pages/WordDetailPage';
import { AppShell } from '@/features/layout/AppShell';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Public routes - redirect to home if authenticated */}
            <Route element={<PublicRoute />}>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignupPage />} />
            </Route>

            {/* Protected routes - redirect to login if not authenticated */}
            <Route element={<ProtectedRoute />}>
              <Route element={<AppShell />}>
                <Route path="/" element={<HomePage />} />
                <Route path="/practice" element={<PracticePage />} />
              </Route>
              <Route path="/practice/session" element={<SessionPage />} />
              <Route path="/word/:id" element={<WordDetailPage />} />
            </Route>

            {/* Catch all - redirect to home */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
