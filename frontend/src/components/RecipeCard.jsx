import React from 'react';
import { ChefHat, Heart, Pencil, Trash2, Flame, UtensilsCrossed, Clock3, BookOpen, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { buildRecipeShortSummary, getHealthGrade, getHealthTone } from '../utils/recipeInsights';
import './RecipeCard.css';

const Metric = ({ icon = null, label, value, color = 'var(--text-primary)' }) => (
  <div className="recipes-metric">
    <small>{icon}{label}</small>
    <strong style={{ color }}>{value}</strong>
  </div>
);

const RecipeCard = ({
  recipe,
  isFavorite,
  onFavorite,
  isOwner,
  onEdit,
  onDelete,
  onClick
}) => {
  const navigate = useNavigate();
  const hasHealthScore = recipe.health_score != null && Number(recipe.health_score) > 0;
  const grade = hasHealthScore ? getHealthGrade(Number(recipe.health_score)).split(' ')[0] : '-';
  const gradeColor = hasHealthScore ? getHealthTone(Number(recipe.health_score)).chip : 'var(--text-secondary)';

  const handleClick = () => {
    if (onClick) {
      onClick(recipe);
    } else {
      navigate(`/recipe/${recipe.id}`);
    }
  };

  return (
    <article className="recipes-card recipes-glass" onClick={handleClick}>
      <div className="recipes-card-media">
        {recipe.image_url ? (
          <img src={recipe.image_url} alt={recipe.name} />
        ) : (
          <div className="recipes-card-fallback">
            <ChefHat size={48} />
          </div>
        )}
        <div className="recipes-media-overlay" />
        <div className="recipes-card-badges">
          {(recipe.match_score || recipe.score) ? (
            <span className="match-badge">{Math.round(recipe.match_score || recipe.score)}% Eşleşme</span>
          ) : null}
          {recipe.cooking_type && (
            <span>{recipe.cooking_type}</span>
          )}
        </div>

        <button
          type="button"
          className={`recipes-heart ${isFavorite ? 'active' : ''}`}
          onClick={(event) => {
            event.stopPropagation();
            if (onFavorite) onFavorite(event, recipe.id);
          }}
          aria-label={isFavorite ? 'Favorilerden çıkar' : 'Favorilere ekle'}
        >
          <Heart size={18} fill={isFavorite ? 'currentColor' : 'none'} />
        </button>

        {isOwner && (
          <div className="recipes-owner-actions">
            {onEdit && (
              <button
                type="button"
                aria-label="Tarifi düzenle"
                onClick={(event) => {
                  event.stopPropagation();
                  onEdit(event, recipe.id);
                }}
              >
                <Pencil size={15} />
              </button>
            )}
            {onDelete && (
              <button
                type="button"
                aria-label="Tarifi sil"
                onClick={(event) => {
                  event.stopPropagation();
                  onDelete(event, recipe.id);
                }}
              >
                <Trash2 size={15} />
              </button>
            )}
          </div>
        )}
      </div>

      <div className="recipes-card-body">
        <div>
          <h2>{recipe.name}</h2>
          <p>{buildRecipeShortSummary(recipe) || recipe.description || "Kısa açıklama bulunmuyor."}</p>
        </div>

        <div className="recipes-metrics">
          <Metric icon={<Flame size={13} />} label="Kalori" value={recipe.calorie ? Math.round(recipe.calorie) : '-'} />
          <Metric icon={<UtensilsCrossed size={13} />} label="Protein" value={recipe.protein ? `${Math.round(recipe.protein)}g` : '-'} />
          <Metric icon={<Clock3 size={13} />} label="Süre" value={`${recipe.total_time_minutes || recipe.preparation_time_minutes || 25} dk`} />
          <Metric label="Kalite" value={grade} color={gradeColor} />
        </div>

        <button type="button" className="recipes-detail-button">
          <BookOpen size={16} />
          Tarifi İncele
          <ChevronRight size={17} />
        </button>
      </div>
    </article>
  );
};

export default RecipeCard;
