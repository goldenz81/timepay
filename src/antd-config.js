import { ConfigProvider, App } from 'antd';
import arEG from 'antd/locale/ar_EG';
import dayjs from 'dayjs';
import 'dayjs/locale/ar';

// إعداد اللغة العربية
dayjs.locale('ar');

// إعداد Ant Design مع RTL
export const antdConfig = {
  locale: arEG,
  direction: 'rtl',
  theme: {
    token: {
      colorPrimary: '#1976d2',
      colorSuccess: '#2e7d32',
      colorWarning: '#ed6c02',
      colorError: '#d32f2f',
      colorInfo: '#1976d2',
      borderRadius: 8,
      fontFamily: 'Cairo, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    },
    components: {
      Table: {
        headerBg: '#f5f5f5',
        headerColor: '#333',
        rowHoverBg: '#f0f8ff',
      },
      Card: {
        borderRadius: 12,
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      },
      Button: {
        borderRadius: 8,
        fontWeight: 500,
      },
      Input: {
        borderRadius: 8,
      },
      Select: {
        borderRadius: 8,
      },
    },
  },
};

// مكون Ant Design مع RTL
export const AntdProvider = ({ children }) => {
  return (
    <ConfigProvider {...antdConfig}>
      <App>
        {children}
      </App>
    </ConfigProvider>
  );
};
