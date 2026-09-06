import React from 'react';
import { Card, Typography, Tabs, Space, Button } from 'antd';
import { PlusOutlined } from '@ant-design/icons';

const { Title } = Typography;

const PageLayout = ({ 
  children, 
  title, 
  subtitle, 
  extra, 
  className = '', 
  showCard = true,
  cardStyle = {},
  contentStyle = {},
  background = '#f5f5f5',
  // Tabs support
  tabs = null,
  activeTab = null,
  onTabChange = null,
  tabBarExtraContent = null,
  // Statistics support
  statistics = null,
  // Search/Filter support
  searchBar = null,
  // Action buttons
  actions = null
}) => {
  const defaultCardStyle = {
    borderRadius: '8px',
    ...cardStyle
  };

  const defaultContentStyle = {
    padding: '24px',
    background,
    minHeight: '100vh',
    ...contentStyle
  };

  const renderHeader = () => {
    if (!title && !extra) return null;
    
    return (
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
          <div>
            {title && (
              <Title level={2} style={{ margin: 0, color: '#262626' }}>
                {title}
              </Title>
            )}
            {subtitle && (
              <Typography.Text type="secondary" style={{ fontSize: '16px' }}>
                {subtitle}
              </Typography.Text>
            )}
          </div>
          {extra && (
            <div>
              {extra}
            </div>
          )}
        </div>
        
        {actions && (
          <div style={{ marginBottom: '16px' }}>
            {actions}
          </div>
        )}
      </div>
    );
  };

  const renderStatistics = () => {
    if (!statistics) return null;
    
    return (
      <div style={{ marginBottom: '24px' }}>
        {statistics}
      </div>
    );
  };

  const renderSearchBar = () => {
    if (!searchBar) return null;
    
    return (
      <div style={{ marginBottom: '24px' }}>
        {searchBar}
      </div>
    );
  };

  const renderContent = () => {
    if (tabs) {
      console.log('PageLayout rendering tabs:', tabs);
      console.log('PageLayout activeTab:', activeTab);
      return (
        <Tabs 
          activeKey={activeTab}
          onChange={onTabChange}
          type="card" 
          size="large"
          tabBarExtraContent={tabBarExtraContent}
        >
          {tabs.map(tab => (
            <Tabs.TabPane key={tab.key} tab={tab.label}>
              {tab.children}
            </Tabs.TabPane>
          ))}
        </Tabs>
      );
    }
    
    return children;
  };

  if (!showCard) {
    return (
      <div className={`page-layout ${className}`} style={defaultContentStyle}>
        {renderHeader()}
        {renderStatistics()}
        {renderSearchBar()}
        {renderContent()}
      </div>
    );
  }

  return (
    <div className={`page-layout ${className}`} style={defaultContentStyle}>
      <Card
        className="page-layout-card"
        style={defaultCardStyle}
      >
        {renderHeader()}
        {renderStatistics()}
        {renderSearchBar()}
        {renderContent()}
      </Card>
    </div>
  );
};

export default PageLayout;
