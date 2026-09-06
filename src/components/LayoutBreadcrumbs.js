import React from 'react';
import { useNavigate } from 'react-router-dom';

const LayoutBreadcrumbs = ({ items = [] }) => {
  const navigate = useNavigate();
  if (!items?.length) return null;

  return (
    <span className="tp-main-header__crumbs-text" aria-label="مسار الصفحة">
      {items.map((item, i) => {
        const isLast = i === items.length - 1;
        const clickable = !isLast && item.path;

        return (
          <React.Fragment key={`${item.label}-${i}`}>
            {i > 0 && ' / '}
            {clickable ? (
              <button type="button" onClick={() => navigate(item.path)}>
                {item.label}
              </button>
            ) : (
              <span>{item.label}</span>
            )}
          </React.Fragment>
        );
      })}
    </span>
  );
};

export default LayoutBreadcrumbs;
