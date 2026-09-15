import React, { useMemo, useState } from 'react';
import { useToast } from '@chakra-ui/react';
import {
  Plus,
  Filter,
  Search,
  X,
  Check,
  ChevronDown,
  ChevronLeft,
  ShieldCheck,
  Download,
  Upload,
  Settings,
} from 'lucide-react';
import { FiMoreVertical, FiEye, FiEdit, FiDollarSign, FiTrash2 } from 'react-icons/fi';

// Dept pill palette (mirrors the artifact's per-dept colors)
const DEPT_COLORS = [
  { bg: 'rgba(139,92,246,0.20)', text: '#A78BFA', border: 'rgba(139,92,246,0.30)' },
  { bg: 'rgba(236,72,153,0.20)', text: '#F9A8D4', border: 'rgba(236,72,153,0.30)' },
  { bg: 'rgba(16,185,129,0.20)', text: '#6EE7B7', border: 'rgba(16,185,129,0.30)' },
  { bg: 'rgba(245,158,11,0.20)', text: '#FCD34D', border: 'rgba(245,158,11,0.30)' },
  { bg: 'rgba(6,182,212,0.20)', text: '#67E8F9', border: 'rgba(6,182,212,0.30)' },
  { bg: 'rgba(249,115,22,0.20)', text: '#FDBA74', border: 'rgba(249,115,22,0.30)' },
];

function deptColor(name) {
  if (!name) return DEPT_COLORS[0];
  let h = 0;
  const s = String(name);
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return DEPT_COLORS[h % DEPT_COLORS.length];
}

function initialsOf(name) {
  const s = String(name || '').trim();
  if (!s) return '؟';
  const parts = s.split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 1);
  return (parts[0][0] || '') + (parts[1][0] || '');
}

function insuredOf(v) {
  return v === 1 || v === true || v === '1' || v === 'true';
}

