import React, { useEffect } from 'react';
import { useSettings } from '../contexts/SettingsContext';
import { applySystemFont } from '../utils/fontFamilyHelper';

const FontApplier = () => {
  const { settings } = useSettings();

  useEffect(() => {
    if (settings?.fontFamily) {
      const applied = applySystemFont(settings.fontFamily);
      console.log('FontApplier: Applied font:', applied);
    }
  }, [settings?.fontFamily]);

  return null;
};

export default FontApplier;
