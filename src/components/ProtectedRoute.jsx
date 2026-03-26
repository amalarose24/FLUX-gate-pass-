import { Navigate } from 'react-router-dom';

const ProtectedRoute = ({ children, allowedRoles }) => {
    const currentUserStr = localStorage.getItem('currentUser');
    const token = localStorage.getItem('authToken');

    if (!currentUserStr || !token) {
        // Not logged in
        return <Navigate to="/login" replace />;
    }

    try {
        const user = JSON.parse(currentUserStr);

        if (allowedRoles && !allowedRoles.includes(user.role)) {
            // Logged in but doesn't have the right role -> redirect to their own dashboard
            if (user.role === 'student') return <Navigate to="/student" replace />;
            if (user.role === 'faculty') return <Navigate to="/faculty" replace />;
            if (user.role === 'warden') return <Navigate to="/warden" replace />;
            if (user.role === 'office') return <Navigate to="/office" replace />;
            if (user.role === 'non-teaching') return <Navigate to="/non-teaching" replace />;
            if (user.role === 'guard') return <Navigate to="/guard" replace />;

            return <Navigate to="/login" replace />;
        }

        return children;
    } catch (error) {
        // Corrupt session
        localStorage.removeItem('currentUser');
        localStorage.removeItem('authToken');
        return <Navigate to="/login" replace />;
    }
};

export default ProtectedRoute;
