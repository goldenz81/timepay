import React from 'react';
import { Input, Select, Button, Icons } from './index';

const TestForm = () => {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">اختبار النظام الجديد</h1>
      
      <div className="space-y-4">
        <Input
          label="اسم المستخدم"
          value=""
          onChange={() => {}}
          icon={Icons.User}
          placeholder="أدخل اسم المستخدم"
        />
        
        <Select
          label="نوع الساعة"
          value="24"
          onChange={() => {}}
          icon={Icons.Clock}
          options={[
            { value: '12', label: '12 ساعة' },
            { value: '24', label: '24 ساعة' }
          ]}
        />
        
        <Button
          variant="primary"
          icon={Icons.Save}
        >
          حفظ
        </Button>
      </div>
    </div>
  );
};

export default TestForm;