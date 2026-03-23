// src/app/(dashboard)/admin/hr/employees/page.jsx
"use client";
import React, { useEffect, useState, useCallback } from "react";
import {
  Search, Plus, Eye, Pencil, Trash2, X, ChevronDown,
  User, Briefcase, Phone, Mail, MapPin, Building2,
  BadgeCheck, Loader2, AlertCircle, CheckCircle,
  Users, UserPlus, ChevronRight, ChevronLeft,
  ShieldCheck, Upload,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// ════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ════════════════════════════════════════════════════════════════════════
const EMPLOYMENT_TYPES = ["Full-Time","Part-Time","Intern","Contract"];
const STATUSES         = ["Active","Inactive","Resigned","Terminated"];
const GENDERS          = ["Male","Female","Other"];

const STATUS_STYLE = {
  Active:     { bg:"bg-emerald-50", text:"text-emerald-700", dot:"bg-emerald-500" },
  Inactive:   { bg:"bg-amber-50",   text:"text-amber-700",   dot:"bg-amber-500"   },
  Resigned:   { bg:"bg-slate-100",  text:"text-slate-600",   dot:"bg-slate-400"   },
  Terminated: { bg:"bg-rose-50",    text:"text-rose-700",    dot:"bg-rose-500"    },
};
const TYPE_STYLE = {
  "Full-Time":"bg-indigo-50 text-indigo-700",
  "Part-Time":"bg-violet-50 text-violet-700",
  "Intern":   "bg-cyan-50   text-cyan-700",
  "Contract": "bg-orange-50 text-orange-700",
};
const AVATAR_COLORS = [
  "from-indigo-400 to-indigo-600","from-violet-400 to-violet-600",
  "from-cyan-400 to-cyan-600",    "from-emerald-400 to-emerald-600",
  "from-rose-400 to-rose-600",    "from-amber-400 to-amber-600",
];

// ════════════════════════════════════════════════════════════════════════
// ONBOARDING CONSTANTS
// ════════════════════════════════════════════════════════════════════════
const OB_VALIDATORS = {
  firstName:      v => !v?.trim()?"First name is required":v.trim().length<2?"Min 2 characters":/[^a-zA-Z\s'-]/.test(v)?"Only letters allowed":null,
  lastName:       v => !v?.trim()?"Last name is required":v.trim().length<2?"Min 2 characters":/[^a-zA-Z\s'-]/.test(v)?"Only letters allowed":null,
  email:          v => !v?.trim()?"Email is required":!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)?"Enter a valid email":null,
  phone:          v => !v?.trim()?"Phone is required":!/^[+]?[\d\s\-()\\.]{7,20}$/.test(v)?"Enter a valid phone":null,
  address:        v => !v?.trim()?"Address is required":v.trim().length<5?"Enter a complete address":null,
  department:     v => !v?"Select a department":null,
  jobTitle:       v => !v?"Select a designation":null,
  startDate:      v => !v?"Start date is required":new Date(v)<new Date(new Date().toDateString())?"Cannot be in the past":null,
  salary:         v => !v?"Salary is required":isNaN(Number(v))||Number(v)<=0?"Enter valid amount":Number(v)<10000?"Min ₹10,000":null,
  emergencyName:  v => !v?.trim()?"Contact name is required":v.trim().length<2?"Min 2 characters":null,
  emergencyPhone: v => !v?.trim()?"Contact phone is required":!/^[+]?[\d\s\-()\\.]{7,20}$/.test(v)?"Enter a valid phone":null,
  idDocument:     v => !v?"Upload an ID document":v.size>5*1024*1024?"Max 5 MB":!["image/jpeg","image/png","application/pdf"].includes(v.type)?"JPG, PNG or PDF only":null,
  hasReadPolicy:  v => !v?"You must confirm the declaration":null,
};
const OB_STEP_FIELDS = {
  1:["firstName","lastName","email","phone","address"],
  2:["department","jobTitle","startDate","salary"],
  3:["emergencyName","emergencyPhone","idDocument","hasReadPolicy"],
};
const OB_INITIAL = {
  firstName:"",lastName:"",email:"",phone:"",address:"",
  jobTitle:"",department:"",startDate:"",salary:"",
  emergencyName:"",emergencyPhone:"",idDocument:null,hasReadPolicy:false,
};

// ════════════════════════════════════════════════════════════════════════
// AUTH HOOK
// ════════════════════════════════════════════════════════════════════════
function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const u = localStorage.getItem("user");
    if (u) setUser(JSON.parse(u));
    setLoading(false);
  }, []);

  const token = () =>
    typeof window !== "undefined" ? localStorage.getItem("token") : "";

 const can = useCallback((module, action) => {
  if (!user) return false;

  // Normalize strings for safer comparison
  const type = user.type?.toLowerCase();
  const roleName = (typeof user.role === 'string' ? user.role : user.role?.name)?.toLowerCase();

  // Master Access
  if (type === "company" || roleName === "admin") return true;

  // Module Access
  const mod = user.modules?.[module] || user.modules?.[module?.toLowerCase()];
  return mod?.selected && mod?.permissions?.[action] === true;
}, [user]);

  return { user, token, can, loading };
}

// ════════════════════════════════════════════════════════════════════════
// SHARED UI ATOMS
// ════════════════════════════════════════════════════════════════════════
function initials(n=""){return n.split(" ").map(w=>w[0]).slice(0,2).join("").toUpperCase();}
function avatarGrad(n=""){let h=0;for(let i=0;i<n.length;i++)h=n.charCodeAt(i)+((h<<5)-h);return AVATAR_COLORS[Math.abs(h)%AVATAR_COLORS.length];}

