import React from 'react';
import {
  Box,
  Card,
  CardHeader,
  CardBody,
  Heading,
  Text,
  VStack,
  HStack,
  Flex,
  Switch as CSwitch,
  Center,
  Spinner,
} from '@chakra-ui/react';

export const inputFieldProps = {
  className: 'stake-input tp-settings-field',
};

export const selectFieldProps = {
  ...inputFieldProps,
};

export function SettingsActionsBar({ hint, children }) {
  return (
    <Flex
      className="tp-settings-actions"
      align={{ base: 'stretch', md: 'center' }}
      direction={{ base: 'column', md: 'row' }}
      justify="space-between"
    >
      {hint && <Box className="tp-settings-actions__hint">{hint}</Box>}
      {children}
    </Flex>
  );
}

export function SectionCard({ accent = 'identity', icon, title, subtitle, children }) {
  return (
    <Card className={`tp-settings-section-card tp-settings-section-card--${accent}`} overflow="hidden" h="100%">
      <CardHeader py={4}>
        <HStack spacing={3} align="flex-start">
          <Flex className="tp-settings-section-card__icon" aria-hidden>
            {typeof icon === 'string' ? (
              <Text fontSize="lg">{icon}</Text>
            ) : (
              <Box as={icon} />
            )}
          </Flex>
          <VStack align="start" spacing={0.5} flex={1}>
            <Heading className="tp-settings-section-card__title" size="sm">
              {title}
            </Heading>
            {subtitle && <Text className="tp-settings-section-card__subtitle">{subtitle}</Text>}
          </VStack>
        </HStack>
      </CardHeader>
      <CardBody>{children}</CardBody>
    </Card>
  );
}

export function SettingToggleRow({ label, description, isChecked, onChange, colorScheme = 'purple' }) {
  return (
    <Flex
      className="tp-settings-toggle-row"
      align={{ base: 'stretch', sm: 'center' }}
      direction={{ base: 'column', sm: 'row' }}
      justify="space-between"
    >
      <VStack align="start" spacing={1} flex={1}>
        <Text className="tp-settings-toggle-row__label">{label}</Text>
        {description && <Text className="tp-settings-toggle-row__desc">{description}</Text>}
      </VStack>
      <CSwitch
        isChecked={isChecked}
        onChange={onChange}
        colorScheme={colorScheme}
        size="lg"
        alignSelf={{ base: 'flex-end', sm: 'center' }}
      />
    </Flex>
  );
}

export function SettingsTabLoading({ message = 'جاري التحميل...' }) {
  return (
    <Center className="tp-settings-loading" p="12">
      <VStack spacing="4">
        <Spinner size="lg" color="purple.400" thickness="3px" />
        <Text color="var(--stake-text-primary)">{message}</Text>
      </VStack>
    </Center>
  );
}
