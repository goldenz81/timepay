/**
 * يستعيد الدوال المحذوفة بالخطأ من النسخة الاحتياطية
 */
const fs = require('fs');
const path = require('path');

const backupPath = 'C:/Users/netsh/Desktop/PremiumWeeklySalary_backup.js';
const pagePath = path.join(__dirname, '../src/pages/PremiumWeeklySalary.js');

const backup = fs.readFileSync(backupPath, 'utf8').split(/\r?\n/);
const page = fs.readFileSync(pagePath, 'utf8').split(/\r?\n/);

function sliceLines(start, end) {
  return backup.slice(start - 1, end).join('\n');
}

const block1 = sliceLines(780, 848);
const block2 = sliceLines(963, 1366);
const block3 = sliceLines(1502, 1598);

let restored = [block1, block2, block3].join('\n\n');
restored = restored.replace(/\bconsole\.log\(/g, 'debugLog(');
restored = restored.replace(/\bconsole\.warn\(/g, 'debugWarn(');
restored = restored.replace(/\bconsole\.error\(/g, 'debugError(');

const insertAfter = page.findIndex((l) => l.includes('const [employeeDetailsData, setEmployeeDetailsData]'));
const filterIdx = page.findIndex((l) => l.includes('// Filter data + sorting'));

if (insertAfter < 0 || filterIdx < 0) {
  console.error('Insert markers not found', { insertAfter, filterIdx });
  process.exit(1);
}

const newPage = [
  ...page.slice(0, insertAfter + 1),
  '',
  restored,
  '',
  ...page.slice(filterIdx),
].join('\n');

// استبدال MAIN_TABLE_ALLOWED بـ WEEKLY_MAIN_TABLE_ALLOWED
let final = newPage.replace(/\bMAIN_TABLE_ALLOWED\b/g, 'WEEKLY_MAIN_TABLE_ALLOWED');

// تحديث import constants
final = final.replace(
  /import \{\n  LEGACY_WEEKLY_MAIN_COLUMNS_STORAGE_KEY,\n  PAY_WEEK_COLUMN_LABELS,\n  WEEKLY_MAIN_COLUMNS_STORAGE_KEY,\n  WEEKLY_SALARY_MAIN_COLUMNS_SETTING_KEY,\n\} from '\.\.\/utils\/salary\/weeklySalaryConstants';/,
  `import {
  PAY_WEEK_COLUMN_LABELS,
  WEEKLY_MAIN_TABLE_ALLOWED,
} from '../utils/salary/weeklySalaryConstants';`
);

fs.writeFileSync(pagePath, final, 'utf8');
console.log('Restored missing functions from backup');
