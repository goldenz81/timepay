import { extendTheme } from '@chakra-ui/react';

// RTL support configuration
const direction = 'rtl';

// Custom theme with RTL support and Arabic fonts
const theme = extendTheme({
  direction,
  fonts: {
    heading: `'Cairo', 'Almarai', 'Tajawal', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif`,
    body: `'Cairo', 'Almarai', 'Tajawal', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif`,
  },
  colors: {
    brand: {
      50: '#e6f3ff',
      100: '#b3d9ff',
      200: '#80bfff',
      300: '#4da6ff',
      400: '#1a8cff',
      500: '#0066cc',
      600: '#0052a3',
      700: '#003d7a',
      800: '#002952',
      900: '#001429',
    },
    primary: {
      50: '#f0f9ff',
      100: '#e0f2fe',
      200: '#bae6fd',
      300: '#7dd3fc',
      400: '#38bdf8',
      500: '#0ea5e9',
      600: '#0284c7',
      700: '#0369a1',
      800: '#075985',
      900: '#0c4a6e',
    },
    secondary: {
      50: '#f8fafc',
      100: '#f1f5f9',
      200: '#e2e8f0',
      300: '#cbd5e1',
      400: '#94a3b8',
      500: '#64748b',
      600: '#475569',
      700: '#334155',
      800: '#1e293b',
      900: '#0f172a',
    },
    accent: {
      50: '#fdf4ff',
      100: '#fae8ff',
      200: '#f5d0fe',
      300: '#f0abfc',
      400: '#e879f9',
      500: '#d946ef',
      600: '#c026d3',
      700: '#a21caf',
      800: '#86198f',
      900: '#701a75',
    },
    success: {
      50: '#f0fdf4',
      100: '#dcfce7',
      200: '#bbf7d0',
      300: '#86efac',
      400: '#4ade80',
      500: '#22c55e',
      600: '#16a34a',
      700: '#15803d',
      800: '#166534',
      900: '#14532d',
    },
    warning: {
      50: '#fffbeb',
      100: '#fef3c7',
      200: '#fde68a',
      300: '#fcd34d',
      400: '#fbbf24',
      500: '#f59e0b',
      600: '#d97706',
      700: '#b45309',
      800: '#92400e',
      900: '#78350f',
    },
    error: {
      50: '#fef2f2',
      100: '#fee2e2',
      200: '#fecaca',
      300: '#fca5a5',
      400: '#f87171',
      500: '#ef4444',
      600: '#dc2626',
      700: '#b91c1c',
      800: '#991b1b',
      900: '#7f1d1d',
    },
    info: {
      50: '#eff6ff',
      100: '#dbeafe',
      200: '#bfdbfe',
      300: '#93c5fd',
      400: '#60a5fa',
      500: '#3b82f6',
      600: '#2563eb',
      700: '#1d4ed8',
      800: '#1e40af',
      900: '#1e3a8a',
    },
    gray: {
      50: '#f9fafb',
      100: '#f3f4f6',
      200: '#e5e7eb',
      300: '#d1d5db',
      400: '#9ca3af',
      500: '#6b7280',
      600: '#4b5563',
      700: '#374151',
      800: '#1f2937',
      900: '#111827',
    },
  },
  components: {
    Button: {
      baseStyle: {
        fontWeight: '600',
        borderRadius: 'xl',
        transition: 'all 0.2s ease',
        _focus: {
          boxShadow: '0 0 0 3px rgba(14, 165, 233, 0.3)',
        },
      },
      variants: {
        solid: {
          bg: 'linear-gradient(135deg, primary.500 0%, primary.600 100%)',
          color: 'white',
          boxShadow: '0 4px 14px 0 rgba(14, 165, 233, 0.3)',
          _hover: {
            bg: 'linear-gradient(135deg, primary.600 0%, primary.700 100%)',
            boxShadow: '0 6px 20px 0 rgba(14, 165, 233, 0.4)',
            transform: 'translateY(-1px)',
            _disabled: {
              bg: 'primary.300',
              transform: 'none',
              boxShadow: 'none',
            },
          },
          _active: {
            transform: 'translateY(0)',
          },
        },
        outline: {
          borderColor: 'primary.500',
          color: 'primary.500',
          borderWidth: '2px',
          _hover: {
            bg: 'primary.50',
            borderColor: 'primary.600',
            color: 'primary.600',
            transform: 'translateY(-1px)',
            boxShadow: '0 4px 12px 0 rgba(14, 165, 233, 0.2)',
          },
        },
        ghost: {
          color: 'primary.500',
          _hover: {
            bg: 'primary.50',
            color: 'primary.600',
            transform: 'translateY(-1px)',
          },
        },
        gradient: {
          bg: 'linear-gradient(135deg, primary.500 0%, accent.500 100%)',
          color: 'white',
          boxShadow: '0 4px 14px 0 rgba(14, 165, 233, 0.3)',
          _hover: {
            bg: 'linear-gradient(135deg, primary.600 0%, accent.600 100%)',
            boxShadow: '0 6px 20px 0 rgba(14, 165, 233, 0.4)',
            transform: 'translateY(-1px)',
          },
        },
      },
    },
    Card: {
      baseStyle: {
        container: {
          borderRadius: '2xl',
          boxShadow: '0 10px 25px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
          border: '1px solid',
          borderColor: 'gray.100',
          bg: 'white',
          transition: 'all 0.3s ease',
          _hover: {
            boxShadow: '0 20px 40px -4px rgba(0, 0, 0, 0.1), 0 8px 16px -4px rgba(0, 0, 0, 0.06)',
            transform: 'translateY(-2px)',
          },
          _dark: {
            borderColor: 'gray.700',
            bg: 'gray.800',
          },
        },
      },
      variants: {
        elevated: {
          container: {
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            border: 'none',
          },
        },
        gradient: {
          container: {
            bg: 'linear-gradient(135deg, white 0%, gray.50 100%)',
            border: 'none',
            _dark: {
              bg: 'linear-gradient(135deg, gray.800 0%, gray.900 100%)',
            },
          },
        },
      },
    },
    Table: {
      baseStyle: {
        table: {
          fontFamily: 'body',
          borderRadius: 'xl',
          overflow: 'hidden',
        },
        th: {
          fontWeight: '700',
          textTransform: 'none',
          letterSpacing: 'normal',
          borderColor: 'gray.100',
          bg: 'gray.50',
          color: 'gray.700',
          fontSize: 'sm',
          py: '4',
          px: '6',
          _dark: {
            borderColor: 'gray.700',
            bg: 'gray.800',
            color: 'gray.200',
          },
        },
        td: {
          borderColor: 'gray.100',
          py: '4',
          px: '6',
          _dark: {
            borderColor: 'gray.700',
          },
        },
        tbody: {
          tr: {
            _hover: {
              bg: 'gray.50',
              _dark: {
                bg: 'gray.800',
              },
            },
          },
        },
      },
    },
    Input: {
      baseStyle: {
        field: {
          borderRadius: 'xl',
          borderWidth: '2px',
          borderColor: 'gray.200',
          bg: 'white',
          transition: 'all 0.2s ease',
          _hover: {
            borderColor: 'gray.300',
          },
          _focus: {
            borderColor: 'primary.500',
            boxShadow: '0 0 0 3px rgba(14, 165, 233, 0.1)',
            bg: 'white',
          },
          _dark: {
            bg: 'gray.800',
            borderColor: 'gray.600',
            _hover: {
              borderColor: 'gray.500',
            },
            _focus: {
              borderColor: 'primary.500',
              bg: 'gray.800',
            },
          },
        },
      },
    },
    Select: {
      baseStyle: {
        field: {
          borderRadius: 'xl',
          borderWidth: '2px',
          borderColor: 'gray.200',
          bg: 'white',
          transition: 'all 0.2s ease',
          _hover: {
            borderColor: 'gray.300',
          },
          _focus: {
            borderColor: 'primary.500',
            boxShadow: '0 0 0 3px rgba(14, 165, 233, 0.1)',
            bg: 'white',
          },
          _dark: {
            bg: 'gray.800',
            borderColor: 'gray.600',
            _hover: {
              borderColor: 'gray.500',
            },
            _focus: {
              borderColor: 'primary.500',
              bg: 'gray.800',
            },
          },
        },
      },
    },
    Textarea: {
      baseStyle: {
        borderRadius: 'xl',
        borderWidth: '2px',
        borderColor: 'gray.200',
        bg: 'white',
        transition: 'all 0.2s ease',
        _hover: {
          borderColor: 'gray.300',
        },
        _focus: {
          borderColor: 'primary.500',
          boxShadow: '0 0 0 3px rgba(14, 165, 233, 0.1)',
          bg: 'white',
        },
        _dark: {
          bg: 'gray.800',
          borderColor: 'gray.600',
          _hover: {
            borderColor: 'gray.500',
          },
          _focus: {
            borderColor: 'primary.500',
            bg: 'gray.800',
          },
        },
      },
    },
    Modal: {
      baseStyle: {
        dialog: {
          borderRadius: '2xl',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        },
        header: {
          borderBottom: '1px solid',
          borderColor: 'gray.200',
          _dark: {
            borderColor: 'gray.700',
          },
        },
        body: {
          py: '6',
        },
        footer: {
          borderTop: '1px solid',
          borderColor: 'gray.200',
          _dark: {
            borderColor: 'gray.700',
          },
        },
      },
    },
    Drawer: {
      baseStyle: {
        dialog: {
          borderRadius: '2xl',
        },
      },
    },
    Badge: {
      baseStyle: {
        borderRadius: 'full',
        fontWeight: '600',
        px: '3',
        py: '1',
        fontSize: 'xs',
      },
      variants: {
        solid: {
          // لا نحدد bg هنا ليسمح لـ colorScheme بالعمل
          color: 'white',
        },
        outline: {
          // لا نحدد borderColor هنا ليسمح لـ colorScheme بالعمل
          borderWidth: '2px',
        },
      },
    },
    Stat: {
      baseStyle: {
        container: {
          bg: 'white',
          borderRadius: '2xl',
          p: '6',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
          border: '1px solid',
          borderColor: 'gray.100',
          transition: 'all 0.3s ease',
          _hover: {
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
            transform: 'translateY(-2px)',
          },
          _dark: {
            bg: 'gray.800',
            borderColor: 'gray.700',
          },
        },
        label: {
          fontWeight: '600',
          color: 'gray.600',
          fontSize: 'sm',
          _dark: {
            color: 'gray.400',
          },
        },
        number: {
          fontWeight: '800',
          color: 'gray.900',
          fontSize: '2xl',
          _dark: {
            color: 'white',
          },
        },
        helpText: {
          color: 'gray.500',
          fontSize: 'sm',
          _dark: {
            color: 'gray.400',
          },
        },
      },
    },
  },
  styles: {
    global: {
      body: {
        bg: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
        color: 'gray.800',
        fontFamily: 'body',
        direction: 'rtl',
        minHeight: '100vh',
      },
      '*': {
        borderColor: 'gray.200',
      },
      'html, body': {
        scrollBehavior: 'smooth',
      },
      '::-webkit-scrollbar': {
        width: '8px',
      },
      '::-webkit-scrollbar-track': {
        bg: 'gray.100',
        borderRadius: '4px',
      },
      '::-webkit-scrollbar-thumb': {
        bg: 'gray.300',
        borderRadius: '4px',
        _hover: {
          bg: 'gray.400',
        },
      },
      _dark: {
        body: {
          bg: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
          color: 'gray.100',
        },
        '*': {
          borderColor: 'gray.700',
        },
        '::-webkit-scrollbar-track': {
          bg: 'gray.800',
        },
        '::-webkit-scrollbar-thumb': {
          bg: 'gray.600',
          _hover: {
            bg: 'gray.500',
          },
        },
      },
    },
  },
  config: {
    initialColorMode: 'light',
    useSystemColorMode: false,
  },
});

export default theme;
