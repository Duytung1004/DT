import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import DashboardLayout from "./layouts/DashboardLayout";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import Tasks from "./pages/Tasks";
import CreateTask from "./pages/CreateTask";
import Documents from "./pages/Documents";
import TaskChats from "./pages/TaskChats";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminSettings from "./pages/admin/AdminSettings";
import AdminUnits from "./pages/admin/AdminUnits";
import AdminRoles from "./pages/admin/AdminRoles";
import AdminTaskStatuses from "./pages/admin/AdminTaskStatuses";
import AdminSystemInfo from "./pages/admin/AdminSystemInfo";
import AdminSecurity from "./pages/admin/AdminSecurity";
import AdminAuditLogs from "./pages/admin/AdminAuditLogs";
import Reports from "./pages/Reports";
import Profile from "./pages/Profile";
import EmployeeReports from "./pages/EmployeeReports";
import Analytics from "./pages/Analytics";
import Trash from "./pages/Trash";
import Archives from "./pages/Archives";
function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Vào web mặc định ra login */}
        <Route
          path="/"
          element={<Navigate to="/login" replace />}
        />

        {/* Login */}
        <Route path="/login" element={<Login />} />

        {/* Giao diện user thường */}
        <Route path="/app" element={<DashboardLayout />}>
          <Route index element={<Dashboard />} />

          <Route path="tasks">
            <Route index element={<Tasks />} />
            <Route path="create" element={<CreateTask />} />
          </Route>
        
          <Route path="documents" element={<Documents />} />
          <Route path="archives" element={<Archives />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="reports" element={<Reports />} />
          <Route path="trash" element={<Trash />} />
          <Route
  path="employee-reports"
  element={<EmployeeReports />}
/>
          <Route path="chat" element={<TaskChats />} />
          <Route path="profile" element={<Profile />} />
          
        </Route>

        {/* Giao diện admin */}
        <Route path="/admin" element={<DashboardLayout />}>
          <Route
            index
            element={<Navigate to="/admin/users" replace />}
          />

          <Route path="users" element={<AdminUsers />} />
          <Route path="settings" element={<AdminSettings />} />
          <Route path="units" element={<AdminUnits />} />
          <Route path="roles" element={<AdminRoles />} />
          <Route path="statuses" element={<AdminTaskStatuses />} />
          <Route path="system-info" element={<AdminSystemInfo />} />
          <Route path="security" element={<AdminSecurity />} />
          <Route path="audit-logs" element={<AdminAuditLogs />} />
          <Route path="profile" element={<Profile />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;