function Avatar({name,size="sm"}){
  const sz=size==="lg"?"w-14 h-14 text-xl":"w-9 h-9 text-sm";
  return <div className={`${sz} rounded-xl bg-gradient-to-br ${avatarGrad(name)} flex items-center justify-center text-white font-black shrink-0 shadow-sm`}>{initials(name)}</div>;
}
function StatusBadge({status}){
  const s=STATUS_STYLE[status]||STATUS_STYLE.Inactive;
  return <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${s.bg} ${s.text}`}><span className={`w-1.5 h-1.5 rounded-full ${s.dot}`}/>{status}</span>;
}
function TypeBadge({type}){
  return <span className={`inline-block text-xs font-semibold px-2.5 py-1 rounded-lg ${TYPE_STYLE[type]||"bg-slate-100 text-slate-600"}`}>{type}</span>;
}
function SectionDivider({children}){
  return <div className="flex items-center gap-3 my-5"><div className="h-px flex-1 bg-slate-100"/><span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{children}</span><div className="h-px flex-1 bg-slate-100"/></div>;
}
function FLabel({children,required}){
  return <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5">{children}{required&&<span className="text-rose-400 ml-0.5">*</span>}</label>;
}
function FInput({value,onChange,type="text",placeholder,disabled}){
  return <input type={type} value={value??""} onChange={onChange} placeholder={placeholder} disabled={disabled}
    className="w-full px-3 py-2.5 text-sm text-slate-800 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-300/40 focus:border-indigo-500 transition-all placeholder:text-slate-400 disabled:opacity-50"/>;
}
function FSelect({value,onChange,children,disabled}){
  return <div className="relative"><select value={value??""} onChange={onChange} disabled={disabled}
    className="w-full pl-3 pr-8 py-2.5 text-sm text-slate-800 bg-slate-50 border border-slate-200 rounded-xl outline-none appearance-none focus:ring-2 focus:ring-indigo-300/40 focus:border-indigo-500 transition-all disabled:opacity-50">
    {children}</select><ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"/></div>;
}
function ActionBtn({icon:Icon,onClick,title,color,spin}){
  const c={indigo:"hover:bg-indigo-50 hover:text-indigo-600",amber:"hover:bg-amber-50 hover:text-amber-600",rose:"hover:bg-rose-50 hover:text-rose-600"};
  return <button onClick={onClick} title={title} className={`w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 transition-all ${c[color]}`}><Icon size={14} className={spin?"animate-spin":""}/></button>;
}
function Modal({title,subtitle,onClose,children,wide}){
  return <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
    <div className={`bg-white rounded-2xl border border-slate-200 shadow-2xl flex flex-col ${wide?"w-full max-w-2xl":"w-full max-w-lg"} max-h-[92vh]`}>
      <div className="flex items-start justify-between px-6 py-5 border-b border-slate-100">
        <div><h2 className="text-base font-black text-slate-900">{title}</h2>{subtitle&&<p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}</div>
        <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-all"><X size={16}/></button>
      </div>
      <div className="overflow-y-auto flex-1 px-6 py-5">{children}</div>
    </div></div>;
}
function TabBtn({active,onClick,icon:Icon,label}){
  return <button onClick={onClick}
    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${active?"bg-indigo-600 text-white shadow-sm":"text-slate-500 hover:text-slate-800 hover:bg-slate-50"}`}>
    <Icon size={13}/>{label}</button>;
}

// ════════════════════════════════════════════════════════════════════════
// ONBOARDING TAB
// ════════════════════════════════════════════════════════════════════════
const OBFieldError=({message})=>(
  <AnimatePresence>{message&&<motion.p key="e" initial={{opacity:0,height:0,marginTop:0}} animate={{opacity:1,height:"auto",marginTop:4}} exit={{opacity:0,height:0,marginTop:0}} className="flex items-center gap-1 text-xs font-medium text-rose-500"><AlertCircle size={11} className="shrink-0"/>{message}</motion.p>}</AnimatePresence>
);

