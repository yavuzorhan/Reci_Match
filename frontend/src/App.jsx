import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import VerifyEmail from './pages/VerifyEmail';
import ProfileSetup from './pages/ProfileSetup';
import DislikedIngredients from './pages/DislikedIngredients';
import Dashboard from './pages/Dashboard';
import IngredientSelection from './pages/IngredientSelection';
import Pantry from './pages/Pantry';
import Recommendations from './pages/Recommendations';
import RecipeList from './pages/RecipeListDb';
import RecipeDetail from './pages/RecipeDetailDb';
import EditRecipe from './pages/EditRecipe';
import HealthyMenu from './pages/HealthyMenu';
import HealthyResults from './pages/HealthyResults';
import Favorites from './pages/FavoritesDb';
import WeeklyLogs from './pages/WeeklyLogs';
import ProfileEdit from './pages/ProfileEdit';

// PrivateRoute component
const PrivateRoute = ({ children }) => {
  const { user } = useApp();
  // If no user, redirect to Login
  if (!user) return <Navigate to="/login" replace />;
  return children;
};

const App = () => {
  return (
    <AppProvider>
      <Router>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          
          {/* Protected Routes */}
          <Route path="/setup" element={<PrivateRoute><ProfileSetup /></PrivateRoute>} />
          <Route path="/disliked" element={<PrivateRoute><DislikedIngredients /></PrivateRoute>} />
          <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
          <Route path="/select-ingredients" element={<PrivateRoute><IngredientSelection /></PrivateRoute>} />
          <Route path="/recommendations" element={<PrivateRoute><Recommendations /></PrivateRoute>} />
          <Route path="/pantry" element={<PrivateRoute><Pantry /></PrivateRoute>} />
          <Route path="/recipes" element={<PrivateRoute><RecipeList /></PrivateRoute>} />
          <Route path="/recipe/:id" element={<PrivateRoute><RecipeDetail /></PrivateRoute>} />
          <Route path="/recipes/:id/edit" element={<PrivateRoute><EditRecipe /></PrivateRoute>} />
          <Route path="/healthy-menu" element={<PrivateRoute><HealthyMenu /></PrivateRoute>} />
          <Route path="/healthy-menu/results" element={<PrivateRoute><HealthyResults /></PrivateRoute>} />
          <Route path="/healthy-menu/:id" element={<PrivateRoute><RecipeDetail /></PrivateRoute>} />
          <Route path="/favorites" element={<PrivateRoute><Favorites /></PrivateRoute>} />
          <Route path="/weekly-logs" element={<PrivateRoute><WeeklyLogs /></PrivateRoute>} />
          <Route path="/profile-edit" element={<PrivateRoute><ProfileEdit /></PrivateRoute>} />

          {/* Fallback */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Router>
    </AppProvider>
  );
};

export default App;
