import React from 'react';
import { ChakraProvider as BaseChakraProvider } from '@chakra-ui/react';
import theme from '../chakra-config';

const ChakraProvider = ({ children }) => {
  return (
    <BaseChakraProvider theme={theme}>
      {children}
    </BaseChakraProvider>
  );
};

export default ChakraProvider;