const OBField=({label,name,type="text",icon:Icon,required,value,onChange,onBlur,error,touched,placeholder,...rest})=>{
  const bad=touched&&error;
  return <div>
    <label className="block text-sm font-semibold text-slate-700 mb-1.5">{label}{required&&<span className="text-rose-400 ml-0.5">*</span>}</label>
    <div className="relative">
      {Icon&&<Icon size={15} className={`absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none ${bad?"text-rose-400":"text-slate-400"}`}/>}
      <input name={name} type={type} value={value??""} onChange={onChange} onBlur={onBlur} placeholder={placeholder}
        onKeyDown={e=>{if(e.key==="Enter")e.preventDefault();}}
        className={`w-full ${Icon?"pl-9":"pl-3"} pr-9 py-2.5 text-sm rounded-xl border outline-none transition-all text-slate-800 placeholder:text-slate-400 ${bad?"border-rose-400 bg-rose-50/60 focus:ring-2 focus:ring-rose-300/40":"border-slate-200 bg-slate-50 focus:ring-2 focus:ring-indigo-300/40 focus:border-indigo-500"}`}
        {...rest}/>
      {bad&&<AlertCircle size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-rose-400 pointer-events-none"/>}
    </div>
    <OBFieldError message={bad?error:null}/>
  </div>;
};

const OBSelectField=({label,name,required,value,onChange,onBlur,error,touched,loading,children})=>{
  const bad=touched&&error;
  return <div>
    <label className="block text-sm font-semibold text-slate-700 mb-1.5">{label}{required&&<span className="text-rose-400 ml-0.5">*</span>}</label>
    <div className="relative">
      <select name={name} value={value??""} onChange={onChange} onBlur={onBlur} disabled={loading}
        className={`w-full pl-3 pr-8 py-2.5 text-sm rounded-xl border outline-none appearance-none transition-all text-slate-800 disabled:opacity-60 ${bad?"border-rose-400 bg-rose-50/60 focus:ring-2 focus:ring-rose-300/40":"border-slate-200 bg-slate-50 focus:ring-2 focus:ring-indigo-300/40 focus:border-indigo-500"}`}>
        {children}
      </select>
      <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">▾</div>
    </div>
    <OBFieldError message={bad?error:null}/>
  </div>;
};

const OBStepIndicator=({step})=>(
  <div className="flex items-center justify-center gap-3 mb-8">
    {[1,2,3].map(n=>(
      <React.Fragment key={n}>
        <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300 ${step>n?"bg-emerald-500 text-white ring-4 ring-emerald-100":step===n?"bg-indigo-600 text-white ring-4 ring-indigo-100":"bg-slate-100 text-slate-400"}`}>
          {step>n?<CheckCircle size={16}/>:n}
        </div>
        {n<3&&<div className={`h-1 w-10 rounded-full transition-all duration-500 ${step>n?"bg-emerald-400":"bg-slate-100"}`}/>}
      </React.Fragment>
    ))}
  </div>
);

function OBSectionHeader({icon:Icon,title}){
  return <div className="flex items-center gap-2 mb-5"><div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center"><Icon size={16} className="text-indigo-600"/></div><h3 className="font-black text-slate-800">{title}</h3></div>;
}

async function submitOnboarding(formData,departments,designations){
  const token=localStorage.getItem("token")||"";
  const headers={"Content-Type":"application/json",Authorization:`Bearer ${token}`};
  const deptMatch=departments.find(d=>d.name===formData.department);
  const desigMatch=designations.find(d=>d.title===formData.jobTitle);
  const datePart=new Date().toISOString().slice(0,10).replace(/-/g,"");
  const employeeCode=`EMP-${datePart}-${Math.floor(1000+Math.random()*9000)}`;
  const payload={employeeCode,fullName:`${formData.firstName.trim()} ${formData.lastName.trim()}`,email:formData.email.trim(),phone:formData.phone.trim(),address:formData.address.trim(),joiningDate:formData.startDate,salary:{basic:Number(formData.salary),hra:0,allowances:0}};
  if(deptMatch?._id)payload.department=deptMatch._id;
  if(desigMatch?._id)payload.designation=desigMatch._id;
  const res=await fetch("/api/hr/employees",{method:"POST",headers,body:JSON.stringify(payload)});
  const data=await res.json();
  if(!data.success)throw new Error(data.message||"Failed to create employee");
  if(formData.idDocument){
    const fd=new FormData();fd.append("idDocument",formData.idDocument);
    try{await fetch(`/api/hr/employees/${data.data._id}/documents`,{method:"PATCH",headers:{Authorization:`Bearer ${token}`},body:fd});}
    catch(e){console.warn("Document upload failed:",e.message);}
  }
  return data.data;
}

function OnboardingTab({departments,designations,listsLoading,onSuccess}){
  const [step,setStep]         = useState(1);
  const [formData,setFormData] = useState(OB_INITIAL);
  const [errors,setErrors]     = useState({});
  const [touched,setTouched]   = useState({});
  const [submitting,setSubmitting] = useState(false);
  const [submitError,setSubmitError] = useState("");
  const [submitted,setSubmitted]   = useState(false);
  const [created,setCreated]       = useState(null);

  const validateField=useCallback((name,value)=>OB_VALIDATORS[name]?.(value)??null,[]);
  const validateStep=useCallback((stepNum)=>{
    const fields=OB_STEP_FIELDS[stepNum]||[];
    const errs={},tch={};
    fields.forEach(f=>{tch[f]=true;const e=validateField(f,formData[f]);if(e)errs[f]=e;});
    setTouched(p=>({...p,...tch}));setErrors(p=>({...p,...errs}));
    return Object.keys(errs).length===0;
  },[formData,validateField]);

  const handleChange=useCallback((e)=>{
    const{name,value,type,checked,files}=e.target;
    const val=type==="checkbox"?checked:type==="file"?files[0]:value;
    setFormData(p=>({...p,[name]:val}));
    setTouched(p=>{if(!p[name])return p;const err=validateField(name,val);setErrors(prev=>({...prev,[name]:err??undefined}));return p;});
  },[validateField]);

  const handleBlur=useCallback((e)=>{
    const{name,value,type,checked}=e.target;const val=type==="checkbox"?checked:value;
    setTouched(p=>({...p,[name]:true}));const err=validateField(name,val);setErrors(p=>({...p,[name]:err??undefined}));
  },[validateField]);

  const fp=(name)=>({name,value:formData[name],onChange:handleChange,onBlur:handleBlur,error:errors[name],touched:touched[name]});
  const handleNext=(e)=>{e.preventDefault();e.stopPropagation();if(validateStep(step))setStep(s=>s+1);};
  const handleBack=(e)=>{e.preventDefault();e.stopPropagation();setStep(s=>s-1);};
  const handleSubmit=async(e)=>{
    e.preventDefault();if(step!==3)return;if(!validateStep(3))return;
    setSubmitting(true);setSubmitError("");
    try{const emp=await submitOnboarding(formData,departments,designations);setCreated(emp);setSubmitted(true);onSuccess();}
    catch(err){setSubmitError(err.message||"Something went wrong.");}
    finally{setSubmitting(false);}
  };
  const handleReset=()=>{setSubmitted(false);setStep(1);setFormData(OB_INITIAL);setErrors({});setTouched({});setSubmitError("");setCreated(null);};

  const stepErrCount=(OB_STEP_FIELDS[step]||[]).filter(f=>touched[f]&&errors[f]).length;
  const pct=Math.round(Object.values(formData).filter(v=>v!==""&&v!==false&&v!==null).length/Object.keys(OB_INITIAL).length*100);

  if(submitted){
    return (
      <div className="flex items-center justify-center py-16">
        <motion.div initial={{scale:0.9,opacity:0}} animate={{scale:1,opacity:1}}
          className="bg-white border border-slate-200 p-10 rounded-2xl shadow-sm text-center max-w-sm w-full">
          <motion.div initial={{scale:0}} animate={{scale:1}} transition={{delay:0.15,type:"spring",stiffness:220}}
            className="w-16 h-16 bg-emerald-500 rounded-2xl flex items-center justify-center text-white mx-auto mb-5 shadow-lg shadow-emerald-200">
            <CheckCircle size={30}/>
          </motion.div>
          <h2 className="text-xl font-black text-slate-900 mb-1">Enrolled!</h2>
          <p className="text-slate-500 text-sm mb-3"><span className="font-bold text-slate-800">{formData.firstName}</span> has been successfully onboarded.</p>
          {created?.employeeCode&&<div className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-700 rounded-xl px-4 py-2 mb-5 text-xs font-black uppercase tracking-widest"><CheckCircle size={11}/>{created.employeeCode}</div>}
          <button onClick={handleReset} className="w-full py-3 bg-slate-900 text-white font-black text-xs uppercase tracking-widest rounded-xl hover:bg-indigo-600 transition-all">Enroll Another</button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6 items-start">
      {/* Sidebar */}
      <aside className="lg:w-56 shrink-0 order-2 lg:order-1">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sticky top-4">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">Live Preview</p>
          <div className="flex flex-col items-center text-center">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-lg font-black mb-2.5 shadow-md shadow-indigo-200">
              {formData.firstName?.[0]||"?"}{formData.lastName?.[0]||""}
            </div>
            <p className="font-black text-slate-900 text-sm">{formData.firstName||"New"} {formData.lastName||"Employee"}</p>
            <p className="text-indigo-500 font-semibold text-xs mt-0.5 mb-3">{formData.jobTitle||"Designation"}</p>
            <div className="w-full space-y-2 pt-3 border-t border-slate-100 text-left">
              {[[Mail,formData.email||"email@company.com"],[Briefcase,formData.department||"Department"],[MapPin,formData.address||"Address"],[Phone,formData.phone||"Phone"]].map(([Icon,text],i)=>(
                <div key={i} className="flex items-center gap-2"><Icon size={12} className="text-slate-300 shrink-0"/><span className="text-xs font-medium text-slate-500 truncate">{text}</span></div>
              ))}
            </div>
            <div className="w-full mt-4 pt-3 border-t border-slate-100">
              <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1"><span>Completion</span><span>{pct}%</span></div>
              <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <motion.div className="h-full bg-indigo-500 rounded-full" animate={{width:`${pct}%`}} transition={{duration:0.3}}/>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Form card */}
      <div className="flex-1 min-w-0 order-1 lg:order-2">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-slate-900 px-6 py-5 text-white relative overflow-hidden">
            <div className="relative z-10">
              <h2 className="text-base font-black uppercase tracking-tight">Talent <span className="text-indigo-400">Onboarding</span></h2>
              <p className="text-slate-400 text-[10px] font-semibold uppercase tracking-[0.2em] mt-0.5">Step {step} of 3 — {["Personal Information","Employment Details","Compliance & Safety"][step-1]}</p>
            </div>
            <div className="absolute -top-6 -right-6 w-32 h-32 bg-indigo-500/10 rounded-full"/>
          </div>
          <div className="p-6">
            <OBStepIndicator step={step}/>
            <AnimatePresence>
              {stepErrCount>0&&<motion.div key="b" initial={{opacity:0,y:-6}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-6}}
                className="flex items-center gap-2 bg-rose-50 border border-rose-200 text-rose-600 rounded-xl px-4 py-2.5 mb-5 text-sm font-semibold">
                <AlertCircle size={14} className="shrink-0"/>Fix {stepErrCount} error{stepErrCount>1?"s":""} to continue</motion.div>}
            </AnimatePresence>
            <form onSubmit={handleSubmit} noValidate>
              <AnimatePresence mode="wait">
                {step===1&&<motion.div key="s1" initial={{opacity:0,x:20}} animate={{opacity:1,x:0}} exit={{opacity:0,x:-20}} transition={{duration:0.2}} className="space-y-4">
                  <OBSectionHeader icon={User} title="Personal Identification"/>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <OBField label="First Name" {...fp("firstName")} required placeholder="John"/>
                    <OBField label="Last Name"  {...fp("lastName")}  required placeholder="Doe"/>
                  </div>
                  <OBField label="Email"   {...fp("email")}   type="email" icon={Mail}  required placeholder="john@company.com"/>
                  <OBField label="Phone"   {...fp("phone")}   type="tel"   icon={Phone} required placeholder="+91 98765 43210"/>
                  <OBField label="Address" {...fp("address")}              icon={MapPin} required placeholder="City, State, Country"/>
                </motion.div>}

                {step===2&&<motion.div key="s2" initial={{opacity:0,x:20}} animate={{opacity:1,x:0}} exit={{opacity:0,x:-20}} transition={{duration:0.2}} className="space-y-4">
                  <OBSectionHeader icon={Briefcase} title="Employment Details"/>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <OBSelectField label="Department" {...fp("department")} required loading={listsLoading}>
                      <option value="">— Select department —</option>
                      {departments.length>0?departments.map(d=><option key={d._id} value={d.name}>{d.name}</option>):["Engineering","Sales","Human Resources","Product","Finance","Marketing"].map(n=><option key={n} value={n}>{n}</option>)}
                    </OBSelectField>
                    <OBSelectField label="Designation" {...fp("jobTitle")} required loading={listsLoading}>
                      <option value="">— Select designation —</option>
                      {designations.map(d=><option key={d._id} value={d.title}>{d.title}</option>)}
                    </OBSelectField>
                    <OBField label="Joining Date"      {...fp("startDate")} type="date"   required/>
                    <OBField label="Annual Salary (₹)" {...fp("salary")}    type="number" required placeholder="500000" min="0" step="1000"/>
                  </div>
                </motion.div>}

                {step===3&&<motion.div key="s3" initial={{opacity:0,x:20}} animate={{opacity:1,x:0}} exit={{opacity:0,x:-20}} transition={{duration:0.2}} className="space-y-4">
                  <OBSectionHeader icon={ShieldCheck} title="Compliance & Safety"/>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <OBField label="Emergency Contact" {...fp("emergencyName")}  required placeholder="Jane Doe"/>
                    <OBField label="Emergency Phone"   {...fp("emergencyPhone")} type="tel" icon={Phone} required placeholder="+91 99999 88888"/>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-1.5">ID / Passport <span className="text-rose-400">*</span><span className="text-slate-400 font-normal text-xs ml-2">JPG · PNG · PDF · max 5 MB</span></label>
                    <div className={`relative border-2 border-dashed rounded-xl p-5 text-center transition-all cursor-pointer group ${touched.idDocument&&errors.idDocument?"border-rose-400 bg-rose-50":formData.idDocument?"border-emerald-400 bg-emerald-50":"border-slate-200 hover:border-indigo-300 hover:bg-slate-50"}`}>
                      <input type="file" name="idDocument" accept=".jpg,.jpeg,.png,.pdf" onChange={handleChange} onBlur={handleBlur} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"/>
                      {formData.idDocument?(
                        <div className="flex items-center justify-center gap-2">
                          <CheckCircle size={14} className="text-emerald-500 shrink-0"/>
                          <span className="text-sm font-semibold text-emerald-700 truncate max-w-[200px]">{formData.idDocument.name}</span>
                          <button type="button" onClick={e=>{e.stopPropagation();setFormData(p=>({...p,idDocument:null}));setTouched(p=>({...p,idDocument:true}));setErrors(p=>({...p,idDocument:"Upload an ID document"}));}} className="text-slate-400 hover:text-rose-500 transition-colors"><X size={13}/></button>
                        </div>
                      ):(
                        <><Upload size={16} className={`mx-auto mb-1.5 transition-colors ${touched.idDocument&&errors.idDocument?"text-rose-400":"text-slate-300 group-hover:text-indigo-400"}`}/><p className="text-sm font-semibold text-slate-500">Click to browse or drag here</p></>
                      )}
                    </div>
                    <OBFieldError message={touched.idDocument&&errors.idDocument}/>
                  </div>
                  <div className={`flex items-start gap-3 p-4 rounded-xl border transition-all ${touched.hasReadPolicy&&errors.hasReadPolicy?"border-rose-300 bg-rose-50":"border-slate-100 bg-slate-50"}`}>
                    <input type="checkbox" name="hasReadPolicy" checked={formData.hasReadPolicy} onChange={handleChange} onBlur={handleBlur} className="w-4 h-4 mt-0.5 rounded accent-indigo-600 shrink-0 cursor-pointer"/>
                    <label className="text-xs font-semibold text-slate-500 leading-relaxed">I confirm all entries are legally accurate and I have read the company's onboarding policy.</label>
                  </div>
                  <OBFieldError message={touched.hasReadPolicy&&errors.hasReadPolicy}/>
                </motion.div>}
              </AnimatePresence>

              <AnimatePresence>
                {submitError&&<motion.div key="ae" initial={{opacity:0,y:-6}} animate={{opacity:1,y:0}} exit={{opacity:0}}
                  className="flex items-start gap-2 bg-rose-50 border border-rose-200 text-rose-600 rounded-xl px-4 py-3 mt-4 text-sm font-semibold">
                  <AlertCircle size={14} className="shrink-0 mt-0.5"/>{submitError}</motion.div>}
              </AnimatePresence>

              <div className="flex justify-between items-center mt-6 pt-5 border-t border-slate-100">
                {step>1?<button type="button" onClick={handleBack} className="flex items-center gap-1.5 text-xs font-black uppercase text-slate-400 hover:text-slate-700 transition-colors tracking-wide"><ChevronLeft size={14}/>Back</button>:<div/>}
                {step<3&&<button type="button" onClick={handleNext} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase tracking-widest px-5 py-2.5 rounded-xl shadow-md shadow-indigo-200 transition-all">Continue <ChevronRight size={13}/></button>}
                {step===3&&<button type="submit" disabled={submitting} className="flex items-center gap-2 bg-slate-900 hover:bg-indigo-600 text-white text-xs font-black uppercase tracking-widest px-6 py-2.5 rounded-xl shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                  {submitting?<><Loader2 size={13} className="animate-spin"/>Saving…</>:"Finalize Enrollment"}</button>}
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ════════════════════════════════════════════════════════════════════════
export default function EmployeesPage(){
  const{token,can}=useAuth();
  const[activeTab,setActiveTab]=useState("list");
  const[employees,setEmployees]=useState([]);
  const[departments,setDepts]=useState([]);
  const[designations,setDesigs]=useState([]);
  const[loading,setLoading]=useState(true);
  const[search,setSearch]=useState("");
  const[filterStatus,setFilter]=useState("all");
  const[showModal,setShowModal]=useState(false);
  const[editEmp,setEditEmp]=useState(null);
  const[form,setForm]=useState({});
  const[saving,setSaving]=useState(false);
  const[saveError,setSaveError]=useState("");
  const[viewEmp,setViewEmp]=useState(null);
  const[deleting,setDeleting]=useState(null);
  const[deleteTarget,setDeleteTarget]=useState(null); // { _id, fullName }
  const[listsLoading,setListsLoading]=useState(true);

  useEffect(()=>{load();},[]);

  async function load(){
    setLoading(true);setListsLoading(true);
    try{
      const h={Authorization:`Bearer ${token()}`};
      const[eR,dR,dgR]=await Promise.all([fetch("/api/hr/employees",{headers:h}),fetch("/api/hr/departments",{headers:h}),fetch("/api/hr/designations",{headers:h})]);
      const[e,d,dg]=await Promise.all([eR.json(),dR.json(),dgR.json()]);
      setEmployees(e.data||[]);setDepts(d.data||[]);setDesigs(dg.data||[]);
    }finally{setLoading(false);setListsLoading(false);}
  }

  function openCreate(){setEditEmp(null);setSaveError("");setForm({status:"Active",employmentType:"Full-Time",gender:"Male"});setShowModal(true);}
  function openEdit(emp){
    setEditEmp(emp);setSaveError("");
    setForm({fullName:emp.fullName,email:emp.email,phone:emp.phone,gender:emp.gender,dob:emp.dob?.slice(0,10),
      department:emp.department?._id||emp.department,designation:emp.designation?._id||emp.designation,
      joiningDate:emp.joiningDate?.slice(0,10),employmentType:emp.employmentType,status:emp.status,address:emp.address,employeeCode:emp.employeeCode,
      "salary.basic":emp.salary?.basic,"salary.hra":emp.salary?.hra,"salary.allowances":emp.salary?.allowances,
      "bank.accountNumber":emp.bank?.accountNumber,"bank.ifsc":emp.bank?.ifsc,"bank.bankName":emp.bank?.bankName});
    setShowModal(true);
  }

  const f=(key)=>({value:form[key]??"",onChange:(e)=>setForm(p=>({...p,[key]:e.target.value}))});

  async function save(){
    setSaving(true);setSaveError("");
    try{
      const body={...form,salary:{basic:form["salary.basic"],hra:form["salary.hra"],allowances:form["salary.allowances"]},bank:{accountNumber:form["bank.accountNumber"],ifsc:form["bank.ifsc"],bankName:form["bank.bankName"]}};
      const url=editEmp?`/api/hr/employees/${editEmp._id}`:"/api/hr/employees";
      const res=await fetch(url,{method:editEmp?"PUT":"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${token()}`},body:JSON.stringify(body)});
      const data=await res.json();
      if(data.success){setShowModal(false);load();}else setSaveError(data.message||"Failed to save");
    }finally{setSaving(false);}
  }

  async function del(id){
    setDeleting(id);setDeleteTarget(null);
    try{await fetch(`/api/hr/employees/${id}`,{method:"DELETE",headers:{Authorization:`Bearer ${token()}`}});load();}
    finally{setDeleting(null);}
  }

  const filtered=employees.filter(e=>{
    const q=search.toLowerCase();
    return(e.fullName?.toLowerCase().includes(q)||e.employeeCode?.toLowerCase().includes(q)||e.email?.toLowerCase().includes(q))&&(filterStatus==="all"||e.status===filterStatus);
  });
  const stats=STATUSES.map(s=>({label:s,count:employees.filter(e=>e.status===s).length}));

  return(
    <div className="min-h-screen bg-slate-50 p-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">HR / Employees</p>
          <h1 className="text-2xl font-black text-slate-900">Employees<span className="ml-2 text-sm font-bold bg-slate-100 text-slate-500 rounded-lg px-2.5 py-0.5">{employees.length}</span></h1>
        </div>
        {/* Tab switcher */}
        <div className="flex items-center bg-white border border-slate-200 rounded-xl p-1 shadow-sm gap-1">
          <TabBtn active={activeTab==="list"}    onClick={()=>setActiveTab("list")}    icon={Users}    label="Employee List"/>
          <TabBtn active={activeTab==="onboard"} onClick={()=>setActiveTab("onboard")} icon={UserPlus} label="Onboard New"/>
        </div>
      </div>

      {/* LIST TAB */}
      {activeTab==="list"&&(
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
            {stats.map(({label,count})=>{const s=STATUS_STYLE[label];return(
              <div key={label} className="bg-white rounded-xl border border-slate-200 shadow-sm px-4 py-3 flex items-center gap-3">
                <span className={`w-2.5 h-2.5 rounded-full ${s.dot} shrink-0`}/>
                <div><div className="text-xl font-black text-slate-900">{count}</div><div className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</div></div>
              </div>
            );})}
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-4 py-3 flex flex-wrap gap-3 mb-4 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"/>
              <input className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-300/40 focus:border-indigo-500 transition-all placeholder:text-slate-400 text-slate-800"
                placeholder="Search name, code, email…" value={search} onChange={e=>setSearch(e.target.value)}/>
            </div>
            <div className="relative">
              <select value={filterStatus} onChange={e=>setFilter(e.target.value)}
                className="pl-3 pr-8 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg outline-none appearance-none focus:ring-2 focus:ring-indigo-300/40 focus:border-indigo-500 text-slate-700 font-medium">
                <option value="all">All Status</option>{STATUSES.map(s=><option key={s}>{s}</option>)}
              </select>
              <ChevronDown size={12} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400"/>
            </div>
            {(search||filterStatus!=="all")&&<button onClick={()=>{setSearch("");setFilter("all");}} className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-700 transition-colors"><X size={12}/>Clear</button>}
            <div className="ml-auto flex items-center gap-2">
              <span className="text-xs text-slate-400 font-medium">{filtered.length} result{filtered.length!==1?"s":""}</span>
              {can("employees","create")&&<button onClick={openCreate} className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase tracking-widest px-4 py-2 rounded-lg shadow-sm shadow-indigo-200 transition-all"><Plus size={12}/>Add</button>}
            </div>
          </div>



          {loading?(
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex items-center justify-center py-20"><Loader2 size={24} className="animate-spin text-indigo-400"/></div>
          ):(
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <table className="w-full border-collapse text-sm">
                <thead><tr className="border-b border-slate-100">
                  {["Employee","Department","Designation","Type","Status","Actions"].map(h=><th key={h} className="px-5 py-3.5 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">{h}</th>)}
                </tr></thead>
                <tbody>
                  {filtered.map(emp=>(
                    <tr key={emp._id} className="border-b border-slate-50 hover:bg-slate-50/70 transition-colors group">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <Avatar name={emp.fullName}/>
                          <div>
                            <div className="font-bold text-slate-900 text-sm">{emp.fullName}</div>
                            <div className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                              <span className="font-mono bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded text-[10px]">{emp.employeeCode}</span>
                              <span className="truncate max-w-[130px]">{emp.email}</span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5"><div className="flex items-center gap-1.5 text-slate-600 text-sm"><Building2 size={12} className="text-slate-300"/>{emp.department?.name||<span className="text-slate-300">—</span>}</div></td>
                      <td className="px-5 py-3.5 text-slate-600 text-sm">{emp.designation?.title||<span className="text-slate-300">—</span>}</td>
                      <td className="px-5 py-3.5"><TypeBadge type={emp.employmentType}/></td>
                      <td className="px-5 py-3.5"><StatusBadge status={emp.status}/></td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1">
                          <ActionBtn icon={Eye}    onClick={()=>setViewEmp(emp)}  title="View"   color="indigo"/>
                         <ActionBtn icon={Pencil} onClick={()=>openEdit(emp)}  title="Edit"   color="amber"/>
                          <ActionBtn icon={deleting===emp._id?Loader2:Trash2} onClick={()=>setDeleteTarget(emp)} title="Delete" color="rose" spin={deleting===emp._id}/>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!filtered.length&&<tr><td colSpan={6} className="text-center py-16 text-slate-400 text-sm"><div className="flex flex-col items-center gap-2"><User size={32} className="text-slate-200"/>No employees found</div></td></tr>}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* ONBOARD TAB */}
      {activeTab==="onboard"&&(
        <OnboardingTab departments={departments} designations={designations} listsLoading={listsLoading}
          onSuccess={()=>{load();setActiveTab("list");}}/>
      )}

      {/* Edit/Create Modal */}
      {showModal&&(
        <Modal title={editEmp?"Edit Employee":"Add Employee"} subtitle={editEmp?`Editing ${editEmp.fullName}`:"Register a new employee"} onClose={()=>setShowModal(false)} wide>
          <SectionDivider>Personal Information</SectionDivider>
          <div className="grid grid-cols-2 gap-4">
            <div><FLabel required>Full Name</FLabel><FInput {...f("fullName")} placeholder="John Doe"/></div>
            <div><FLabel required>Employee Code</FLabel><FInput {...f("employeeCode")} placeholder="EMP-001"/></div>
            <div><FLabel required>Email</FLabel><FInput {...f("email")} type="email" placeholder="john@company.com"/></div>
            <div><FLabel>Phone</FLabel><FInput {...f("phone")} placeholder="+91 98765 43210"/></div>
            <div><FLabel>Gender</FLabel><FSelect {...f("gender")}>{GENDERS.map(g=><option key={g}>{g}</option>)}</FSelect></div>
            <div><FLabel>Date of Birth</FLabel><FInput {...f("dob")} type="date"/></div>
            <div className="col-span-2"><FLabel>Address</FLabel><FInput {...f("address")} placeholder="City, State, Country"/></div>
          </div>
          <SectionDivider>Employment Details</SectionDivider>
          <div className="grid grid-cols-2 gap-4">
            <div><FLabel required>Department</FLabel><FSelect {...f("department")}><option value="">— Select —</option>{departments.map(d=><option key={d._id} value={d._id}>{d.name}</option>)}</FSelect></div>
            <div><FLabel required>Designation</FLabel><FSelect {...f("designation")}><option value="">— Select —</option>{designations.map(d=><option key={d._id} value={d._id}>{d.title}</option>)}</FSelect></div>
            <div><FLabel required>Joining Date</FLabel><FInput {...f("joiningDate")} type="date"/></div>
            <div><FLabel>Employment Type</FLabel><FSelect {...f("employmentType")}>{EMPLOYMENT_TYPES.map(t=><option key={t}>{t}</option>)}</FSelect></div>
            <div><FLabel>Status</FLabel><FSelect {...f("status")}>{STATUSES.map(s=><option key={s}>{s}</option>)}</FSelect></div>
          </div>
          <SectionDivider>Salary</SectionDivider>
          <div className="grid grid-cols-3 gap-4">
            <div><FLabel>Basic (₹)</FLabel><FInput {...f("salary.basic")} type="number" placeholder="0"/></div>
            <div><FLabel>HRA (₹)</FLabel><FInput {...f("salary.hra")} type="number" placeholder="0"/></div>
            <div><FLabel>Allowances (₹)</FLabel><FInput {...f("salary.allowances")} type="number" placeholder="0"/></div>
          </div>
          <SectionDivider>Bank Details</SectionDivider>
          <div className="grid grid-cols-3 gap-4">
            <div><FLabel>Account Number</FLabel><FInput {...f("bank.accountNumber")} placeholder="XXXXXXXXXXXX"/></div>
            <div><FLabel>IFSC</FLabel><FInput {...f("bank.ifsc")} placeholder="SBIN0001234"/></div>
            <div><FLabel>Bank Name</FLabel><FInput {...f("bank.bankName")} placeholder="State Bank of India"/></div>
          </div>
          {saveError&&<div className="flex items-center gap-2 bg-rose-50 border border-rose-200 text-rose-600 rounded-xl px-4 py-3 mt-4 text-sm font-semibold"><AlertCircle size={14} className="shrink-0"/>{saveError}</div>}
          <div className="flex justify-end gap-3 mt-5 pt-5 border-t border-slate-100">
            <button onClick={()=>setShowModal(false)} className="px-5 py-2.5 text-xs font-black uppercase tracking-widest text-slate-500 hover:text-slate-800 border border-slate-200 rounded-xl transition-all">Cancel</button>
            <button onClick={save} disabled={saving} className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase tracking-widest rounded-xl shadow-md shadow-indigo-200 transition-all disabled:opacity-50">
              {saving?<><Loader2 size={13} className="animate-spin"/>Saving…</>:`${editEmp?"Update":"Create"} Employee`}
            </button>
          </div>
        </Modal>
      )}

      {/* View Modal */}
      {viewEmp&&(
        <Modal title="Employee Profile" subtitle={viewEmp.employeeCode} onClose={()=>setViewEmp(null)} wide>
          <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl border border-slate-100 mb-5">
            <Avatar name={viewEmp.fullName} size="lg"/>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-black text-slate-900">{viewEmp.fullName}</h3>
              <p className="text-sm text-indigo-600 font-semibold">{viewEmp.designation?.title||"—"}</p>
              <div className="flex items-center gap-2 mt-2 flex-wrap"><StatusBadge status={viewEmp.status}/>{viewEmp.employmentType&&<TypeBadge type={viewEmp.employmentType}/>}</div>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[[Mail,"Email",viewEmp.email],[Phone,"Phone",viewEmp.phone],[MapPin,"Address",viewEmp.address],[Building2,"Department",viewEmp.department?.name],[Briefcase,"Employment Type",viewEmp.employmentType],[BadgeCheck,"Joining Date",viewEmp.joiningDate?.slice(0,10)],[User,"Gender",viewEmp.gender],[User,"Date of Birth",viewEmp.dob?.slice(0,10)]].map(([Icon,label,value])=>(
              <div key={label} className="bg-white border border-slate-100 rounded-xl p-3">
                <div className="flex items-center gap-1.5 mb-1"><Icon size={10} className="text-slate-300"/><span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{label}</span></div>
                <div className="text-sm font-semibold text-slate-800 truncate">{value||"—"}</div>
              </div>
            ))}
          </div>
          {viewEmp.salary?.basic>0&&(
            <><SectionDivider>Salary</SectionDivider>
            <div className="grid grid-cols-3 gap-3">
              {[["Basic",`₹${(viewEmp.salary?.basic||0).toLocaleString()}`],["HRA",`₹${(viewEmp.salary?.hra||0).toLocaleString()}`],["Allowances",`₹${(viewEmp.salary?.allowances||0).toLocaleString()}`]].map(([k,v])=>(
                <div key={k} className="bg-indigo-50 rounded-xl p-3 text-center"><div className="text-xs font-black uppercase tracking-widest text-indigo-400 mb-1">{k}</div><div className="text-base font-black text-indigo-700">{v}</div></div>
              ))}
            </div></>
          )}
          {viewEmp.bank?.bankName&&(
            <><SectionDivider>Bank</SectionDivider>
            <div className="grid grid-cols-3 gap-3">
              {[["Bank",viewEmp.bank?.bankName],["IFSC",viewEmp.bank?.ifsc],["Account",viewEmp.bank?.accountNumber?`••••${viewEmp.bank.accountNumber.slice(-4)}`:"—"]].map(([k,v])=>(
                <div key={k} className="bg-slate-50 border border-slate-100 rounded-xl p-3"><div className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">{k}</div><div className="text-sm font-semibold text-slate-700">{v||"—"}</div></div>
              ))}
            </div></>
          )}
         <div className="flex justify-end gap-3 mt-5 pt-5 border-t border-slate-100">

  {can("employees","edit") && (
    <button
      onClick={()=>{setViewEmp(null);openEdit(viewEmp);}}
      className="flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all"
    >
      <Pencil size={12}/>Edit
    </button>
  )}

  {can("employees","delete") && (
    <button
      onClick={()=>{setViewEmp(null);setDeleteTarget(viewEmp);}}
      className="flex items-center gap-2 px-5 py-2.5 bg-rose-500 hover:bg-rose-600 text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all"
    >
      <Trash2 size={12}/>Delete
    </button>
  )}

</div>
        </Modal>
      )}

      {/* ── Delete Confirm Modal ── */}
      {deleteTarget&&(
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div initial={{scale:0.95,opacity:0}} animate={{scale:1,opacity:1}} transition={{duration:0.15}}
            className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-sm p-6 text-center">
            <div className="w-14 h-14 bg-rose-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Trash2 size={24} className="text-rose-500"/>
            </div>
            <h3 className="text-base font-black text-slate-900 mb-1">Delete Employee?</h3>
            <p className="text-sm text-slate-500 mb-1">You are about to permanently delete</p>
            <p className="text-sm font-black text-slate-800 mb-4">"{deleteTarget.fullName}"</p>
            <p className="text-xs text-rose-500 font-semibold bg-rose-50 rounded-xl px-4 py-2.5 mb-6">
              ⚠ This action cannot be undone. All associated data will be removed.
            </p>
            <div className="flex gap-3">
              <button onClick={()=>setDeleteTarget(null)}
                className="flex-1 py-2.5 text-xs font-black uppercase tracking-widest text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-all">
                Cancel
              </button>
              <button onClick={()=>del(deleteTarget._id)} disabled={!!deleting}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-rose-500 hover:bg-rose-600 text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all disabled:opacity-60">
                {deleting?<><Loader2 size={13} className="animate-spin"/>Deleting…</>:<><Trash2 size={13}/>Yes, Delete</>}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}