export function AuroraEmployees(props) {
  const {
    employees = [],
    filteredEmployees = [],
    loading = false,
    stats,
    searchTerm,
    setSearchTerm,
    salaryTypeFilter,
    setSalaryTypeFilter,
    departmentFilter,
    setDepartmentFilter,
    departments = [],
    costCenterFilter,
    setCostCenterFilter,
    costCenters = [],
    employmentStatusFilter,
    setEmploymentStatusFilter,
    clearFilters,
    selectedRowKeys = [],
    setSelectedRowKeys,
    selectedEmployees = [],
    setSelectedEmployees,
    sortConfig,
    handleSort,
    handleViewEmployee,
    handleEditEmployeeClick,
    handleCalculateSalary,
    handleDeleteEmployee,
    handleBulkEdit,
    handleBulkDelete,
    onAddOpen,
    onImportOpen,
    onExportOpen,
    empTableColumns = [],
    toggleEmpColumn,
    formatCurrency,
  } = props;

  const toast = useToast();
  const [panelId, setPanelId] = useState(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [colsOpen, setColsOpen] = useState(false);
  const [rowMenuId, setRowMenuId] = useState(null);

  const fmt = formatCurrency || ((v) => `${Number(v || 0).toLocaleString('en-US')} ج.م`);

  const isActive = (e) => String(e.status || 'active').toLowerCase() === 'active';
  const countActive = useMemo(() => filteredEmployees.filter(isActive).length, [filteredEmployees]);
  const countWeekly = useMemo(
    () => filteredEmployees.filter((e) => e.salary_type === 'Weekly').length,
    [filteredEmployees]
  );
  const countMonthly = useMemo(
    () => filteredEmployees.filter((e) => e.salary_type === 'Monthly').length,
    [filteredEmployees]
  );
  const total = (stats && stats.total) || employees.length;

  const panelEmp = filteredEmployees.find((e) => String(e.id) === String(panelId)) || filteredEmployees[0] || null;

  const allChecked = filteredEmployees.length > 0 && selectedRowKeys.length === filteredEmployees.length;
  const someChecked = selectedRowKeys.length > 0 && selectedRowKeys.length < filteredEmployees.length;

  const toggleAll = (checked) => {
    if (checked) {
      setSelectedRowKeys(filteredEmployees.map((e) => e.id));
      setSelectedEmployees(filteredEmployees);
    } else {
      setSelectedRowKeys([]);
      setSelectedEmployees([]);
    }
  };

  const toggleOne = (emp, checked) => {
    if (checked) {
      setSelectedRowKeys([...selectedRowKeys, emp.id]);
      setSelectedEmployees([...selectedEmployees, emp]);
    } else {
      setSelectedRowKeys(selectedRowKeys.filter((k) => k !== emp.id));
      setSelectedEmployees(selectedEmployees.filter((e) => e.id !== emp.id));
    }
  };

  const pickRow = (emp) => {
    setPanelId(emp.id);
  };

  const salaryLabel = salaryTypeFilter === 'Monthly' ? 'شهري' : salaryTypeFilter === 'Weekly' ? 'أسبوعي' : 'الكل';
  const statusLabel =
    employmentStatusFilter === 'active' ? 'نشط' : employmentStatusFilter === 'inactive' ? 'غير نشط' : 'الكل';

  const sortIcon = (key) =>
    sortConfig && sortConfig.key === key ? (sortConfig.direction === 'asc' ? ' ▲' : ' ▼') : '';

  return (
    <div dir="rtl" className="space-y-4">
      {/* ===== Header band: title + Live + pills ===== */}
      <div className="rounded-[24px] p-6 bg-[#0F1220]/60 border border-white/[0.06]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-[28px] font-bold leading-none tracking-tight text-white">إدارة الموظفين</h1>
              <span className="h-6 px-2.5 rounded-full bg-[#10B981]/15 border border-[#10B981]/20 text-[#34D399] text-[11px] font-medium flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" />
                Live
              </span>
            </div>
            <p className="text-white/40 text-[13px] mt-2.5">نظام TimePay المتكامل لإدارة الموارد البشرية والرواتب</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="h-7 px-3 rounded-full bg-white/[0.06] border border-white/[0.08] flex items-center gap-1.5 text-[12px]">
              <span className="w-2 h-2 rounded-full bg-[#8B5CF6]" />
              <span className="text-white/70">{countWeekly}</span>
              <span className="text-white/40">أسبوعي</span>
            </div>
            <div className="h-7 px-3 rounded-full bg-white/[0.06] border border-white/[0.08] flex items-center gap-1.5 text-[12px]">
              <span className="w-2 h-2 rounded-full bg-[#F97316]" />
              <span className="text-white/70">{countMonthly}</span>
              <span className="text-white/40">شهري</span>
            </div>
            <div className="h-7 px-3 rounded-full bg-white/[0.06] border border-white/[0.08] flex items-center gap-1.5 text-[12px]">
              <span className="w-2 h-2 rounded-full bg-[#3B82F6]" />
              <span className="text-white/70">{total}</span>
              <span className="text-white/40">إجمالي</span>
            </div>
            <div className="h-7 px-3 rounded-full bg-[#10B981]/10 border border-[#10B981]/20 flex items-center gap-1.5 text-[12px]">
              <span className="w-2 h-2 rounded-full bg-[#10B981]" />
              <span className="text-[#6EE7B7]">{countActive}</span>
              <span className="text-[#6EE7B7]/70">نشط</span>
            </div>
          </div>
        </div>
      </div>

      {/* ===== Bulk bar (TimePay functionality) ===== */}
      {selectedEmployees.length > 0 && (
        <div className="rounded-[16px] bg-[#0F1220]/80 border border-white/[0.06] px-4 py-2.5 flex items-center justify-between gap-3 flex-wrap">
          <span className="text-[13px] text-white/70">تم اختيار {selectedEmployees.length} موظف</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleBulkEdit}
              className="h-8 px-3 rounded-full bg-[#3B82F6] text-white text-[12px] font-medium hover:bg-white/90 transition"
            >
              تعديل الكل
            </button>
            <button
              type="button"
              onClick={handleBulkDelete}
              className="h-8 px-3 rounded-full bg-[#EF4444] text-white text-[12px] font-medium transition"
            >
              حذف الكل
            </button>
            <button
              type="button"
              onClick={() => {
                setSelectedRowKeys([]);
                setSelectedEmployees([]);
              }}
              className="w-8 h-8 rounded-full bg-white/[0.06] text-white/60 hover:text-white flex items-center justify-center transition"
              aria-label="إلغاء الاختيارات"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ===== Table card ===== */}
      <div className="rounded-[24px] bg-[#0F1220]/60 border border-white/[0.06] overflow-hidden relative">
        <div className="h-14 px-5 flex items-center justify-between gap-3 border-b border-white/[0.06]">
          <div className="flex items-center gap-3">
            <h2 className="text-[15px] font-semibold text-white">قائمة الموظفين</h2>
            <span className="h-6 px-2.5 rounded-full bg-white/[0.06] border border-white/[0.08] text-[12px] text-white/60">
              {filteredEmployees.length}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onAddOpen}
              title="إضافة موظف جديد"
              className="w-8 h-8 rounded-full bg-white text-[#0F1220] flex items-center justify-center hover:bg-white/90 transition"
            >
              <Plus className="w-4 h-4" />
            </button>
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setFilterOpen(!filterOpen);
                  setColsOpen(false);
                }}
                className="h-8 px-3 rounded-full bg-white/[0.06] border border-white/[0.06] flex items-center gap-1.5 text-[12px] text-white/70 hover:bg-white/[0.08] transition"
              >
                <Filter className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">تصفية</span>
              </button>
              {filterOpen && (
                <>
                  <div className="fixed inset-0 z-20" onClick={() => setFilterOpen(false)} />
                  <div className="absolute left-0 top-[40px] z-30 w-[260px] rounded-xl bg-[#0F172A] border border-[#1F2A44] shadow-xl p-3 space-y-3 max-h-[380px] overflow-y-auto">
                    <div>
                      <div className="text-[11px] text-white/40 mb-1.5">البحث بالاسم أو الكود</div>
                      <div className="relative">
                        <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
                        <input
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          placeholder="البحث..."
                          className="w-full h-9 pr-8 pl-2 rounded-lg bg-white/[0.06] border border-white/[0.06] text-[12px] text-white outline-none placeholder:text-white/30"
                        />
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] text-white/40 mb-1.5">نوع المرتب</div>
                      <div className="flex gap-1.5">
                        {[
                          { v: '', l: 'الكل' },
                          { v: 'Weekly', l: 'أسبوعي' },
                          { v: 'Monthly', l: 'شهري' },
                        ].map((o) => (
                          <button
                            key={o.v}
                            type="button"
                            onClick={() => setSalaryTypeFilter(o.v)}
                            className={`flex-1 h-8 rounded-lg text-[12px] border transition ${
                              salaryTypeFilter === o.v
                                ? 'bg-[#8B5CF6]/20 border-[#8B5CF6]/40 text-white'
                                : 'bg-white/[0.04] border-white/[0.06] text-white/60 hover:bg-white/[0.08]'
                            }`}
                          >
                            {o.l}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] text-white/40 mb-1.5">القسم</div>
                      <div className="space-y-1 max-h-[120px] overflow-y-auto">
                        <button
                          type="button"
                          onClick={() => setDepartmentFilter('')}
                          className={`w-full text-right px-2.5 py-1.5 rounded-lg text-[12px] flex justify-between items-center ${
                            !departmentFilter ? 'text-blue-300 bg-white/[0.04]' : 'text-white/70 hover:bg-white/[0.06]'
                          }`}
                        >
                          الكل
                          {!departmentFilter && <Check className="w-3.5 h-3.5" />}
                        </button>
                        {departments.map((d) => (
                          <button
                            key={d.id || d.name}
                            type="button"
                            onClick={() => setDepartmentFilter(d.name)}
                            className={`w-full text-right px-2.5 py-1.5 rounded-lg text-[12px] flex justify-between items-center ${
                              departmentFilter === d.name
                                ? 'text-blue-300 bg-white/[0.04]'
                                : 'text-white/70 hover:bg-white/[0.06]'
                            }`}
                          >
                            {d.description || d.name}
                            {departmentFilter === d.name && <Check className="w-3.5 h-3.5" />}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] text-white/40 mb-1.5">الحالة</div>
                      <div className="flex gap-1.5">
                        {[
                          { v: 'all', l: 'الكل' },
                          { v: 'active', l: 'نشط' },
                          { v: 'inactive', l: 'غير نشط' },
                        ].map((o) => (
                          <button
                            key={o.v}
                            type="button"
                            onClick={() => setEmploymentStatusFilter(o.v)}
                            className={`flex-1 h-8 rounded-lg text-[12px] border transition ${
                              employmentStatusFilter === o.v
                                ? 'bg-[#8B5CF6]/20 border-[#8B5CF6]/40 text-white'
                                : 'bg-white/[0.04] border-white/[0.06] text-white/60 hover:bg-white/[0.08]'
                            }`}
                          >
                            {o.l}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="pt-1 border-t border-white/[0.06] space-y-1">
                      <button
                        type="button"
                        onClick={onImportOpen}
                        className="w-full h-9 rounded-lg text-[12px] text-white/70 hover:bg-white/[0.06] flex items-center gap-2 px-2.5 transition"
                      >
                        <Upload className="w-3.5 h-3.5" /> استيراد XML
                      </button>
                      <button
                        type="button"
                        onClick={onExportOpen}
                        className="w-full h-9 rounded-lg text-[12px] text-white/70 hover:bg-white/[0.06] flex items-center gap-2 px-2.5 transition"
                      >
                        <Download className="w-3.5 h-3.5" /> تصدير XML
                      </button>
                      <button
                        type="button"
                        onClick={() => setColsOpen(!colsOpen)}
                        className="w-full h-9 rounded-lg text-[12px] text-white/70 hover:bg-white/[0.06] flex items-center gap-2 px-2.5 transition"
                      >
                        <Settings className="w-3.5 h-3.5" /> تنظيم الأعمدة
                        <ChevronDown className={`w-3.5 h-3.5 mr-auto transition ${colsOpen ? 'rotate-180' : ''}`} />
                      </button>
                      {colsOpen && (
                        <div className="space-y-1 max-h-[140px] overflow-y-auto pr-1">
                          {empTableColumns.map((c) => (
                            <label
                              key={c.id}
                              className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[12px] text-white/70 hover:bg-white/[0.06] cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                checked={!!c.visible}
                                onChange={() => toggleEmpColumn(c.id)}
                                className="w-3.5 h-3.5 rounded accent-[#8B5CF6] cursor-pointer"
                              />
                              {c.label}
                            </label>
                          ))}
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          clearFilters();
                          setFilterOpen(false);
                        }}
                        className="w-full h-9 rounded-lg text-[12px] text-white/70 hover:bg-white/[0.06] flex items-center gap-2 px-2.5 transition"
                      >
                        <X className="w-3.5 h-3.5" /> مسح الفلاتر
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
            {searchTerm ? (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                title="مسح البحث"
                className="h-8 px-3 rounded-full bg-[#8B5CF6]/15 border border-[#8B5CF6]/20 text-[12px] text-[#A78BFA] flex items-center gap-1.5 hover:bg-[#8B5CF6]/25 transition"
              >
                <span className="w-5 h-5 rounded-full bg-[#8B5CF6] text-white flex items-center justify-center text-[10px] font-bold">
                  {filteredEmployees.length}
                </span>
                {searchTerm.length > 14 ? `${searchTerm.slice(0, 14)}…` : searchTerm}
                <X className="w-3 h-3" />
              </button>
            ) : null}
            <div className="hidden md:flex h-8 px-3 rounded-full bg-[#10B981]/10 border border-[#10B981]/20 text-[11px] text-[#6EE7B7] items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" />
              مزامنة حية
            </div>
          </div>
        </div>

        <div className="flex">
          <div className="flex-1 overflow-x-auto">
            <div className="min-w-[860px]">
              <div className="h-11 bg-white/[0.02] border-b border-white/[0.04] flex items-center px-5 text-[11px] text-white/30 font-medium gap-4">
                <div className="w-8 flex justify-center">
                  <input
                    type="checkbox"
                    checked={allChecked}
                    ref={(el) => {
                      if (el) el.indeterminate = someChecked;
                    }}
                    onChange={(e) => toggleAll(e.target.checked)}
                    className="w-4 h-4 rounded-[6px] bg-white/[0.06] border-white/[0.1] accent-[#8B5CF6] cursor-pointer"
                  />
                </div>
                <div className="flex-1 min-w-[200px]">الموظف</div>
                <div className="w-[120px]">القسم</div>
                <div className="w-[110px]">
                  <button type="button" onClick={() => handleSort('base_salary')} className="hover:text-white/80 transition">
                    الراتب{sortIcon('base_salary')}
                  </button>
                </div>
                <div className="w-[90px]">الحالة</div>
                <div className="w-[70px] text-center">التأمين</div>
                <div className="w-[100px]">
                  <button type="button" onClick={() => handleSort('employee_code')} className="hover:text-white/80 transition">
                    الرقم{sortIcon('employee_code')}
                  </button>
                </div>
                <div className="w-8" />
              </div>
              <div className="divide-y divide-white/[0.04]">
                {loading && filteredEmployees.length === 0 ? (
                  <div className="px-5 py-10 text-center text-[13px] text-white/40">جاري التحميل...</div>
                ) : filteredEmployees.length === 0 ? (
                  <div className="px-5 py-10 text-center text-[13px] text-white/40">لا توجد بيانات مطابقة</div>
                ) : (
                  filteredEmployees.map((emp) => {
                    const selected = panelEmp && String(panelEmp.id) === String(emp.id);
                    const dc = deptColor(emp.department_description || emp.department);
                    return (
                      <div
                        key={emp.id}
                        onClick={() => pickRow(emp)}
                        onDoubleClick={() => handleViewEmployee(emp)}
                        className={`h-14 flex items-center px-5 gap-4 text-[13px] border-b border-white/[0.04] hover:bg-white/[0.03] cursor-pointer transition group ${
                          selected ? 'bg-white/[0.04]' : ''
                        }`}
                      >
                        <div className="w-8 flex justify-center" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selectedRowKeys.includes(emp.id)}
                            onChange={(e) => toggleOne(emp, e.target.checked)}
                            className="w-4 h-4 rounded-[6px] bg-white/[0.06] border border-white/[0.1] accent-[#8B5CF6] cursor-pointer"
                          />
                        </div>
                        <div className="flex-1 min-w-[200px] flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-white/[0.08] border border-white/[0.06] flex items-center justify-center text-[12px] font-bold text-white shrink-0">
                            {initialsOf(emp.name_ar || emp.name).slice(0, 1)}
                          </div>
                          <div className="min-w-0">
                            <div className="font-medium leading-none truncate text-white">{emp.name_ar || emp.name}</div>
                            <div className="text-[11px] text-white/40 mt-1 truncate">{emp.position || emp.department || ''}</div>
                          </div>
                        </div>
                        <div className="w-[120px]">
                          <span
                            className="h-6 px-2.5 rounded-full border text-[11px] inline-flex items-center"
                            style={{ backgroundColor: dc.bg, borderColor: dc.border, color: dc.text }}
                          >
                            {(emp.department_description || emp.department || '-').slice(0, 18)}
                          </span>
                        </div>
                        <div className="w-[110px] text-white/80 font-medium">{fmt(emp.base_salary || 0)}</div>
                        <div className="w-[90px]">
                          <span
                            className={`h-6 px-2.5 rounded-full border text-[11px] inline-flex items-center gap-1 ${
                              isActive(emp)
                                ? 'bg-[#10B981]/15 border-[#10B981]/20 text-[#6EE7B7]'
                                : 'bg-[#EF4444]/15 border-[#EF4444]/30 text-[#FCA5A5]'
                            }`}
                          >
                            <span
                              className={`w-1 h-1 rounded-full ${isActive(emp) ? 'bg-[#10B981]' : 'bg-[#EF4444]'}`}
                            />
                            {isActive(emp) ? 'نشط' : 'غير نشط'}
                          </span>
                        </div>
                        <div className="w-[70px] flex justify-center">
                          <ShieldCheck
                            className={`w-4 h-4 ${insuredOf(emp.is_insured) ? 'text-[#10B981]' : 'text-white/20'}`}
                          />
                        </div>
                        <div className="w-[100px] text-white/40 font-mono text-[12px]">{emp.employee_code}</div>
                        <div
                          className="w-8 flex justify-center opacity-0 group-hover:opacity-100 transition relative"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            onClick={() => setRowMenuId(rowMenuId === emp.id ? null : emp.id)}
                            className="w-7 h-7 rounded-full hover:bg-white/[0.08] flex items-center justify-center text-white/40 hover:text-white transition"
                            aria-label="إجراءات"
                          >
                            <FiMoreVertical size={15} />
                          </button>
                          {rowMenuId === emp.id && (
                            <>
                              <div className="fixed inset-0 z-20" onClick={() => setRowMenuId(null)} />
                              <div className="absolute left-0 top-8 z-30 w-44 rounded-xl bg-[#0F172A] border border-[#1F2A44] shadow-xl py-1 text-right">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setRowMenuId(null);
                                    handleViewEmployee(emp);
                                  }}
                                  className="w-full px-3.5 py-2.5 text-[12px] text-white/70 hover:bg-white/[0.06] flex items-center gap-2 transition"
                                >
                                  <FiEye size={14} /> عرض
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setRowMenuId(null);
                                    handleEditEmployeeClick(emp);
                                  }}
                                  className="w-full px-3.5 py-2.5 text-[12px] text-white/70 hover:bg-white/[0.06] flex items-center gap-2 transition"
                                >
                                  <FiEdit size={14} /> تعديل
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setRowMenuId(null);
                                    handleCalculateSalary(emp);
                                  }}
                                  className="w-full px-3.5 py-2.5 text-[12px] text-white/70 hover:bg-white/[0.06] flex items-center gap-2 transition"
                                >
                                  <FiDollarSign size={14} /> احتساب راتب
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setRowMenuId(null);
                                    handleDeleteEmployee(emp);
                                  }}
                                  className="w-full px-3.5 py-2.5 text-[12px] text-red-300 hover:bg-red-500/10 flex items-center gap-2 transition"
                                >
                                  <FiTrash2 size={14} /> حذف
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* ===== Detail side panel ===== */}
          {panelEmp && (
            <div className="hidden xl:flex w-[380px] shrink-0 border-r border-white/[0.06] bg-[#0F1220]/80 flex-col relative overflow-hidden">
              <div className="bg-gradient-to-l from-[#8B5CF6] to-[#F59E0B] p-5 relative" style={{ minHeight: 96 }}>
                <div className="absolute inset-0 bg-black/10" />
                <div className="relative flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-12 h-12 rounded-full bg-white/20 border border-white/20 flex items-center justify-center text-[16px] font-bold text-white"
                      style={{ backdropFilter: 'blur(8px)' }}
                    >
                      {initialsOf(panelEmp.name_ar || panelEmp.name).slice(0, 1)}
                    </div>
                    <div>
                      <div className="font-bold text-white text-[15px]">{panelEmp.name_ar || panelEmp.name}</div>
                      <div className="text-white/70 text-[12px] mt-0.5">{panelEmp.position || panelEmp.department || ''}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      title="تعديل"
                      onClick={() => handleEditEmployeeClick(panelEmp)}
                      className="w-7 h-7 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center transition text-white"
                    >
                      <FiEdit size={13} />
                    </button>
                    <button
                      type="button"
                      title="حذف"
                      onClick={() => handleDeleteEmployee(panelEmp)}
                      className="w-7 h-7 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center transition text-white"
                    >
                      <FiTrash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
              <div className="p-5 space-y-5 flex-1 overflow-y-auto">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-white/[0.04] border border-white/[0.06] p-3">
                    <div className="text-[11px] text-white/40">القسم</div>
                    <div className="text-[13px] font-medium mt-1 text-white">
                      {panelEmp.department_description || panelEmp.department || '-'}
                    </div>
                  </div>
                  <div className="rounded-xl bg-white/[0.04] border border-white/[0.06] p-3">
                    <div className="text-[11px] text-white/40">الراتب</div>
                    <div className="text-[13px] font-medium mt-1 text-white">{fmt(panelEmp.base_salary || 0)}</div>
                  </div>
                  <div className="rounded-xl bg-white/[0.04] border border-white/[0.06] p-3">
                    <div className="text-[11px] text-white/40">الرقم الوظيفي</div>
                    <div className="text-[13px] font-mono mt-1 text-white">{panelEmp.employee_code}</div>
                  </div>
                  <div className="rounded-xl bg-white/[0.04] border border-white/[0.06] p-3">
                    <div className="text-[11px] text-white/40">الحالة</div>
                    <div className="text-[13px] font-medium mt-1 text-[#6EE7B7] flex items-center gap-1">
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${isActive(panelEmp) ? 'bg-[#10B981]' : 'bg-[#EF4444]'}`}
                      />
                      {isActive(panelEmp) ? 'نشط' : 'غير نشط'}
                    </div>
                  </div>
                </div>
                <div className="rounded-xl bg-white/[0.04] border border-white/[0.06] p-4">
                  <div className="text-[12px] font-semibold mb-3 text-white">معلومات التأمين</div>
                  <div className="flex items-center gap-2 text-[12px]">
                    <ShieldCheck
                      className={`w-4 h-4 ${insuredOf(panelEmp.is_insured) ? 'text-[#10B981]' : 'text-white/20'}`}
                    />
                    <span className={insuredOf(panelEmp.is_insured) ? 'text-white/70' : 'text-white/30'}>
                      {insuredOf(panelEmp.is_insured) ? 'مشمول بالتأمين الطبي' : 'غير مشمول'}
                    </span>
                  </div>
                  <div className="mt-3 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-l from-[#8B5CF6] to-[#F59E0B] rounded-full"
                      style={{ width: insuredOf(panelEmp.is_insured) ? '85%' : '8%' }}
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleViewEmployee(panelEmp)}
                    className="flex-1 h-10 rounded-xl bg-white text-[#0F1220] text-[13px] font-semibold hover:bg-white/90 transition"
                  >
                    عرض الملف
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      toast({ title: 'تنبيه', description: 'المراسلة الداخلية غير مفعلة حالياً', status: 'info', duration: 2500, isClosable: true })
                    }
                    className="flex-1 h-10 rounded-xl bg-white/[0.06] border border-white/[0.08] text-[13px] font-medium text-white hover:bg-white/[0.08] transition"
                  >
                    مراسلة
                  </button>
                </div>
                <div className="text-[11px] text-white/20 text-center pt-2">TimePay • نظام الموارد البشرية</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ===== Mobile detail card ===== */}
      {panelEmp && (
        <div className="xl:hidden rounded-[20px] bg-[#0F1220]/80 border border-white/[0.06] overflow-hidden">
          <div className="bg-gradient-to-l from-[#8B5CF6] to-[#F59E0B] p-4 flex items-center gap-3" style={{ minHeight: 72 }}>
            <div className="w-10 h-10 rounded-full bg-white/20 border border-white/20 flex items-center justify-center font-bold text-white">
              {initialsOf(panelEmp.name_ar || panelEmp.name).slice(0, 1)}
            </div>
            <div className="flex-1">
              <div className="font-bold text-[14px] text-white">{panelEmp.name_ar || panelEmp.name}</div>
              <div className="text-white/70 text-[11px]">
                {panelEmp.position || panelEmp.department || ''} • {panelEmp.employee_code}
              </div>
            </div>
            <div
              className={`h-6 px-2.5 rounded-full text-[11px] flex items-center gap-1 ${
                isActive(panelEmp) ? 'bg-white/20 text-white' : 'bg-black/30 text-white/70'
              }`}
            >
              <span className="w-1 h-1 rounded-full bg-white" />
              {isActive(panelEmp) ? 'نشط' : 'غير نشط'}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AuroraEmployees;
