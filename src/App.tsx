import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import LogSession from './pages/LogSession';
import Subjects from './pages/Subjects';
import History from './pages/History';
import Analytics from './pages/Analytics';
import Exams from './pages/Exams';
import Settings from './pages/Settings';
import Login from './pages/Login';
import { useStore } from './store/useStore';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { token } = useStore();
  return token ? <>{children}</> : <Navigate to="/login" />;
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/*"
          element={
            <PrivateRoute>
              <Layout>
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/log" element={<LogSession />} />
                  <Route path="/subjects" element={<Subjects />} />
                  <Route path="/history" element={<History />} />
                  <Route path="/analytics" element={<Analytics />} />
                  <Route path="/exams" element={<Exams />} />
                  <Route path="/settings" element={<Settings />} />
                </Routes>
              </Layout>
            </PrivateRoute>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
