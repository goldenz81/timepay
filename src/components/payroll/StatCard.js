import React from 'react';
import { Box, HStack, Text } from '@chakra-ui/react';

const ACCENTS = {
  emerald: { soft: 'rgba(16,185,129,0.20)', faint: 'rgba(16,185,129,0.05)', border: 'rgba(16,185,129,0.20)', text: '#6ee7b7' },
  blue: { soft: 'rgba(59,130,246,0.20)', faint: 'rgba(59,130,246,0.05)', border: 'rgba(59,130,246,0.20)', text: '#93c5fd' },
  violet: { soft: 'rgba(139,92,246,0.20)', faint: 'rgba(139,92,246,0.05)', border: 'rgba(139,92,246,0.20)', text: '#c4b5fd' },
  amber: { soft: 'rgba(245,158,11,0.20)', faint: 'rgba(245,158,11,0.05)', border: 'rgba(245,158,11,0.20)', text: '#fcd34d' },
};

export function StatCard({ label, value, sub, icon: Icon, accent = 'blue', active = false }) {
  const a = ACCENTS[accent] || ACCENTS.blue;
  return (
    <Box
      position="relative"
      overflow="hidden"
      borderRadius="20px"
      border="1px solid"
      borderColor={active ? 'rgba(16,185,129,0.4)' : '#1F2A44'}
      bg="#151E32"
      p="1px"
      boxShadow={active ? '0 0 24px rgba(16,185,129,0.15)' : undefined}
      w="100%"
    >
      <Box borderRadius="19px" bg="#151E32" p={5} h="100%" position="relative" overflow="hidden">
        <Box
          position="absolute"
          top="-64px"
          left="-64px"
          w="128px"
          h="128px"
          borderRadius="full"
          opacity={0.6}
          style={{ background: `linear-gradient(135deg, ${a.soft}, ${a.faint})`, filter: 'blur(28px)' }}
        />
        <Box position="relative">
          <HStack spacing={2} mb={3}>
            <Box
              w="36px"
              h="36px"
              borderRadius="12px"
              display="flex"
              alignItems="center"
              justifyContent="center"
              border="1px solid"
              borderColor={a.border}
              color={a.text}
              style={{ background: `linear-gradient(135deg, ${a.soft}, ${a.faint})` }}
            >
              {Icon ? <Icon size={16} /> : null}
            </Box>
            {active && (
              <Box
                as="span"
                px={2}
                py="2px"
                borderRadius="full"
                bg="rgba(16,185,129,0.15)"
                border="1px solid rgba(16,185,129,0.2)"
                fontSize="10px"
                fontWeight="bold"
                color="#6ee7b7"
              >
                نشط
              </Box>
            )}
          </HStack>
          <Box display="flex" alignItems="baseline" gap={2}>
            <Text fontSize="32px" fontWeight="extrabold" lineHeight="1" color="#fff">
              {value}
            </Text>
            <Text fontSize="13px" fontWeight="600" color="rgba(255,255,255,0.6)">
              {label}
            </Text>
          </Box>
          <Text mt="6px" fontSize="11px" color="rgba(255,255,255,0.4)">
            {sub}
          </Text>
        </Box>
        {active && (
          <Box
            position="absolute"
            bottom="0"
            left="0"
            right="0"
            h="1px"
            style={{ background: 'linear-gradient(to right, transparent, rgba(52,211,153,0.4), transparent)' }}
          />
        )}
      </Box>
    </Box>
  );
}

export default StatCard;
