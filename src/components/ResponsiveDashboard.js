import React, { useState, useEffect } from 'react';
import { Box, Text } from '@chakra-ui/react';
import PremiumDashboard from '../pages/PremiumDashboard';
import MobileApp from '../pages/MobileApp';

// Error Boundary Component
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.log('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Box p="4" textAlign="center">
          <Text>Something went wrong. Please refresh the page.</Text>
        </Box>
      );
    }

    return this.props.children;
  }
}

const ResponsiveDashboard = () => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Mobile detection function
    const checkMobile = () => {
      const userAgent = navigator.userAgent || navigator.vendor || window.opera;
      const isMobileDevice = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
      const isSmallScreen = window.innerWidth <= 768;
      
      setIsMobile(isMobileDevice || isSmallScreen);
    };

    // Initial check
    checkMobile();
    
    // Listen for resize events
    window.addEventListener('resize', checkMobile);

    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // For mobile, render MobileApp without any wrapper
  if (isMobile) {
    return (
      <ErrorBoundary>
        <Box
          position="fixed"
          top="0"
          left="0"
          right="0"
          bottom="0"
          zIndex="9999"
          bg="transparent"
          m="0"
          p="0"
          w="100vw"
          h="100vh"
          overflow="visible"
          minW="100vw"
          minH="100vh"
          maxW="100vw"
          maxH="100vh"
        >
          <MobileApp />
        </Box>
      </ErrorBoundary>
    );
  }

  // For desktop, render PremiumDashboard normally
  return (
    <ErrorBoundary>
      <PremiumDashboard />
    </ErrorBoundary>
  );
};

export default ResponsiveDashboard;
