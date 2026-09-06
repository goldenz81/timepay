import React from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  Badge,
  Icon,
  useColorModeValue,
  SimpleGrid,
  Tooltip
} from '@chakra-ui/react';
import {
  FiDollarSign,
  FiTrendingUp,
  FiTrendingDown,
  FiCheck,
  FiUsers,
  FiCode,
  FiFileText
} from 'react-icons/fi';

const TemplateSelector = ({ templates, selectedTemplate, onSelectTemplate }) => {
  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const selectedBorderColor = useColorModeValue('blue.300', 'blue.500');

  const templateIcons = {
    net_salary: FiDollarSign,
    entitlements: FiTrendingUp,
    deductions: FiTrendingDown
  };

  const templateColors = {
    net_salary: 'green',
    entitlements: 'blue',
    deductions: 'red'
  };

  return (
    <SimpleGrid columns={{ base: 1, md: 3 }} spacing={6}>
      {Object.values(templates).map((template) => {
        const isSelected = selectedTemplate?.id === template.id;
        const IconComponent = templateIcons[template.id];
        const color = templateColors[template.id];

        return (
          <Box
            key={template.id}
            p={6}
            bg={cardBg}
            borderWidth={2}
            borderColor={isSelected ? selectedBorderColor : borderColor}
            borderRadius="lg"
            cursor="pointer"
            transition="all 0.2s"
            _hover={{
              transform: 'translateY(-2px)',
              shadow: 'md'
            }}
            onClick={() => onSelectTemplate(template.id)}
            position="relative"
          >
            {isSelected && (
              <Box
                position="absolute"
                top={2}
                right={2}
                bg="blue.500"
                borderRadius="full"
                p={1}
              >
                <Icon as={FiCheck} color="white" boxSize={3} />
              </Box>
            )}

            <VStack spacing={4} align="stretch">
              {/* أيقونة القالب */}
              <HStack justify="center">
                <Box
                  p={3}
                  bg={`${color}.100`}
                  borderRadius="full"
                  color={`${color}.600`}
                >
                  <Icon as={IconComponent} boxSize={6} />
                </Box>
              </HStack>

              {/* اسم القالب */}
              <Text
                className="stake-heading-3"
                textAlign="center"
                color={isSelected ? 'blue.600' : 'inherit'}
              >
                {template.name}
              </Text>

              {/* وصف القالب */}
              <Text
                className="stake-text"
                textAlign="center"
                color="gray.600"
                fontSize="sm"
              >
                {template.description}
              </Text>

              {/* عدد الأعمدة */}
              <HStack justify="center" spacing={2}>
                <Icon as={FiFileText} boxSize={4} color="gray.500" />
                <Text className="stake-text" fontSize="sm" color="gray.600">
                  {template.columns.length} عمود
                </Text>
              </HStack>

              {/* المعادلات */}
              <VStack spacing={2} align="stretch">
                <Text className="stake-text" fontSize="xs" color="gray.500" textAlign="center">
                  المعادلات المضمنة:
                </Text>
                {template.columns
                  .filter(col => col.formula)
                  .slice(0, 2)
                  .map((col, index) => (
                    <Tooltip
                      key={index}
                      label={col.formula}
                      placement="top"
                      hasArrow
                    >
                      <Badge
                        colorScheme={color}
                        variant="subtle"
                        fontSize="xs"
                        textAlign="center"
                        p={1}
                      >
                        {col.name}
                      </Badge>
                    </Tooltip>
                  ))}
                {template.columns.filter(col => col.formula).length > 2 && (
                  <Text className="stake-text" fontSize="xs" color="gray.500" textAlign="center">
                    +{template.columns.filter(col => col.formula).length - 2} معادلة أخرى
                  </Text>
                )}
              </VStack>

              {/* زر التطبيق */}
              <Button
                colorScheme={color}
                variant={isSelected ? 'solid' : 'outline'}
                size="sm"
                leftIcon={<Icon as={FiCode} />}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectTemplate(template.id);
                }}
                className={isSelected ? 'stake-button-primary' : 'stake-button-secondary'}
              >
                {isSelected ? 'مطبق' : 'تطبيق القالب'}
              </Button>
            </VStack>
          </Box>
        );
      })}
    </SimpleGrid>
  );
};

export default TemplateSelector;
