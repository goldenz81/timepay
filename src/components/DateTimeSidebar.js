import React, { useState, useEffect } from 'react';
import { Calendar, Clock, MapPin } from 'lucide-react';

function DateTimeSidebar({ timezone, timeFormat, city }) {
  const [currentDateTime, setCurrentDateTime] = useState(new Date());
  
  // إعادة تحديث التاريخ والوقت عند تغيير الإعدادات
  useEffect(() => {
    const now = new Date();
    const timezoneDate = new Date(now.toLocaleString("en-US", {timeZone: timezone}));
    setCurrentDateTime(timezoneDate);
    console.log('DateTimeSidebar: Updated timezone to', timezone, 'timeFormat to', timeFormat);
  }, [timezone, timeFormat]);

  useEffect(() => {
    const updateDateTime = () => {
      // استخدام المنطقة الزمنية المحددة
      const now = new Date();
      const timezoneDate = new Date(now.toLocaleString("en-US", {timeZone: timezone}));
      setCurrentDateTime(timezoneDate);
    };

    // تحديث الوقت كل ثانية
    const interval = setInterval(updateDateTime, 1000);

    return () => clearInterval(interval);
  }, [timezone, timeFormat]);

  // تنسيق التاريخ الميلادي باللغة العربية مع الأرقام بالإنجليزية
  const formatDate = (date) => {
    // استخدام المنطقة الزمنية المحددة للتاريخ
    const timezoneDate = new Date(date.toLocaleString("en-US", {timeZone: timezone}));
    
    // أسماء الأيام باللغة العربية
    const weekDays = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    
    // أسماء الشهور باللغة العربية
    const months = [
      'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
      'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
    ];
    
    const dayOfWeek = weekDays[timezoneDate.getDay()];
    const day = timezoneDate.getDate();
    const month = months[timezoneDate.getMonth()];
    const year = timezoneDate.getFullYear();
    
    return `${dayOfWeek} ${day} ${month} ${year}`;
  };

  // تنسيق الوقت بناءً على إعدادات النظام (بدون ثواني)
  const formatTime = (date) => {
    if (timeFormat === '12') {
      // نظام 12 ساعة مع المنطقة الزمنية
      const options = {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
        timeZone: timezone
      };
      
      const timeString = date.toLocaleTimeString('en-US', options);
      const parts = timeString.split(' ');
      
      if (parts.length === 2) {
        return {
          time: parts[0],
          period: parts[1] // استخدام AM/PM مباشرة
        };
      }
      
      return {
        time: timeString,
        period: ''
      };
    } else {
      // نظام 24 ساعة مع المنطقة الزمنية
      const options = {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: timezone
      };
      
      return {
        time: date.toLocaleTimeString('en-US', options),
        period: null
      };
    }
  };

  // الحصول على اسم المدينة باللغة العربية
  const getCityName = (cityValue) => {
    const cityNames = {
      'Cairo': 'القاهرة',
      'Alexandria': 'الإسكندرية',
      'Giza': 'الجيزة',
      'Luxor': 'الأقصر',
      'Aswan': 'أسوان'
    };
    
    return cityNames[cityValue] || cityValue;
  };

  return (
    <>
      {/* التاريخ */}
      <div className="datetime-sidebar-section">
        <div className="datetime-sidebar-icon">
          <Calendar className="h-4 w-4" />
        </div>
        <div className="datetime-sidebar-content">
          <div className="datetime-sidebar-value">
            {formatDate(currentDateTime)}
          </div>
        </div>
      </div>

      {/* الوقت */}
      <div className="datetime-sidebar-section">
        <div className="datetime-sidebar-icon">
          <Clock className="h-4 w-4" />
        </div>
        <div className="datetime-sidebar-content">
          <div className="datetime-sidebar-time">
            <span className="datetime-sidebar-time-value">
              {formatTime(currentDateTime).time}
            </span>
            {formatTime(currentDateTime).period && (
              <span className="datetime-sidebar-period">
                {formatTime(currentDateTime).period}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* المدينة */}
      <div className="datetime-sidebar-section">
        <div className="datetime-sidebar-icon">
          <MapPin className="h-4 w-4" />
        </div>
        <div className="datetime-sidebar-content">
          <div className="datetime-sidebar-value">
            {getCityName(city)}
          </div>
        </div>
      </div>
    </>
  );
}

export default DateTimeSidebar;
