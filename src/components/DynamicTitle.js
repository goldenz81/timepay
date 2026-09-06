import React, { useEffect } from 'react';
import { useSettings } from '../contexts/SettingsContext';

const DynamicTitle = () => {
  const { settings, isLoading } = useSettings();

  useEffect(() => {
    if (!isLoading && settings) {
      const systemName = settings.systemName || 'TimePay';
      const companyName = settings.companyName || 'شركة TimePay';
      
      // Create dynamic title: "System Name - Company Name"
      const dynamicTitle = `${systemName} - ${companyName}`;
      
      // Update document title
      document.title = dynamicTitle;
      
      // Update meta description
      const metaDescription = document.querySelector('meta[name="description"]');
      if (metaDescription) {
        metaDescription.setAttribute('content', `${systemName} - ${companyName} - نظام إدارة الحضور والرواتب`);
      }
      
      // Update manifest link to force refresh (disabled temporarily)
      // const manifestLink = document.querySelector('link[rel="manifest"]');
      // if (manifestLink) {
      //   // Add timestamp to force manifest refresh
      //   const timestamp = new Date().getTime();
      //   manifestLink.href = `/api/dynamic_manifest.php?t=${timestamp}`;
      // }
      
      console.log('Dynamic title and manifest updated:', dynamicTitle);
    }
  }, [settings, isLoading]);

  // This component doesn't render anything
  return null;
};

export default DynamicTitle;
