import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import AddRecipeForm from '../components/AddRecipeForm';
import Layout from '../components/Layout';
import { useApp } from '../context/AppContext';

const EditRecipe = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, fetchRecipeById } = useApp();
  const [recipe, setRecipe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const run = async () => {
      try {
        const data = await fetchRecipeById(id);
        if (data.user_id !== user?.id) {
          setError('Bu tarif size ait degil.');
          return;
        }
        setRecipe(data);
      } catch (err) {
        setError(err.message || 'Tarif yuklenemedi.');
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [fetchRecipeById, id, user]);

  return (
    <Layout>
      {loading && <div className="card">Yukleniyor...</div>}
      {error && <div className="card" style={{ color: '#dc2626' }}>{error}</div>}
      {recipe && (
        <AddRecipeForm
          initialRecipe={recipe}
          onCancel={() => navigate(`/recipe/${id}`)}
          onSuccess={() => navigate(`/recipe/${id}`)}
        />
      )}
    </Layout>
  );
};

export default EditRecipe;
