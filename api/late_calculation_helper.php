<?php
/**
 * دالة لحساب التأخيرات حسب النظام الجديد
 * 
 * القواعد:
 * - ساعة تأخير كاملة = 2 ساعة (مضاعف)
 * - أقل من ساعة = نصف ساعة (0.5 × 2 = 1 ساعة)
 * - أقل من نصف ساعة = نصف ساعة (0.5 × 2 = 1 ساعة)
 */

/**
 * حساب التأخير المحسوب من الدقائق
 * @param int $lateMinutes عدد دقائق التأخير
 * @return float التأخير المحسوب بالساعات
 */
function calculateLateHours($lateMinutes) {
    if ($lateMinutes <= 0) {
        return 0;
    }
    
    // تطبيق النظام الجديد
    if ($lateMinutes >= 60) {
        // ساعة كاملة أو أكثر = مضاعف
        $lateHours = $lateMinutes / 60;
        return $lateHours * 2;
    } else {
        // أقل من ساعة = نصف ساعة مضاعفة
        return 0.5 * 2; // = 1 ساعة
    }
}

/**
 * حساب التأخير المحسوب من الساعات
 * @param float $lateHours عدد ساعات التأخير
 * @return float التأخير المحسوب بالساعات
 */
function calculateLateHoursFromHours($lateHours) {
    if ($lateHours <= 0) {
        return 0;
    }
    
    // تطبيق النظام الجديد
    if ($lateHours >= 1) {
        // ساعة كاملة أو أكثر = مضاعف
        return $lateHours * 2;
    } else {
        // أقل من ساعة = نصف ساعة مضاعفة
        return 0.5 * 2; // = 1 ساعة
    }
}

/**
 * حساب إجمالي التأخيرات من مجموعة سجلات
 * @param array $records مجموعة سجلات الحضور
 * @return float إجمالي التأخير المحسوب بالساعات
 */
function calculateTotalLateHours($records) {
    $totalLateMinutes = 0;
    
    foreach ($records as $record) {
        $totalLateMinutes += intval($record['late_minutes'] ?? 0);
    }
    
    return calculateLateHours($totalLateMinutes);
}

// أمثلة للاختبار
if (basename(__FILE__) == basename($_SERVER['SCRIPT_NAME'])) {
    echo "اختبار دالة حساب التأخيرات:\n";
    echo "15 دقيقة = " . calculateLateHours(15) . " ساعة\n";
    echo "30 دقيقة = " . calculateLateHours(30) . " ساعة\n";
    echo "45 دقيقة = " . calculateLateHours(45) . " ساعة\n";
    echo "60 دقيقة = " . calculateLateHours(60) . " ساعة\n";
    echo "90 دقيقة = " . calculateLateHours(90) . " ساعة\n";
    echo "120 دقيقة = " . calculateLateHours(120) . " ساعة\n";
}
?>
