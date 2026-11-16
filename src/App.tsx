import { Navigate, Route, Routes } from 'react-router-dom';
import AppLayout from './components/AppLayout/AppLayout';
import Dashboard from './pages/admin/Dashboard';
import SessionDetail from './pages/admin/SessionDetail';
import CheckIn from './pages/student/CheckIn';
import JoinSession from './pages/student/JoinSession';
import NotFound from './pages/NotFound';

export default function App() {
  return (
    <Routes>
      {/* Lecturer / admin area */}
      <Route element={<AppLayout />}>
        <Route index element={<Navigate to="/admin" replace />} />
        <Route path="admin" element={<Dashboard />} />
        <Route path="admin/sessions/:code" element={<SessionDetail />} />
      </Route>

      {/* Student portal (opened from the QR code on a phone) */}
      <Route path="checkin" element={<JoinSession />} />
      <Route path="checkin/:code" element={<CheckIn />} />

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
