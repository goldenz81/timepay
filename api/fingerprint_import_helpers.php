<?php
/**
 * تحويل قيمة الوقت من ملف البصمة إلى تنسيق TIME صالح لـ MySQL (HH:MM:SS)
 */
function normalizeFingerprintTimeValue($raw) {
    if ($raw === null) {
        return null;
    }

    $t = trim((string) $raw);
    if ($t === '' || $t === '-' || strcasecmp($t, 'false') === 0 || $t === '0') {
        return null;
    }

    // إزالة أجزاء زائدة: 17:00:00:00 → 17:00:00
    $parts = explode(':', $t);
    if (count($parts) > 3) {
        $parts = array_slice($parts, 0, 3);
        $t = implode(':', $parts);
    }

    if (preg_match('/^\d{1,2}:\d{2}:\d{2}$/', $t)) {
        [$h, $m, $s] = array_map('intval', explode(':', $t));
        return sprintf('%02d:%02d:%02d', $h, $m, $s);
    }

    if (preg_match('/^\d{1,2}:\d{2}$/', $t)) {
        [$h, $m] = array_map('intval', explode(':', $t));
        return sprintf('%02d:%02d:00', $h, $m);
    }

    // ساعات عشرية من Excel مثل 17.5
    if (preg_match('/^\d+\.\d+$/', $t)) {
        $hours = (int) floor((float) $t);
        $minutes = (int) round(((float) $t - $hours) * 60);
        if ($minutes >= 60) {
            $hours += intdiv($minutes, 60);
            $minutes %= 60;
        }
        return sprintf('%02d:%02d:00', $hours, $minutes);
    }

    // دقائق كرقم صحيح
    if (preg_match('/^\d+$/', $t)) {
        $mins = (int) $t;
        if ($mins === 0) {
            return null;
        }
        return sprintf('%02d:%02d:00', intdiv($mins, 60), $mins % 60);
    }

    return null;
}
