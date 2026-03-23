'use client';

import React, { useState, useCallback, useEffect } from 'react';
import {
  User, Briefcase, Phone, CheckCircle, Upload,
  ChevronRight, ChevronLeft, ShieldCheck, Mail, MapPin,
  AlertCircle, X, Loader2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// ─── Validation Rules ─────────────────────────────────────────────────────────
const VALIDATORS = {
  firstName:      v => !v?.trim()                              ? 'First name is required'
                     : v.trim().length < 2                     ? 'Must be at least 2 characters'
                     : /[^a-zA-Z\s'-]/.test(v)                ? 'Only letters, hyphens and apostrophes'
                     : null,
  lastName:       v => !v?.trim()                              ? 'Last name is required'
                     : v.trim().length < 2                     ? 'Must be at least 2 characters'
                     : /[^a-zA-Z\s'-]/.test(v)                ? 'Only letters, hyphens and apostrophes'
                     : null,
  email:          v => !v?.trim()                              ? 'Email is required'
                     : !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)  ? 'Enter a valid email address'
                     : null,
  phone:          v => !v?.trim()                              ? 'Phone is required'
                     : !/^[+]?[\d\s\-()\\.]{7,20}$/.test(v)   ? 'Enter a valid phone number'
                     : null,
  address:        v => !v?.trim()                              ? 'Address is required'
                     : v.trim().length < 5                     ? 'Enter a complete address'
                     : null,
  department:     v => !v                                      ? 'Please select a department'  : null,
  jobTitle:       v => !v                                      ? 'Please select a designation' : null,
  startDate:      v => !v                                      ? 'Start date is required'
                     : new Date(v) < new Date(new Date().toDateString()) ? 'Cannot be in the past'
                     : null,
  salary:         v => !v                                      ? 'Salary is required'
                     : isNaN(Number(v)) || Number(v) <= 0      ? 'Enter a valid positive amount'
                     : Number(v) < 10000                       ? 'Minimum salary is ₹10,000'
                     : null,
  emergencyName:  v => !v?.trim()                              ? 'Contact name is required'
                     : v.trim().length < 2                     ? 'Must be at least 2 characters'
                     : null,
  emergencyPhone: v => !v?.trim()                              ? 'Contact phone is required'
                     : !/^[+]?[\d\s\-()\\.]{7,20}$/.test(v)   ? 'Enter a valid phone number'
                     : null,
  idDocument:     v => !v                                      ? 'Please upload an ID document'
                     : v.size > 5 * 1024 * 1024               ? 'File must be under 5 MB'
                     : !['image/jpeg','image/png','application/pdf'].includes(v.type)
                                                               ? 'Only JPG, PNG or PDF'
                     : null,
  hasReadPolicy:  v => !v                                      ? 'You must confirm the declaration' : null,
};

const STEP_FIELDS = {
  1: ['firstName', 'lastName', 'email', 'phone', 'address'],
  2: ['department', 'jobTitle', 'startDate', 'salary'],
  3: ['emergencyName', 'emergencyPhone', 'idDocument', 'hasReadPolicy'],
};

const INITIAL_FORM = {
  firstName: '', lastName: '', email: '', phone: '', address: '',
  jobTitle: '', department: '', startDate: '', salary: '',
  emergencyName: '', emergencyPhone: '', idDocument: null, hasReadPolicy: false,
};

// ─── API Submit ───────────────────────────────────────────────────────────────
async function submitOnboarding(formData, departments, designations) {
  const token   = localStorage.getItem('token') || '';
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  const deptMatch  = departments.find(d => d.name  === formData.department);
  const desigMatch = designations.find(d => d.title === formData.jobTitle);

  const datePart     = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const employeeCode = `EMP-${datePart}-${Math.floor(1000 + Math.random() * 9000)}`;

  const payload = {
    employeeCode,
    fullName:    `${formData.firstName.trim()} ${formData.lastName.trim()}`,
    email:       formData.email.trim(),
    phone:       formData.phone.trim(),
    address:     formData.address.trim(),
    joiningDate: formData.startDate,
    salary:      { basic: Number(formData.salary), hra: 0, allowances: 0 },
  };

  if (deptMatch?._id)  payload.department  = deptMatch._id;
  if (desigMatch?._id) payload.designation = desigMatch._id;

  const res  = await fetch('/api/hr/employees', { method: 'POST', headers, body: JSON.stringify(payload) });
  const data = await res.json();
  if (!data.success) throw new Error(data.message || 'Failed to create employee');

  if (formData.idDocument) {
    const fd = new FormData();
    fd.append('idDocument', formData.idDocument);
    try {
      await fetch(`/api/hr/employees/${data.data._id}/documents`, {
        method:  'PATCH',
        headers: { Authorization: `Bearer ${token}` },
        body:    fd,
      });
    } catch (e) {
      console.warn('Document upload failed:', e.message);
    }
  }

  return data.data;
}

// ─── Field Components ─────────────────────────────────────────────────────────
const FieldError = ({ message }) => (
  <AnimatePresence>
    {message && (
      <motion.p
        key="err"
        initial={{ opacity: 0, height: 0, marginTop: 0 }}
        animate={{ opacity: 1, height: 'auto', marginTop: 4 }}
        exit={   { opacity: 0, height: 0, marginTop: 0 }}
        className="flex items-center gap-1 text-xs font-medium text-rose-500"
      >
        <AlertCircle size={11} className="shrink-0" />{message}
      </motion.p>
    )}
  </AnimatePresence>
);

const Field = ({ label, name, type = 'text', icon: Icon, required, value, onChange, onBlur, error, touched, placeholder, ...rest }) => {
  const bad = touched && error;
  return (
    <div>
      <label className="block text-sm font-semibold text-slate-700 mb-1.5">
        {label}{required && <span className="text-rose-400 ml-0.5">*</span>}
      </label>
      <div className="relative">
        {Icon && <Icon size={15} className={`absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none ${bad ? 'text-rose-400' : 'text-slate-400'}`} />}
        <input
          name={name} type={type} value={value ?? ''}
          onChange={onChange} onBlur={onBlur} placeholder={placeholder}
          // Prevent Enter from triggering form submit on steps 1 & 2
          onKeyDown={e => { if (e.key === 'Enter') e.preventDefault(); }}
          className={`w-full ${Icon ? 'pl-9' : 'pl-3'} pr-9 py-2.5 text-sm rounded-xl border outline-none transition-all
            text-slate-800 placeholder:text-slate-400
            ${bad
              ? 'border-rose-400 bg-rose-50/60 focus:ring-2 focus:ring-rose-300/40'
              : 'border-slate-200 bg-slate-50 focus:ring-2 focus:ring-indigo-300/40 focus:border-indigo-500'
            }`}
          {...rest}
        />
        {bad && <AlertCircle size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-rose-400 pointer-events-none" />}
      </div>
      <FieldError message={bad ? error : null} />
    </div>
  );
};

const SelectField = ({ label, name, required, value, onChange, onBlur, error, touched, loading, children }) => {
  const bad = touched && error;
  return (
    <div>
      <label className="block text-sm font-semibold text-slate-700 mb-1.5">
        {label}{required && <span className="text-rose-400 ml-0.5">*</span>}
      </label>
      <div className="relative">
        <select
          name={name} value={value ?? ''} onChange={onChange} onBlur={onBlur} disabled={loading}
          className={`w-full pl-3 pr-8 py-2.5 text-sm rounded-xl border outline-none appearance-none transition-all
            text-slate-800 disabled:opacity-60
            ${bad
              ? 'border-rose-400 bg-rose-50/60 focus:ring-2 focus:ring-rose-300/40'
              : 'border-slate-200 bg-slate-50 focus:ring-2 focus:ring-indigo-300/40 focus:border-indigo-500'
            }`}
        >
          {children}
        </select>
        <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">▾</div>
      </div>
      <FieldError message={bad ? error : null} />
    </div>
  );
};

const StepIndicator = ({ step }) => (
  <div className="flex items-center justify-center gap-3 mb-8">
    {[1, 2, 3].map(n => (
      <React.Fragment key={n}>
        <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300 ${
          step > n   ? 'bg-emerald-500 text-white ring-4 ring-emerald-100' :
          step === n ? 'bg-indigo-600 text-white ring-4 ring-indigo-100' :
                      'bg-slate-100 text-slate-400'
        }`}>
          {step > n ? <CheckCircle size={16} /> : n}
        </div>
        {n < 3 && <div className={`h-1 w-10 rounded-full transition-all duration-500 ${step > n ? 'bg-emerald-400' : 'bg-slate-100'}`} />}
      </React.Fragment>
    ))}
  </div>
);

const PreviewItem = ({ icon: Icon, text }) => (
  <div className="flex items-center gap-2">
    <Icon size={12} className="text-slate-300 shrink-0" />
    <span className="text-xs font-medium text-slate-500 truncate">{text}</span>
  </div>
);

function SectionHeader({ icon: Icon, title }) {
  return (
    <div className="flex items-center gap-2 mb-5">
      <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
        <Icon size={16} className="text-indigo-600" />
      </div>
      <h3 className="font-black text-slate-800">{title}</h3>
    </div>
  );
}

const SuccessView = ({ onReset, name, employee }) => (
  <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
      className="bg-white p-12 rounded-3xl shadow-xl border border-slate-100 text-center max-w-sm w-full"
    >
      <motion.div
        initial={{ scale: 0 }} animate={{ scale: 1 }}
        transition={{ delay: 0.15, type: 'spring', stiffness: 220 }}
        className="w-20 h-20 bg-emerald-500 rounded-2xl flex items-center justify-center text-white mx-auto mb-6 shadow-lg shadow-emerald-200"
      >
        <CheckCircle size={36} />
      </motion.div>
      <h2 className="text-2xl font-black text-slate-900 mb-2">Enrolled!</h2>
      <p className="text-slate-500 text-sm mb-4">
        <span className="font-bold text-slate-800">{name || 'New Hire'}</span> has been successfully onboarded.
      </p>
      {employee?.employeeCode && (
        <div className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-700 rounded-xl px-4 py-2 mb-6 text-xs font-black uppercase tracking-widest">
          <CheckCircle size={12} />{employee.employeeCode}
        </div>
      )}
      <button onClick={onReset} className="w-full py-3.5 bg-slate-900 text-white font-black text-xs uppercase tracking-widest rounded-xl hover:bg-indigo-600 transition-all">
        Enroll Another
      </button>
    </motion.div>
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────
export default function EmployeeOnboarding() {
  const [step, setStep]                 = useState(1);
  const [formData, setFormData]         = useState(INITIAL_FORM);
  const [errors, setErrors]             = useState({});
  const [touched, setTouched]           = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted]   = useState(false);
  const [submitError, setSubmitError]   = useState('');
  const [created, setCreated]           = useState(null);
  const [departments, setDepartments]   = useState([]);
  const [designations, setDesignations] = useState([]);
  const [listsLoading, setListsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token') || '';
    const h = { Authorization: `Bearer ${token}` };
    Promise.all([
      fetch('/api/hr/departments',  { headers: h }).then(r => r.json()).catch(() => ({ success: false, data: [] })),
      fetch('/api/hr/designations', { headers: h }).then(r => r.json()).catch(() => ({ success: false, data: [] })),
    ]).then(([d, dg]) => {
      if (d.success)  setDepartments(d.data   || []);
      if (dg.success) setDesignations(dg.data || []);
    }).finally(() => setListsLoading(false));
  }, []);

  // ── Validation ──────────────────────────────────────────────────────────────
  const validateField = useCallback((name, value) => VALIDATORS[name]?.(value) ?? null, []);

  // Synchronous — computes result locally, THEN updates state
  // Returns true/false immediately without waiting for React re-render
  const validateStep = useCallback((stepNum) => {
    const fields      = STEP_FIELDS[stepNum] || [];
    const stepErrors  = {};
    const stepTouched = {};

    fields.forEach(f => {
      stepTouched[f] = true;
      const e = validateField(f, formData[f]);
      if (e) stepErrors[f] = e;
    });

    setTouched(prev => ({ ...prev, ...stepTouched }));
    setErrors(prev  => ({ ...prev, ...stepErrors  }));

    // ✅ return sync result — not dependent on setState flush
    return Object.keys(stepErrors).length === 0;
  }, [formData, validateField]);

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleChange = useCallback((e) => {
    const { name, value, type, checked, files } = e.target;
    const val = type === 'checkbox' ? checked : type === 'file' ? files[0] : value;
    setFormData(p => ({ ...p, [name]: val }));
    setTouched(p => {
      if (!p[name]) return p;
      const err = validateField(name, val);
      setErrors(prev => ({ ...prev, [name]: err ?? undefined }));
      return p;
    });
  }, [validateField]);

  const handleBlur = useCallback((e) => {
    const { name, value, type, checked } = e.target;
    const val = type === 'checkbox' ? checked : value;
    setTouched(p => ({ ...p, [name]: true }));
    const err = validateField(name, val);
    setErrors(p => ({ ...p, [name]: err ?? undefined }));
  }, [validateField]);

  const fieldProps = (name) => ({
    name,
    value:    formData[name],
    onChange: handleChange,
    onBlur:   handleBlur,
    error:    errors[name],
    touched:  touched[name],
  });

  // ✅ type="button" + e.preventDefault() — never triggers <form onSubmit>
  const handleNext = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (validateStep(step)) setStep(s => s + 1);
  };

  const handleBack = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setStep(s => s - 1);
  };

  // ✅ Only called on step 3 via form onSubmit
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (step !== 3) return;           // extra safety guard
    if (!validateStep(3)) return;

    setIsSubmitting(true);
    setSubmitError('');
    try {
      const emp = await submitOnboarding(formData, departments, designations);
      setCreated(emp);
      setIsSubmitted(true);
    } catch (err) {
      setSubmitError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setIsSubmitted(false); setStep(1); setFormData(INITIAL_FORM);
    setErrors({}); setTouched({}); setSubmitError(''); setCreated(null);
  };

  const stepErrorCount = (STEP_FIELDS[step] || []).filter(f => touched[f] && errors[f]).length;
  const pct = Math.round(
    Object.values(formData).filter(v => v !== '' && v !== false && v !== null).length
    / Object.keys(INITIAL_FORM).length * 100
  );

  if (isSubmitted) return <SuccessView onReset={handleReset} name={formData.firstName} employee={created} />;

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4">
      <div className="max-w-5xl mx-auto flex flex-col lg:flex-row gap-6 items-start">

        {/* ── Sidebar preview ── */}
        <aside className="lg:w-64 shrink-0 order-2 lg:order-1">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sticky top-10">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">Live Preview</p>
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-xl font-black mb-3 shadow-md shadow-indigo-200">
                {formData.firstName?.[0] || '?'}{formData.lastName?.[0] || ''}
              </div>
              <p className="font-black text-slate-900 text-sm">
                {formData.firstName || 'New'} {formData.lastName || 'Employee'}
              </p>
              <p className="text-indigo-500 font-semibold text-xs mt-0.5 mb-3">
                {formData.jobTitle || 'Designation'}
              </p>
              <div className="w-full space-y-2 pt-3 border-t border-slate-100 text-left">
                <PreviewItem icon={Mail}      text={formData.email      || 'email@company.com'} />
                <PreviewItem icon={Briefcase} text={formData.department || 'Department'} />
                <PreviewItem icon={MapPin}    text={formData.address    || 'Address not set'} />
                <PreviewItem icon={Phone}     text={formData.phone      || 'Phone'} />
              </div>
              <div className="w-full mt-4 pt-3 border-t border-slate-100">
                <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">
                  <span>Completion</span><span>{pct}%</span>
                </div>
                <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                  <motion.div className="h-full bg-indigo-500 rounded-full" animate={{ width: `${pct}%` }} transition={{ duration: 0.3 }} />
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* ── Form Card ── */}
        <div className="flex-1 min-w-0 order-1 lg:order-2">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">

            <div className="bg-slate-900 px-7 py-6 text-white relative overflow-hidden">
              <div className="relative z-10">
                <h1 className="text-xl font-black uppercase tracking-tight">
                  Talent <span className="text-indigo-400">Onboarding</span>
                </h1>
                <p className="text-slate-400 text-[10px] font-semibold uppercase tracking-[0.2em] mt-0.5">
                  Step {step} of 3 — {['Personal Information', 'Employment Details', 'Compliance & Safety'][step - 1]}
                </p>
              </div>
              <div className="absolute -top-8 -right-8 w-40 h-40 bg-indigo-500/10 rounded-full" />
            </div>

            <div className="p-7">
              <StepIndicator step={step} />

              <AnimatePresence>
                {stepErrorCount > 0 && (
                  <motion.div
                    key="banner"
                    initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                    className="flex items-center gap-2 bg-rose-50 border border-rose-200 text-rose-600 rounded-xl px-4 py-2.5 mb-5 text-sm font-semibold"
                  >
                    <AlertCircle size={14} className="shrink-0" />
                    Fix {stepErrorCount} error{stepErrorCount > 1 ? 's' : ''} to continue
                  </motion.div>
                )}
              </AnimatePresence>

              {/*
                KEY ARCHITECTURE:
                - <form onSubmit={handleSubmit}> only fires on the final step
                - Steps 1 & 2 "Continue" button is type="button" with onClick={handleNext}
                - handleNext calls e.preventDefault() + validateStep synchronously
                - Enter key is blocked on all <input> fields via onKeyDown
                - step !== 3 guard in handleSubmit as final safety net
              */}
              <form onSubmit={handleSubmit} noValidate>
                <AnimatePresence mode="wait">

                  {step === 1 && (
                    <motion.div key="s1"
                      initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}
                      className="space-y-4"
                    >
                      <SectionHeader icon={User} title="Personal Identification" />
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Field label="First Name" {...fieldProps('firstName')} required placeholder="John" />
                        <Field label="Last Name"  {...fieldProps('lastName')}  required placeholder="Doe" />
                      </div>
                      <Field label="Email Address" {...fieldProps('email')}   type="email" icon={Mail}  required placeholder="john@company.com" />
                      <Field label="Phone Number"  {...fieldProps('phone')}   type="tel"   icon={Phone} required placeholder="+91 98765 43210" />
                      <Field label="Address"       {...fieldProps('address')}              icon={MapPin} required placeholder="City, State, Country" />
                    </motion.div>
                  )}

                  {step === 2 && (
                    <motion.div key="s2"
                      initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}
                      className="space-y-4"
                    >
                      <SectionHeader icon={Briefcase} title="Employment Details" />
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <SelectField label="Department" {...fieldProps('department')} required loading={listsLoading}>
                          <option value="">— Select department —</option>
                          {departments.length > 0
                            ? departments.map(d => <option key={d._id} value={d.name}>{d.name}</option>)
                            : ['Engineering','Sales','Human Resources','Product','Finance','Marketing']
                                .map(n => <option key={n} value={n}>{n}</option>)
                          }
                        </SelectField>

                        <SelectField label="Designation" {...fieldProps('jobTitle')} required loading={listsLoading}>
                          <option value="">— Select designation —</option>
                          {designations.length > 0
                            ? designations.map(d => <option key={d._id} value={d.title}>{d.title}</option>)
                            : <option disabled value="">No designations — add them first</option>
                          }
                        </SelectField>

                        <Field label="Joining Date"      {...fieldProps('startDate')} type="date"   required />
                        <Field label="Annual Salary (₹)" {...fieldProps('salary')}    type="number" required placeholder="500000" min="0" step="1000" />
                      </div>
                    </motion.div>
                  )}

                  {step === 3 && (
                    <motion.div key="s3"
                      initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}
                      className="space-y-4"
                    >
                      <SectionHeader icon={ShieldCheck} title="Compliance & Safety" />

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Field label="Emergency Contact Name" {...fieldProps('emergencyName')}  required placeholder="Jane Doe" />
                        <Field label="Emergency Phone"        {...fieldProps('emergencyPhone')} type="tel" icon={Phone} required placeholder="+91 99999 88888" />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                          ID / Passport Document <span className="text-rose-400">*</span>
                          <span className="text-slate-400 font-normal text-xs ml-2">JPG · PNG · PDF · max 5 MB</span>
                        </label>
                        <div className={`relative border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer group ${
                          touched.idDocument && errors.idDocument
                            ? 'border-rose-400 bg-rose-50'
                            : formData.idDocument
                            ? 'border-emerald-400 bg-emerald-50'
                            : 'border-slate-200 hover:border-indigo-300 hover:bg-slate-50'
                        }`}>
                          <input
                            type="file" name="idDocument" accept=".jpg,.jpeg,.png,.pdf"
                            onChange={handleChange} onBlur={handleBlur}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          />
                          {formData.idDocument ? (
                            <div className="flex items-center justify-center gap-2">
                              <CheckCircle size={15} className="text-emerald-500 shrink-0" />
                              <span className="text-sm font-semibold text-emerald-700 truncate max-w-[220px]">
                                {formData.idDocument.name}
                              </span>
                              <button
                                type="button"
                                onClick={e => {
                                  e.stopPropagation();
                                  setFormData(p => ({ ...p, idDocument: null }));
                                  setTouched(p => ({ ...p, idDocument: true }));
                                  setErrors(p  => ({ ...p, idDocument: 'Please upload an ID document' }));
                                }}
                                className="text-slate-400 hover:text-rose-500 transition-colors"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          ) : (
                            <>
                              <Upload size={18} className={`mx-auto mb-1.5 transition-colors ${touched.idDocument && errors.idDocument ? 'text-rose-400' : 'text-slate-300 group-hover:text-indigo-400'}`} />
                              <p className="text-sm font-semibold text-slate-500">Click to browse or drag file here</p>
                            </>
                          )}
                        </div>
                        <FieldError message={touched.idDocument && errors.idDocument} />
                      </div>

                      <div className={`flex items-start gap-3 p-4 rounded-xl border transition-all ${
                        touched.hasReadPolicy && errors.hasReadPolicy
                          ? 'border-rose-300 bg-rose-50'
                          : 'border-slate-100 bg-slate-50'
                      }`}>
                        <input
                          type="checkbox" name="hasReadPolicy"
                          checked={formData.hasReadPolicy}
                          onChange={handleChange} onBlur={handleBlur}
                          className="w-4 h-4 mt-0.5 rounded accent-indigo-600 shrink-0 cursor-pointer"
                        />
                        <label className="text-xs font-semibold text-slate-500 leading-relaxed">
                          I confirm that all entries are legally accurate and valid, and I have read the company's onboarding policy.
                        </label>
                      </div>
                      <FieldError message={touched.hasReadPolicy && errors.hasReadPolicy} />
                    </motion.div>
                  )}
                </AnimatePresence>

                <AnimatePresence>
                  {submitError && (
                    <motion.div
                      key="apierr"
                      initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                      className="flex items-start gap-2 bg-rose-50 border border-rose-200 text-rose-600 rounded-xl px-4 py-3 mt-4 text-sm font-semibold"
                    >
                      <AlertCircle size={15} className="shrink-0 mt-0.5" />{submitError}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* ── Navigation ── */}
                <div className="flex justify-between items-center mt-7 pt-6 border-t border-slate-100">

                  {/* Back — always type="button" */}
                  {step > 1 ? (
                    <button type="button" onClick={handleBack}
                      className="flex items-center gap-1.5 text-xs font-black uppercase text-slate-400 hover:text-slate-700 transition-colors tracking-wide">
                      <ChevronLeft size={14} /> Back
                    </button>
                  ) : <div />}

                  {/* Steps 1 & 2 — type="button", NEVER submits the form */}
                  {step < 3 && (
                    <button type="button" onClick={handleNext}
                      className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase tracking-widest px-6 py-3 rounded-xl shadow-md shadow-indigo-200 transition-all">
                      Continue <ChevronRight size={14} />
                    </button>
                  )}

                  {/* Step 3 only — type="submit" */}
                  {step === 3 && (
                    <button type="submit" disabled={isSubmitting}
                      className="flex items-center gap-2 bg-slate-900 hover:bg-indigo-600 text-white text-xs font-black uppercase tracking-widest px-7 py-3 rounded-xl shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                      {isSubmitting
                        ? <><Loader2 size={14} className="animate-spin" /> Saving…</>
                        : 'Finalize Enrollment'
                      }
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}