import React, { useState, useEffect } from 'react';
import { getApiUrl, getApiBaseUrl } from '../utils/apiUrlHelper';
import {
  Box,
  VStack,
  Text,
  Button,
  Input,
  InputGroup,
  InputRightElement,
  InputLeftElement,
  FormControl,
  FormLabel,
  IconButton,
  useToast,
  Alert,
  AlertIcon,
  AlertDescription,
  Icon,
  Image,
} from '@chakra-ui/react';
import { FiUser, FiLock, FiEye, FiEyeOff } from 'react-icons/fi';

const Login = ({ onLogin }) => {
  const [formData, setFormData] = useState({ username: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [systemName, setSystemName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [loginBgImage, setLoginBgImage] = useState('');
  const [loginBgMode, setLoginBgMode] = useState('cover');
  const [loginBgOpacity, setLoginBgOpacity] = useState(100);
  const [systemVersion, setSystemVersion] = useState('');
  const toast = useToast();

  useEffect(() => {
    document.body.style.margin = '0';
    document.body.style.padding = '0';
    document.body.style.overflow = 'hidden';
    document.documentElement.style.margin = '0';
    document.documentElement.style.padding = '0';
    document.documentElement.style.overflow = 'hidden';

    const loadBranding = async () => {
      try {
        const response = await fetch(getApiUrl('/api/system_variables_api.php?action=get_variables'));
        const result = await response.json();
        if (result.success && result.data) {
          const byKey = (key) => result.data.find(v => (v.variable_key || v.key) === key);
          const getVal = (key) => byKey(key)?.variable_value ?? byKey(key)?.value ?? '';
          const sysName = getVal('system_name');
          const compName = getVal('company_name');
          const logoPath = getVal('company_logo');
          if (sysName) setSystemName(sysName);
          if (compName) setCompanyName(compName);
          if (logoPath) {
            const base = getApiBaseUrl();
            setLogoUrl(logoPath.startsWith('http') ? logoPath : `${base.replace(/\/$/, '')}${logoPath.startsWith('/') ? '' : '/'}${logoPath}`);
          }
          const bgImage = getVal('login_background_image');
          const bgMode = getVal('login_background_mode') || 'cover';
          if (bgImage) {
            const base = getApiBaseUrl();
            setLoginBgImage(bgImage.startsWith('http') ? bgImage : `${base.replace(/\/$/, '')}${bgImage.startsWith('/') ? '' : '/'}${bgImage}`);
          } else {
            setLoginBgImage('');
          }
          setLoginBgMode(bgMode);
          const opacity = getVal('login_background_opacity');
          setLoginBgOpacity(opacity ? Math.min(100, Math.max(0, parseInt(opacity, 10))) : 100);
        }
      } catch (err) {
        console.error('Error loading branding:', err);
      }
    };
    loadBranding();

    const fetchVersion = async () => {
      try {
        const res = await fetch(getApiUrl('/api/update_system.php?action=check'));
        const data = await res.json();
        if (data.success && data.currentVersion) setSystemVersion(data.currentVersion);
      } catch (e) {
        // ignore
      }
    };
    fetchVersion();

    return () => {
      document.body.style.margin = '';
      document.body.style.padding = '';
      document.body.style.overflow = '';
      document.documentElement.style.margin = '';
      document.documentElement.style.padding = '';
      document.documentElement.style.overflow = '';
    };
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const response = await fetch(getApiUrl('/api/login.php'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: formData.username, password: formData.password })
      });
      const result = await response.json();
      if (result.success) {
        toast({
          title: 'تم تسجيل الدخول بنجاح',
          description: `مرحباً ${result.user.full_name}`,
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
        onLogin(result.user, result.token);
      } else {
        setError(result.message || 'اسم المستخدم أو كلمة المرور غير صحيحة');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('حدث خطأ في الاتصال. يرجى المحاولة مرة أخرى.');
    } finally {
      setLoading(false);
    }
  };

  const bgModeStyles = {
    cover: { backgroundSize: 'cover', backgroundRepeat: 'no-repeat', backgroundPosition: 'center', backgroundAttachment: 'scroll' },
    fixed: { backgroundSize: 'cover', backgroundRepeat: 'no-repeat', backgroundPosition: 'center', backgroundAttachment: 'fixed' },
    'full-width': { backgroundSize: '100% auto', backgroundRepeat: 'no-repeat', backgroundPosition: 'center', backgroundAttachment: 'scroll' },
    repeat: { backgroundSize: 'auto', backgroundRepeat: 'repeat', backgroundPosition: '0 0', backgroundAttachment: 'scroll' },
    'no-repeat': { backgroundSize: 'auto', backgroundRepeat: 'no-repeat', backgroundPosition: 'center', backgroundAttachment: 'scroll' }
  };

  return (
    <Box
      className="login-page"
      position="fixed"
      top="0"
      left="0"
      right="0"
      bottom="0"
      w="100vw"
      h="100vh"
      overflow="auto"
      m="0"
      p="0"
      display="flex"
      flexDirection="column"
      bg="var(--stake-bg-primary, #0b1324)"
      color="var(--stake-text-primary, #f1f5f9)"
      fontFamily="var(--font-family, 'Cairo', 'Tajawal', sans-serif)"
      sx={!loginBgImage ? { backgroundImage: 'var(--stake-gradient-bg, none)', backgroundAttachment: 'fixed' } : {}}
    >
      <Box position="relative" zIndex={1} flex="1" display="flex" flexDirection="column" minH={0}>
      {(systemName || systemVersion) && (
        <Box as="header" py={4} px={4} textAlign="center" borderBottom="1px solid var(--stake-border-primary, #2d3a4d)" flexShrink={0}>
          <Text
            fontSize="xl"
            fontWeight="800"
            color="var(--stake-text-primary, #f1f5f9)"
            fontFamily="inherit"
            display="inline"
          >
            {systemName || 'نظام الحضور والمرتبات'}
            {systemVersion && (
              <Text
                as="sup"
                fontSize="9px"
                color="var(--stake-primary, #3b82f6)"
                fontWeight="normal"
                mr="1"
                ml="1"
              >
                v{systemVersion}
              </Text>
            )}
          </Text>
        </Box>
      )}
      {/* المنطقة بين الهيدر والفوتر فقط — الخلفية هنا فقط */}
      <Box flex="1" position="relative" minH={0} display="flex" alignItems="center" justifyContent="center" py={{ base: 6, md: 8 }} px={4}>
        {loginBgImage && (
          <Box
            position="absolute"
            top="0"
            left="0"
            right="0"
            bottom="0"
            zIndex={0}
            opacity={loginBgOpacity / 100}
            sx={{
              backgroundImage: `url(${loginBgImage})`,
              ...(bgModeStyles[loginBgMode] || bgModeStyles.cover),
            }}
          />
        )}
        {!loginBgImage && (
          <Box
            position="absolute"
            top="0"
            left="0"
            right="0"
            bottom="0"
            zIndex={0}
            sx={{
              backgroundImage: 'var(--stake-gradient-bg, none)',
              backgroundAttachment: 'fixed',
            }}
          />
        )}
        <Box position="relative" zIndex={1} w="100%" display="flex" alignItems="center" justifyContent="center">
        <Box
          w="100%"
          maxW="440px"
          bg="var(--stake-bg-card, #1a2234)"
          borderRadius="2xl"
          border="1px solid var(--stake-border-primary, #2d3a4d)"
          boxShadow="var(--stake-shadow-xl, 0 20px 40px rgba(0,0,0,0.4))"
          overflow="hidden"
        >
          {/* شريط علوي للعلامة */}
          <Box
            h="4px"
            w="100%"
            bg="var(--stake-primary, #3b82f6)"
            opacity={0.9}
          />
          <VStack spacing={0} align="stretch" p={{ base: 6, md: 8 }} pt={7}>
            <VStack spacing={1} align="center" textAlign="center" mb={5}>
              <Text fontSize="xl" fontWeight="800" color="var(--stake-text-primary, #f1f5f9)" lineHeight="1.2">
                تسجيل الدخول
              </Text>
              <Text fontSize="sm" color="var(--stake-text-secondary, #94a3b8)" fontWeight="500">
                أدخل بياناتك للوصول إلى حسابك
              </Text>
            </VStack>

            <form onSubmit={handleSubmit} style={{ width: '100%' }}>
              <VStack spacing={4} align="stretch">
                <FormControl isRequired>
                  <FormLabel fontSize="sm" fontWeight="600" color="var(--stake-text-secondary)" mb={1} textAlign="right">
                    اسم المستخدم
                  </FormLabel>
                  <InputGroup size="lg" dir="rtl">
                    <InputLeftElement h="48px" w="48px" pointerEvents="none" dir="rtl">
                      <Icon as={FiUser} color="var(--stake-primary, #3b82f6)" boxSize="5" />
                    </InputLeftElement>
                    <Input
                      name="username"
                      type="text"
                      placeholder="أدخل اسم المستخدم"
                      value={formData.username}
                      onChange={handleInputChange}
                      h="48px"
                      fontSize="md"
                      fontWeight="500"
                      bg="var(--stake-bg-secondary, #111827)"
                      border="1px solid var(--stake-border-primary, #2d3a4d)"
                      borderRadius="xl"
                      pr="52px"
                      pl="4"
                      color="var(--stake-text-primary)"
                      fontFamily="inherit"
                      textAlign="right"
                      dir="rtl"
                      _hover={{ borderColor: 'var(--stake-border-accent, #3b82f6)', bg: 'var(--stake-bg-hover, #243b5c)' }}
                      _focus={{ borderColor: 'var(--stake-primary)', boxShadow: '0 0 0 2px rgba(59, 130, 246, 0.25)' }}
                      _placeholder={{ color: 'var(--stake-text-muted, #64748b)' }}
                    />
                  </InputGroup>
                </FormControl>

                <FormControl isRequired>
                  <FormLabel fontSize="sm" fontWeight="600" color="var(--stake-text-secondary)" mb={1} textAlign="right">
                    كلمة المرور
                  </FormLabel>
                  <InputGroup size="lg" dir="rtl">
                    <InputLeftElement h="48px" w="48px" pointerEvents="none" dir="rtl">
                      <Icon as={FiLock} color="var(--stake-primary, #3b82f6)" boxSize="5" />
                    </InputLeftElement>
                    <Input
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="أدخل كلمة المرور"
                      value={formData.password}
                      onChange={handleInputChange}
                      h="48px"
                      fontSize="md"
                      fontWeight="500"
                      bg="var(--stake-bg-secondary, #111827)"
                      border="1px solid var(--stake-border-primary, #2d3a4d)"
                      borderRadius="xl"
                      pr="52px"
                      pl="44px"
                      color="var(--stake-text-primary)"
                      fontFamily="inherit"
                      textAlign="right"
                      dir="rtl"
                      _hover={{ borderColor: 'var(--stake-border-accent)', bg: 'var(--stake-bg-hover)' }}
                      _focus={{ borderColor: 'var(--stake-primary)', boxShadow: '0 0 0 2px rgba(59, 130, 246, 0.25)' }}
                      _placeholder={{ color: 'var(--stake-text-muted)' }}
                    />
                    <InputRightElement h="48px" w="44px" dir="rtl">
                      <IconButton
                        aria-label={showPassword ? 'إخفاء' : 'إظهار'}
                        icon={showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                        variant="ghost"
                        size="sm"
                        color="var(--stake-text-muted)"
                        _hover={{ bg: 'var(--stake-bg-hover)', color: 'var(--stake-primary)' }}
                        onClick={() => setShowPassword(!showPassword)}
                      />
                    </InputRightElement>
                  </InputGroup>
                </FormControl>

                {error && (
                  <Alert
                    status="error"
                    borderRadius="xl"
                    fontSize="sm"
                    bg="var(--stake-error, #ef4444)"
                    bgOpacity={0.15}
                    border="1px solid"
                    borderColor="var(--stake-error)"
                    py={2}
                    px={3}
                  >
                    <AlertIcon color="var(--stake-error)" boxSize={4} />
                    <AlertDescription color="var(--stake-text-primary)" fontSize="sm">{error}</AlertDescription>
                  </Alert>
                )}

                <Button
                  type="submit"
                  w="full"
                  h="48px"
                  fontSize="md"
                  fontWeight="700"
                  fontFamily="inherit"
                  borderRadius="xl"
                  color="white"
                  bg="var(--stake-primary, #3b82f6)"
                  _hover={{ bg: 'var(--stake-primary)', opacity: 0.9, transform: 'translateY(-1px)' }}
                  _active={{ transform: 'translateY(0)' }}
                  isLoading={loading}
                  loadingText="جاري تسجيل الدخول..."
                  transition="all 0.2s"
                >
                  تسجيل الدخول
                </Button>
              </VStack>
            </form>
          </VStack>
        </Box>
        </Box>
      </Box>

      {(companyName || logoUrl) && (
        <Box as="footer" flexShrink={0} py={3} px={4} textAlign="center" borderTop="1px solid var(--stake-border-primary, #2d3a4d)">
          <VStack spacing={2}>
            {logoUrl && (
              <Box>
                <Image
                  src={logoUrl}
                  alt="شعار الشركة"
                  maxH="48px"
                  maxW="120px"
                  objectFit="contain"
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
              </Box>
            )}
            {companyName && (
              <Text fontSize="sm" color="var(--stake-text-secondary, #94a3b8)" fontWeight="600" fontFamily="inherit">
                {companyName}
              </Text>
            )}
          </VStack>
        </Box>
      )}
      </Box>
    </Box>
  );
};

export default Login;
