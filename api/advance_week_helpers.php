<?php
/**
 * فترة أسبوع السلف الموحّدة (سبت → خميس) — متوافقة مع جدول السلف الأسبوعي وخصم الراتب.
 */
function advanceWeeklyPeriodFromStart($weekStartYmd) {
    $start = new DateTime($weekStartYmd);
    $start->setTime(0, 0, 0);
    // توحيد بداية الأسبوع إلى السبت
    $dow = (int)$start->format('w');
    $daysBack = ($dow + 1) % 7;
    if ($daysBack > 0) {
        $start->modify('-' . $daysBack . ' days');
    }
    $end = clone $start;
    $end->modify('+5 days');
    $end->setTime(23, 59, 59);

    $dayDates = [];
    for ($i = 0; $i <= 5; $i++) {
        $d = clone $start;
        if ($i > 0) {
            $d->modify('+' . $i . ' days');
        }
        $dayDates[] = $d->format('Y-m-d');
    }

    return [
        'week_start' => $start->format('Y-m-d'),
        'week_end' => $end->format('Y-m-d'),
        'day_dates' => $dayDates,
    ];
}
