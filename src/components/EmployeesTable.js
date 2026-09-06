import React, { useState, useEffect } from 'react';
import { Button, Space, Tag, Tooltip, Typography, Input, Select } from 'antd';
import { ProTable } from '@ant-design/pro-components';
import { EyeOutlined, EditOutlined, DeleteOutlined, SearchOutlined } from '@ant-design/icons';

const { Text } = Typography;
const { Search } = Input;

const EmployeesTable = ({ 
  data, 
  loading, 
  onView, 
  onEdit, 
  onDelete,
  onSearch,
  departments,
  costCenters,
  originalData // إضافة البيانات الأصلية
}) => {
  const [searchValue, setSearchValue] = useState('');
  const [debouncedSearchValue, setDebouncedSearchValue] = useState('');

  // Debounce search value
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchValue(searchValue);
    }, 300); // 300ms delay

    return () => clearTimeout(timer);
  }, [searchValue]);

  // Trigger search when debounced value changes
  useEffect(() => {
    onSearch(debouncedSearchValue);
  }, [debouncedSearchValue, onSearch]);
  const columns = [
    {
      title: 'كود الموظف',
      dataIndex: 'AC-No.',
      key: 'AC-No.',
      width: 100,
      render: (text) => <Text strong style={{ color: '#1976d2' }}>{text || '-'}</Text>,
    },
    {
      title: 'اسم الموظف',
      dataIndex: 'Name',
      key: 'Name',
      width: 150,
      render: (text) => <Text>{text || '-'}</Text>,
    },
    {
      title: 'القسم',
      dataIndex: 'department',
      key: 'department',
      width: 120,
      render: (text) => <Text type="secondary">{text || '-'}</Text>,
    },
    {
      title: 'التكلفة',
      dataIndex: 'cost_center',
      key: 'cost_center',
      width: 120,
      render: (text) => <Text type="secondary">{text || '-'}</Text>,
    },
    {
      title: 'المنصب',
      dataIndex: 'position',
      key: 'position',
      width: 120,
      render: (text) => <Text type="secondary">{text || '-'}</Text>,
    },
    {
      title: 'الراتب الأساسي',
      dataIndex: 'appointment_salary',
      key: 'appointment_salary',
      width: 120,
      align: 'center',
      render: (value) => (
        <Text strong style={{ color: '#2e7d32' }}>
          {value ? value.toLocaleString() : '0'} جنيه
        </Text>
      ),
    },
    {
      title: 'نوع الراتب',
      dataIndex: 'salary_type',
      key: 'salary_type',
      width: 100,
      align: 'center',
      render: (type) => (
        <Tag color={type === 'monthly' ? 'blue' : 'green'}>
          {type === 'monthly' ? 'شهري' : 'أسبوعي'}
        </Tag>
      ),
    },
    {
      title: 'التأمينات',
      dataIndex: 'has_insurance',
      key: 'has_insurance',
      width: 80,
      align: 'center',
      render: (hasInsurance) => (
        <Tag color={hasInsurance ? 'green' : 'red'}>
          {hasInsurance ? 'نعم' : 'لا'}
        </Tag>
      ),
    },
    {
      title: 'الحالة',
      dataIndex: 'status',
      key: 'status',
      width: 80,
      align: 'center',
      render: (status) => (
        <Tag color={status === 'active' ? 'green' : 'red'}>
          {status === 'active' ? 'نشط' : 'غير نشط'}
        </Tag>
      ),
    },
    {
      title: 'الإجراءات',
      key: 'actions',
      width: 120,
      fixed: 'right',
      render: (_, record) => (
        <Space>
          <Tooltip title="عرض">
            <Button 
              type="text"
              size="small"
              icon={<EyeOutlined />} 
              onClick={() => onView(record)}
              style={{ 
                color: '#1890ff',
                border: '1px solid #1890ff',
                borderRadius: '6px',
                padding: '4px 8px',
                height: '28px'
              }}
            />
          </Tooltip>
          <Tooltip title="تعديل">
            <Button 
              type="text"
              size="small"
              icon={<EditOutlined />} 
              onClick={() => onEdit(record)}
              style={{ 
                color: '#52c41a',
                border: '1px solid #52c41a',
                borderRadius: '6px',
                padding: '4px 8px',
                height: '28px'
              }}
            />
          </Tooltip>
          <Tooltip title="حذف">
            <Button 
              type="text"
              size="small"
              icon={<DeleteOutlined />} 
              onClick={() => onDelete(record)}
              style={{ 
                color: '#ff4d4f',
                border: '1px solid #ff4d4f',
                borderRadius: '6px',
                padding: '4px 8px',
                height: '28px'
              }}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <div>

      {/* Search and Filters */}
      <div style={{ marginBottom: 16, display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
        <Input
          placeholder="البحث في الموظفين..."
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          style={{ width: 300 }}
          prefix={<SearchOutlined />}
          allowClear
        />
        <Button 
          onClick={() => {
            setSearchValue('');
            onSearch('', originalData || data);
          }}
          style={{ marginLeft: 'auto' }}
        >
          إعادة تعيين الفلاتر
        </Button>
        <Select
          placeholder="فلترة حسب القسم"
          style={{ width: 200 }}
          allowClear
          onChange={(value) => {
            // Filter by department using original data
            if (value) {
              const sourceData = originalData || data;
              const filtered = sourceData.filter(emp => {
                const empDept = typeof emp.department === 'object' ? emp.department?.name || emp.department?.id : emp.department;
                return empDept === value;
              });
              onSearch('', filtered);
            } else {
              // Reset to original data when clearing filter
              onSearch('', originalData || data);
            }
          }}
        >
          {departments.map(dept => (
            <Select.Option key={typeof dept === 'object' ? dept.id || dept.name : dept} value={typeof dept === 'object' ? dept.name || dept.id : dept}>
              {typeof dept === 'object' ? dept.name || dept.id || '-' : dept}
            </Select.Option>
          ))}
        </Select>
        <Select
          placeholder="فلترة حسب نوع الراتب"
          style={{ width: 200 }}
          allowClear
          onChange={(value) => {
            // Filter by salary type using original data
            if (value) {
              const filtered = (originalData || data).filter(emp => emp.salary_type === value);
              onSearch('', filtered);
            } else {
              // Reset to original data when clearing filter
              onSearch('', originalData || data);
            }
          }}
        >
          <Select.Option value="monthly">شهري</Select.Option>
          <Select.Option value="weekly">أسبوعي</Select.Option>
        </Select>
      </div>

      {/* ProTable */}
      <ProTable
        dataSource={data}
        loading={loading}
        rowKey="AC-No."
        search={false}
        pagination={false}
        columns={columns}
        scroll={{ x: 'max-content' }}
        size="small"
        bordered
        style={{ 
          fontFamily: 'Cairo, sans-serif',
          boxShadow: 'none'
        }}
        options={{
          reload: false,
          density: false,
          fullScreen: false,
          setting: false,
        }}
      />
    </div>
  );
};

export default EmployeesTable;
