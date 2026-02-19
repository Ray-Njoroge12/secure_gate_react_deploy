import React, { Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import AppShell from './AppShell';
import ProtectedRoute from '../routes/ProtectedRoute';
import Loading from '../components/ui/Loading';

const GuardLayout = () => {
    return (
        <ProtectedRoute allowedRoles={["guard"]}>
            <AppShell role="guard">
                <Suspense fallback={<Loading />}>
                    <Outlet />
                </Suspense>
            </AppShell>
        </ProtectedRoute>
    );
};

export default GuardLayout;
