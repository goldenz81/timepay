import { debugLog, debugWarn } from '../debugLog';

/** إزالة تكرار أعمدة المستحقات مع أولوية reference و total_entitlements */
export function deduplicateEntitlementsColumns(sorted) {
  const uniqueColumns = [];
  const seenKeys = new Set();
  const seenIds = new Set();

  for (const col of sorted) {
    if (!col) continue;

    const key = col.column_key || col.column_name || col.name;
    const id = col.id;
    const type = col.type;
    const name = col.display_name_ar || col.column_name_ar || '';
    const isTotalEntitlements = key === 'total_entitlements' || name === 'إجمالي المستحقات';
    const isReference = type === 'reference';

    if (isReference || isTotalEntitlements) {
      debugLog('Found reference/total_entitlements column:', { id, key, name, type, isReference, isTotalEntitlements });
    }

    if (key && seenKeys.has(key) && !isReference && !isTotalEntitlements) {
      const existingCol = uniqueColumns.find((c) => (c.column_key || c.column_name || c.name) === key);
      if (existingCol) {
        const existingOrder = parseInt(existingCol.display_order || existingCol.order) || 999;
        const currentOrder = parseInt(col.display_order || col.order) || 999;
        if (currentOrder >= existingOrder) {
          debugWarn('تم تجاهل عمود مكرر (column_key) - الاحتفاظ بالأقدم:', { id, key, name, type });
          continue;
        }
        const index = uniqueColumns.findIndex((c) => (c.column_key || c.column_name || c.name) === key);
        if (index >= 0) {
          uniqueColumns.splice(index, 1);
          seenIds.delete(existingCol.id);
          debugWarn('تم استبدال عمود مكرر (column_key) - الاحتفاظ بالأحدث:', { id, key, name, type });
        }
      } else {
        debugWarn('تم تجاهل عمود مكرر (column_key):', { id, key, name, type });
        continue;
      }
    }

    if (id && seenIds.has(id) && !isReference && !isTotalEntitlements) {
      debugWarn('تم تجاهل عمود مكرر (id):', { id, key, name, type });
      continue;
    }

    if (key) seenKeys.add(key);
    if (id) seenIds.add(id);
    uniqueColumns.push(col);

    if (isReference || isTotalEntitlements) {
      debugLog('Added reference/total_entitlements column to uniqueColumns:', { id, key, name, type });
    }
  }

  return uniqueColumns;
}

export function deduplicateDeductionColumns(sorted) {
  const uniqueColumns = [];
  const seenKeys = new Set();
  const seenIds = new Set();

  for (const col of sorted) {
    if (!col) continue;
    const key = col.column_key || col.column_name || col.name;
    const id = col.id;

    if (key && seenKeys.has(key)) {
      debugWarn('تم تجاهل عمود مكرر (column_key) في المستقطعات:', {
        id,
        key,
        name: col.display_name_ar || col.column_name_ar,
      });
      continue;
    }
    if (id && seenIds.has(id)) {
      debugWarn('تم تجاهل عمود مكرر (id) في المستقطعات:', {
        id,
        key,
        name: col.display_name_ar || col.column_name_ar,
      });
      continue;
    }

    if (key) seenKeys.add(key);
    if (id) seenIds.add(id);
    uniqueColumns.push(col);
  }

  return uniqueColumns;
}
