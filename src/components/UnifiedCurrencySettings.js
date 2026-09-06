import React, { useState, useEffect } from "react";
import { getApiUrl } from "../utils/apiUrlHelper";
import {
  Card,
  Form,
  Input,
  Switch,
  Select,
  Button,
  Row,
  Col,
  message,
  Divider,
  Typography,
  Space,
  Alert,
  Collapse
} from "antd";
import {
  DollarOutlined,
  SettingOutlined,
  SaveOutlined,
  ReloadOutlined
} from "@ant-design/icons";

const { Title, Text } = Typography;
const { Option } = Select;
const { Panel } = Collapse;

const UnifiedCurrencySettings = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState({});
  const [preview, setPreview] = useState("");

  // تحميل إعدادات العملة
  const loadCurrencyConfig = async () => {
    try {
      setLoading(true);
      const response = await fetch(getApiUrl("/api/unified_currency_api.php?action=get_currency_config"));
      const data = await response.json();
      
      if (data.success) {
        setConfig(data.config);
        form.setFieldsValue(data.config);
        updatePreview(data.config);
      } else {
        message.error("خطأ في تحميل إعدادات العملة: " + data.message);
      }
    } catch (error) {
      message.error("خطأ في الاتصال: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  // حفظ إعدادات العملة
  const saveCurrencyConfig = async (values) => {
    try {
      setLoading(true);
      const response = await fetch(getApiUrl("/api/unified_currency_api.php?action=update_currency_config"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          config: values
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        message.success("تم حفظ إعدادات العملة بنجاح");
        setConfig(values);
        updatePreview(values);
      } else {
        message.error("خطأ في حفظ الإعدادات: " + data.message);
      }
    } catch (error) {
      message.error("خطأ في الاتصال: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  // حفظ إعداد واحد فقط
  const saveSingleSetting = async (key, value) => {
    try {
      const updatedConfig = { ...config, [key]: value };
      
      const response = await fetch(getApiUrl("/api/unified_currency_api.php?action=update_currency_config"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          config: updatedConfig
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        setConfig(updatedConfig);
        updatePreview(updatedConfig);
        message.success(`تم تحديث ${getFieldLabel(key)} بنجاح`);
      } else {
        message.error("خطأ في حفظ الإعداد: " + data.message);
      }
    } catch (error) {
      message.error("خطأ في الاتصال: " + error.message);
    }
  };

  // الحصول على تسمية الحقل
  const getFieldLabel = (key) => {
    const labels = {
      enabled: "تفعيل العملة",
      symbol: "رمز العملة",
      name: "اسم العملة",
      code: "رمز العملة الدولي",
      position: "موضع العملة",
      decimals: "عدد الأرقام العشرية",
      thousands_separator: "فاصل الآلاف",
      decimal_separator: "فاصل الكسور العشرية",
      format: "تنسيق العملة",
      show_symbol: "عرض رمز العملة",
      show_name: "عرض اسم العملة"
    };
    return labels[key] || key;
  };

  // تحديث معاينة العملة
  const updatePreview = (config) => {
    const amount = 5000;
    
    if (!config.enabled) {
      setPreview(amount.toString());
      return;
    }
    
    const symbol = config.show_symbol ? config.symbol : "";
    const name = config.show_name ? config.name : "";
    const decimals = parseInt(config.decimals || 0);
    const thousandsSep = config.thousands_separator || ",";
    const decimalSep = config.decimal_separator || ".";
    
    // تنسيق الرقم
    const formattedAmount = amount.toLocaleString("en-US", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    }).replace(/,/g, thousandsSep).replace(/\./g, decimalSep);
    
    // تطبيق التنسيق
    let format = config.format || "{amount} {symbol}";
    format = format.replace("{amount}", formattedAmount);
    format = format.replace("{symbol}", symbol);
    format = format.replace("{name}", name);
    
    setPreview(format);
  };

  // معالجة تغيير القيم
  const handleValuesChange = (changedValues, allValues) => {
    updatePreview(allValues);
  };

  useEffect(() => {
    loadCurrencyConfig();
  }, []);

  return (
    <Card 
      title={
        <Space>
          <DollarOutlined />
          <span>إعدادات العملة</span>
        </Space>
      }
      extra={
        <Button 
          icon={<ReloadOutlined />} 
          onClick={loadCurrencyConfig}
          loading={loading}
        >
          تحديث
        </Button>
      }
    >
      <Form
        form={form}
        layout="vertical"
        onValuesChange={handleValuesChange}
        initialValues={{
          enabled: true,
          symbol: "ج.م",
          name: "جنيه مصري",
          code: "EGP",
          position: "after",
          decimals: 0,
          thousands_separator: ",",
          decimal_separator: ".",
          format: "{amount} {symbol}",
          show_symbol: true,
          show_name: false
        }}
      >
        <Collapse defaultActiveKey={["basic", "display", "format"]}>
          <Panel header="الإعدادات الأساسية" key="basic">
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="enabled"
                  label="تفعيل العملة"
                  valuePropName="checked"
                >
                  <Switch 
                    onChange={(checked) => saveSingleSetting('enabled', checked)}
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="symbol"
                  label="رمز العملة"
                  rules={[{ required: true, message: "يرجى إدخال رمز العملة" }]}
                >
                  <Input 
                    placeholder="مثل: ج.م، $، €" 
                    onBlur={(e) => saveSingleSetting('symbol', e.target.value)}
                  />
                </Form.Item>
              </Col>
            </Row>
            
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="name"
                  label="اسم العملة"
                  rules={[{ required: true, message: "يرجى إدخال اسم العملة" }]}
                >
                  <Input 
                    placeholder="مثل: جنيه مصري، دولار أمريكي" 
                    onBlur={(e) => saveSingleSetting('name', e.target.value)}
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="code"
                  label="رمز العملة الدولي"
                  rules={[{ required: true, message: "يرجى إدخال رمز العملة الدولي" }]}
                >
                  <Input 
                    placeholder="مثل: EGP، USD، EUR" 
                    onBlur={(e) => saveSingleSetting('code', e.target.value)}
                  />
                </Form.Item>
              </Col>
            </Row>
          </Panel>

          <Panel header="إعدادات العرض" key="display">
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item
                  name="position"
                  label="موضع العملة"
                >
                  <Select onChange={(value) => saveSingleSetting('position', value)}>
                    <Option value="before">قبل الرقم</Option>
                    <Option value="after">بعد الرقم</Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item
                  name="decimals"
                  label="عدد الأرقام العشرية"
                >
                  <Select onChange={(value) => saveSingleSetting('decimals', value)}>
                    <Option value={0}>0 (بدون أرقام عشرية)</Option>
                    <Option value={1}>1</Option>
                    <Option value={2}>2</Option>
                    <Option value={3}>3</Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item
                  name="thousands_separator"
                  label="فاصل الآلاف"
                >
                  <Input 
                    placeholder="مثل: ," 
                    onBlur={(e) => saveSingleSetting('thousands_separator', e.target.value)}
                  />
                </Form.Item>
              </Col>
            </Row>
            
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item
                  name="decimal_separator"
                  label="فاصل الكسور العشرية"
                >
                  <Input 
                    placeholder="مثل: ." 
                    onBlur={(e) => saveSingleSetting('decimal_separator', e.target.value)}
                  />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item
                  name="show_symbol"
                  label="عرض رمز العملة"
                  valuePropName="checked"
                >
                  <Switch 
                    onChange={(checked) => saveSingleSetting('show_symbol', checked)}
                  />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item
                  name="show_name"
                  label="عرض اسم العملة"
                  valuePropName="checked"
                >
                  <Switch 
                    onChange={(checked) => saveSingleSetting('show_name', checked)}
                  />
                </Form.Item>
              </Col>
            </Row>
          </Panel>

          <Panel header="تنسيق مخصص" key="format">
            <Form.Item
              name="format"
              label="تنسيق العملة"
              help="استخدم {amount} للمبلغ، {symbol} للرمز، {name} للاسم"
            >
              <Input 
                placeholder="{amount} {symbol}" 
                onBlur={(e) => saveSingleSetting('format', e.target.value)}
              />
            </Form.Item>
          </Panel>
        </Collapse>

        <Divider />

        <Card size="small" title="معاينة العملة">
          <Alert
            message={
              <Space>
                <DollarOutlined />
                <Text strong>المعاينة: {preview}</Text>
              </Space>
            }
            type="info"
            showIcon
          />
        </Card>

        <Divider />

        <Alert
          message="💡 ملاحظة"
          description="جميع الإعدادات تحفظ تلقائياً عند التغيير. لا حاجة للضغط على زر الحفظ."
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />

        <Form.Item>
          <Space>
            <Button 
              onClick={() => form.resetFields()}
              size="large"
            >
              إعادة تعيين
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Card>
  );
};

export default UnifiedCurrencySettings;