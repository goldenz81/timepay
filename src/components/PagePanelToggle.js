import React, { useCallback, useState } from 'react';
import { Box, IconButton } from '@chakra-ui/react';
import { FiEye, FiEyeOff } from 'react-icons/fi';

const HINT_STORAGE_KEY = 'tp_page_panel_toggle_hint_dismissed';

/**
 * زر إظهار/إخفاء هيدر الصفحة (عنوان + فلاتر).
 * variant="table" — داخل شريط عنوان الجدول
 * variant="breadcrumb" — شريط التنقل العلوي
 */
export default function PagePanelToggle({
  collapsed,
  onToggle,
  variant = 'table',
  className = '',
}) {
  const [hintActive, setHintActive] = useState(() => {
    try {
      return localStorage.getItem(HINT_STORAGE_KEY) !== '1';
    } catch {
      return true;
    }
  });

  const showLabel = 'إظهار عنوان الصفحة والفلاتر';
  const hideLabel = 'إخفاء عنوان الصفحة والفلاتر';
  const isTable = variant === 'table';
  const iconSize = isTable ? 18 : 20;

  const handleClick = useCallback(() => {
    if (!collapsed) {
      setHintActive(false);
      try {
        localStorage.setItem(HINT_STORAGE_KEY, '1');
      } catch {
        /* ignore */
      }
    }
    onToggle();
  }, [collapsed, onToggle]);

  const showHideHint = hintActive && !collapsed;

  return (
    <IconButton
      aria-label={collapsed ? showLabel : hideLabel}
      aria-expanded={!collapsed}
      onClick={handleClick}
      variant="ghost"
      size={isTable ? 'sm' : 'md'}
      flexShrink={0}
      borderRadius={isTable ? 'md' : 'lg'}
      icon={
        <Box className="tp-header-panel-toggle__icons" aria-hidden="true">
          <Box
            as="span"
            className={`tp-header-panel-toggle__icon${collapsed ? ' is-visible' : ' is-hidden'}`}
          >
            <FiEye size={iconSize} />
          </Box>
          <Box
            as="span"
            className={`tp-header-panel-toggle__icon${collapsed ? ' is-hidden' : ' is-visible'}`}
          >
            <FiEyeOff size={iconSize} />
          </Box>
        </Box>
      }
      className={`tp-header-panel-toggle${isTable ? ' tp-table-panel-toggle' : ' tp-breadcrumb-panel-toggle'}${showHideHint ? ' tp-header-panel-toggle--hint' : ''}${className ? ` ${className}` : ''}`}
    />
  );
}
