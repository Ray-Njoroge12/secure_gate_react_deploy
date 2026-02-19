import React, { Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import AppShell from './AppShell';
import ProtectedRoute from '../routes/ProtectedRoute';
import Loading from '../components/ui/Loading';

const AdminLayout = () => {
    return (
        <ProtectedRoute allowedRoles={["admin", "super_admin"]}>
            <AppShell role="admin">
                <Suspense fallback={<Loading />}>
                    <Outlet />
                </Suspense>
            </AppShell>
        </ProtectedRoute>
    );
};

export default AdminLayout;
