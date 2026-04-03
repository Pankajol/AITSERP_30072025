"use client";
import { useEffect, useRef, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import QRCode from "qrcode";

const LAND_DOTS = [
  [49,-125],[50,-120],[49,-115],[48,-110],[47,-120],[46,-124],[44,-124],[42,-124],[40,-124],[38,-122],[37,-122],[36,-121],[35,-120],
  [47,-113],[45,-110],[43,-108],[42,-105],[40,-105],[38,-105],[36,-106],[34,-106],[32,-107],[30,-104],[29,-103],[28,-100],[27,-98],
  [45,-93],[44,-88],[43,-83],[42,-83],[41,-82],[40,-82],[39,-84],[38,-85],[37,-86],[36,-87],[35,-87],[34,-86],[33,-85],[32,-84],[31,-83],
  [47,-70],[46,-72],[45,-74],[44,-76],[43,-79],[42,-80],[41,-81],[40,-80],[39,-77],[38,-77],[37,-77],[36,-76],[35,-76],[34,-77],[33,-78],[32,-80],
  [60,25],[59,24],[58,22],[57,21],[56,20],[55,18],[54,18],[53,19],[52,20],[51,20],[50,19],[49,18],[48,17],[47,16],[46,15],[45,14],
  [55,38],[56,40],[57,42],[58,44],[59,46],[60,48],[61,50],[62,52],[63,54],[64,56],[65,58],[64,60],[63,62],[62,64],[61,66],[60,68],
  [44,100],[43,102],[42,104],[41,106],[40,108],[39,110],[38,112],[37,114],[36,116],[35,118],[34,120],[33,120],[32,118],[31,120],[30,120],
  [37,10],[36,10],[35,10],[34,10],[33,12],[32,14],[31,16],[30,18],[29,20],[28,22],[27,24],[26,26],[25,28],[24,30],[23,32],[22,34],
  [-38,140],[-36,140],[-34,138],[-32,136],[-30,136],[-28,132],[-26,132],[-24,132],[-22,132],[-20,128],[-18,126],
];

const CITIES = [
  { name:"Mumbai",    lat:19,  lon:72   },
  { name:"London",   lat:51,  lon:0    },
  { name:"New York", lat:40,  lon:-74  },
  { name:"Tokyo",    lat:35,  lon:139  },
  { name:"Sydney",   lat:-33, lon:151  },
  { name:"Dubai",    lat:25,  lon:55   },
  { name:"Sao Paulo",lat:-23, lon:-46  },
  { name:"Singapore",lat:1,   lon:103  },
  { name:"Frankfurt",lat:50,  lon:8    },
  { name:"Toronto",  lat:43,  lon:-79  },
  { name:"Nairobi",  lat:-1,  lon:36   },
  { name:"Seoul",    lat:37,  lon:127  },
];
const CONNECTIONS = [[0,5],[0,1],[1,8],[1,2],[2,9],[0,7],[7,3],[3,11],[5,1],[5,7],[1,10],[2,6],[6,1],[4,7],[4,1],[0,3],[2,5]];

function project(lat,lon,W,H){const x=((lon+180)/360)*W;const latRad=(lat*Math.PI)/180;const mercN=Math.log(Math.tan(Math.PI/4+latRad/2));const y=H/2-(W*mercN)/(2*Math.PI);return[x,y];}

const BUNDLES=[
  {id:"starter",name:"Standard",price:50,features:["Sales Order","Sales Invoice","5 Users","Inventory View"]},
  {id:"growth",name:"Growth",price:299,features:["All Modules","Priority Support","API Access","Unlimited Users"],popular:true},
];
const BUSINESS_TYPES=["Pvt Ltd","LLP","Partnership","Sole Proprietorship"];
const INDUSTRIES=["Manufacturing","IT / Software","Retail","Healthcare","Other"];
const STEPS=["Identity","Business","Location","Plan","Security","Payment","Done"];

const PAYMENT_METHODS=[
  {id:"upi",   icon:"📱",title:"UPI Payment",        sub:"GPay · PhonePe · Paytm · BHIM", badge:"Instant", badgeColor:"#4ade80"},
  {id:"card",  icon:"💳",title:"Debit / Credit Card", sub:"Visa · Mastercard · RuPay",     badge:null,      badgeColor:null},
  {id:"netbanking",icon:"🏦",title:"Net Banking",     sub:"All major banks supported",     badge:null,      badgeColor:null},
  {id:"cash",  icon:"💵",title:"Cash Payment",        sub:"Pay at our nearest office",     badge:"Offline", badgeColor:"#fb923c"},
  {id:"paylater",icon:"🕐",title:"Pay Later",         sub:"Invoice sent · Pay within 30 days",badge:"Net-30",badgeColor:"#a855f7"},
  {id:"trial", icon:"🎁",title:"1 Week Free Trial",   sub:"Full access · No card required",badge:"FREE",    badgeColor:"#00f5ff"},
];
  



// ── Proxy caller — goes through /api/claude (no CORS / Method Not Allowed) ──
async function callClaude(messages,systemPrompt=""){
  try{
    const res=await fetch("/api/claude",{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:1000,system:systemPrompt,messages}),
    });
    const data=await res.json();
    // ── If credits exhausted or any API billing error → skip AI silently ──
    if(data.error&&(
      data.error==="CREDIT_EXHAUSTED"||
      (typeof data.error==="string"&&data.error.toLowerCase().includes("credit"))||
      (typeof data.error==="string"&&data.error.toLowerCase().includes("billing"))||
      res.status===402
    )){
      console.warn("Anthropic credits exhausted — skipping AI step");
      return "__SKIP__";
    }
    if(data.error)throw new Error(data.error);
    return data.content?.map(b=>b.text||"").join("")||"";
  }catch(err){
    // Network errors or unexpected failures → skip AI, don't block registration
    console.warn("Claude call failed, skipping:",err.message);
    return "__SKIP__";
  }
}

function FloatInput({label,name,value,onChange,type,error,multiline}){
  const[focused,setFocused]=useState(false);
  const active=focused||(value&&value.length>0);
  const border=error?"#f87171":focused?"#00f5ff":"rgba(255,255,255,0.1)";
  const shadow=focused?(error?"0 0 0 2px rgba(248,113,113,0.2)":"0 0 0 2px rgba(0,245,255,0.12),0 0 20px rgba(0,245,255,0.06)"):"none";
  return(
    <div style={{marginBottom:16}}>
      <div style={{position:"relative",background:"rgba(255,255,255,0.025)",borderRadius:10,border:"1px solid "+border,boxShadow:shadow,transition:"all 0.2s",overflow:"hidden"}}>
        <label style={{position:"absolute",left:14,top:active?7:"50%",transform:active?"none":"translateY(-50%)",fontSize:active?9:12,fontWeight:700,color:error?"#f87171":focused?"#00f5ff":"rgba(255,255,255,0.3)",letterSpacing:active?"0.15em":"0.02em",textTransform:active?"uppercase":"none",pointerEvents:"none",transition:"all 0.2s",zIndex:2}}>{label}</label>
        {multiline?<textarea name={name} value={value} onChange={onChange} onFocus={()=>setFocused(true)} onBlur={()=>setFocused(false)} rows={2} style={{width:"100%",background:"transparent",border:"none",outline:"none",color:"#e2e8f0",fontFamily:"monospace",fontSize:13,padding:"26px 14px 10px",resize:"none",boxSizing:"border-box"}}/>:<input name={name} type={type||"text"} value={value} onChange={onChange} onFocus={()=>setFocused(true)} onBlur={()=>setFocused(false)} style={{width:"100%",background:"transparent",border:"none",outline:"none",color:"#e2e8f0",fontFamily:"monospace",fontSize:13,padding:"26px 14px 10px",boxSizing:"border-box"}}/>}
        <div style={{position:"absolute",bottom:0,left:"50%",transform:"translateX(-50%)",height:1,background:"linear-gradient(90deg,transparent,#00f5ff,transparent)",width:focused?"100%":"0%",transition:"width 0.35s ease"}}/>
      </div>
      {error&&<p style={{fontSize:10,color:"#f87171",marginTop:4,paddingLeft:4,fontWeight:600}}>{"! "+error}</p>}
    </div>
  );
}

function FloatSelect({label,name,value,onChange,options,error}){
  const[focused,setFocused]=useState(false);
  const border=error?"#f87171":focused?"#00f5ff":"rgba(255,255,255,0.1)";
  return(
    <div style={{marginBottom:16}}>
      <div style={{position:"relative",background:"rgba(255,255,255,0.025)",borderRadius:10,border:"1px solid "+border,boxShadow:focused?"0 0 0 2px rgba(0,245,255,0.12)":"none",transition:"all 0.2s"}}>
        <label style={{position:"absolute",left:14,top:value?7:"50%",transform:value?"none":"translateY(-50%)",fontSize:value?9:12,fontWeight:700,color:focused?"#00f5ff":"rgba(255,255,255,0.3)",letterSpacing:value?"0.15em":"0.02em",textTransform:value?"uppercase":"none",pointerEvents:"none",transition:"all 0.2s",zIndex:2}}>{label}</label>
        <select name={name} value={value} onChange={onChange} onFocus={()=>setFocused(true)} onBlur={()=>setFocused(false)} style={{width:"100%",background:"transparent",border:"none",outline:"none",color:value?"#e2e8f0":"transparent",fontFamily:"monospace",fontSize:13,padding:value?"26px 14px 10px":"18px 14px",boxSizing:"border-box",cursor:"pointer",appearance:"none"}}>
          <option value="" style={{background:"#0a0414"}}>Select...</option>
          {options.map(o=><option key={o} value={o} style={{background:"#0a0414"}}>{o}</option>)}
        </select>
        <div style={{position:"absolute",right:14,top:"50%",transform:"translateY(-50%)",color:"rgba(255,255,255,0.2)",pointerEvents:"none",fontSize:10}}>▾</div>
      </div>
      {error&&<p style={{fontSize:10,color:"#f87171",marginTop:4,paddingLeft:4,fontWeight:600}}>{"! "+error}</p>}
    </div>
  );
}

function ConfirmBtn({label,onClick,loading,color}){
  return(
    <button onClick={onClick} disabled={loading} style={{width:"100%",padding:"16px",background:loading?"rgba(255,255,255,0.06)":`linear-gradient(135deg,${color}bb,${color})`,border:"none",borderRadius:12,color:loading?"rgba(255,255,255,0.3)":"#020108",fontFamily:"sans-serif",fontWeight:900,fontSize:11,letterSpacing:"0.14em",textTransform:"uppercase",cursor:loading?"not-allowed":"pointer",boxShadow:loading?"none":`0 0 28px ${color}44`,transition:"all 0.2s",display:"flex",alignItems:"center",justifyContent:"center",gap:10}}>
      {loading?<><span style={{animation:"spin 1s linear infinite",display:"inline-block"}}>◌</span>PROCESSING...</>:label}
    </button>
  );
}

function LiveClock(){const[t,setT]=useState(()=>new Date().toISOString().slice(11,19));useEffect(()=>{const iv=setInterval(()=>setT(new Date().toISOString().slice(11,19)),1000);return()=>clearInterval(iv);},[]);return<span style={{fontFamily:"monospace",fontSize:9,color:"#00f5ff",letterSpacing:"0.1em",fontWeight:700}}>{t} UTC</span>;}

function WorldMapCanvas(){
  const canvasRef=useRef(null);const animRef=useRef(null);const state=useRef({pulses:[],pings:[],tick:0});
  useEffect(()=>{
    const canvas=canvasRef.current;if(!canvas)return;
    const ctx=canvas.getContext("2d");
    const resize=()=>{canvas.width=canvas.offsetWidth;canvas.height=canvas.offsetHeight;};resize();window.addEventListener("resize",resize);
    const spawnPulse=()=>{const c=CONNECTIONS[Math.floor(Math.random()*CONNECTIONS.length)];state.current.pulses.push({a:c[0],b:c[1],t:0,speed:0.004+Math.random()*0.005,color:Math.random()>0.5?"#00f5ff":"#a855f7",sz:1.8+Math.random()*1.4,rev:Math.random()>0.5});};
    for(let i=0;i<7;i++)setTimeout(spawnPulse,i*400);
    const pt=setInterval(()=>{if(state.current.pulses.length<18)spawnPulse();state.current.pings.push({i:Math.floor(Math.random()*CITIES.length),r:0,alpha:1});},750);
    const draw=()=>{
      const W=canvas.width,H=canvas.height;if(!W||!H){animRef.current=requestAnimationFrame(draw);return;}
      ctx.clearRect(0,0,W,H);const bg=ctx.createRadialGradient(W*0.3,H*0.4,0,W*0.5,H*0.5,W);bg.addColorStop(0,"#0d0720");bg.addColorStop(0.6,"#06031a");bg.addColorStop(1,"#020108");ctx.fillStyle=bg;ctx.fillRect(0,0,W,H);
      ctx.strokeStyle="rgba(0,245,255,0.025)";ctx.lineWidth=0.5;for(let gx=0;gx<W;gx+=W/18){ctx.beginPath();ctx.moveTo(gx,0);ctx.lineTo(gx,H);ctx.stroke();}for(let gy=0;gy<H;gy+=H/12){ctx.beginPath();ctx.moveTo(0,gy);ctx.lineTo(W,gy);ctx.stroke();}
      LAND_DOTS.forEach(d=>{const p=project(d[0],d[1],W,H);if(p[0]<0||p[0]>W||p[1]<0||p[1]>H)return;ctx.beginPath();ctx.arc(p[0],p[1],1.2,0,Math.PI*2);ctx.fillStyle="rgba(100,120,255,0.22)";ctx.fill();});
      CONNECTIONS.forEach(c=>{const p1=project(CITIES[c[0]].lat,CITIES[c[0]].lon,W,H),p2=project(CITIES[c[1]].lat,CITIES[c[1]].lon,W,H);const mx=(p1[0]+p2[0])/2,my=(p1[1]+p2[1])/2-Math.hypot(p2[0]-p1[0],p2[1]-p1[1])*0.22;ctx.beginPath();ctx.moveTo(p1[0],p1[1]);ctx.quadraticCurveTo(mx,my,p2[0],p2[1]);ctx.strokeStyle="rgba(100,50,220,0.1)";ctx.lineWidth=0.8;ctx.stroke();});
      state.current.pulses=state.current.pulses.filter(p=>p.t<1);
      state.current.pulses.forEach(p=>{p.t+=p.speed;const si=p.rev?p.b:p.a,di=p.rev?p.a:p.b;const p1=project(CITIES[si].lat,CITIES[si].lon,W,H),p2=project(CITIES[di].lat,CITIES[di].lon,W,H);const mx=(p1[0]+p2[0])/2,my=(p1[1]+p2[1])/2-Math.hypot(p2[0]-p1[0],p2[1]-p1[1])*0.22;const t=p.t,bx=(1-t)*(1-t)*p1[0]+2*(1-t)*t*mx+t*t*p2[0],by=(1-t)*(1-t)*p1[1]+2*(1-t)*t*my+t*t*p2[1];const g=ctx.createRadialGradient(bx,by,0,bx,by,p.sz*5);g.addColorStop(0,p.color+"ff");g.addColorStop(0.4,p.color+"66");g.addColorStop(1,"transparent");ctx.beginPath();ctx.arc(bx,by,p.sz*5,0,Math.PI*2);ctx.fillStyle=g;ctx.fill();ctx.beginPath();ctx.arc(bx,by,p.sz,0,Math.PI*2);ctx.fillStyle=p.color;ctx.shadowBlur=8;ctx.shadowColor=p.color;ctx.fill();ctx.shadowBlur=0;});
      state.current.pings=state.current.pings.filter(p=>p.alpha>0);
      state.current.pings.forEach(p=>{const pos=project(CITIES[p.i].lat,CITIES[p.i].lon,W,H);p.r+=0.5;p.alpha=Math.max(0,1-p.r/28);ctx.beginPath();ctx.arc(pos[0],pos[1],p.r,0,Math.PI*2);ctx.strokeStyle="rgba(0,245,255,"+(p.alpha*0.5)+")";ctx.lineWidth=0.8;ctx.stroke();});
      const tick=state.current.tick;CITIES.forEach((city,i)=>{const pos=project(city.lat,city.lon,W,H),cx=pos[0],cy=pos[1];const pulse=0.5+0.5*Math.sin(tick*0.035+i*1.4);const g=ctx.createRadialGradient(cx,cy,0,cx,cy,16+pulse*6);g.addColorStop(0,"rgba(0,245,255,0.25)");g.addColorStop(1,"transparent");ctx.beginPath();ctx.arc(cx,cy,16+pulse*6,0,Math.PI*2);ctx.fillStyle=g;ctx.fill();ctx.beginPath();ctx.arc(cx,cy,5+pulse*2,0,Math.PI*2);ctx.strokeStyle="rgba(0,245,255,"+(0.35+pulse*0.35)+")";ctx.lineWidth=1;ctx.stroke();ctx.beginPath();ctx.arc(cx,cy,2.5,0,Math.PI*2);ctx.fillStyle="#00f5ff";ctx.shadowBlur=12;ctx.shadowColor="#00f5ff";ctx.fill();ctx.shadowBlur=0;});
      state.current.tick++;animRef.current=requestAnimationFrame(draw);
    };draw();
    return()=>{cancelAnimationFrame(animRef.current);clearInterval(pt);window.removeEventListener("resize",resize);};
  },[]);
  return<canvas ref={canvasRef} style={{position:"absolute",inset:0,width:"100%",height:"100%",pointerEvents:"none"}}/>;
}

export default function App(){
  const router=useRouter();
  const[step,setStep]=useState(0);
  const[activeBundle,setActiveBundle]=useState("growth");
  const[paymentView,setPaymentView]=useState("methods");
  const[processing,setProcessing]=useState(false);
  const[submitting,setSubmitting]=useState(false);
  const[errors,setErrors]=useState({});
  const[packets,setPackets]=useState(8842);
  const[welcomeMsg,setWelcomeMsg]=useState("");
  const [qr, setQr] = useState("");
  const[form,setForm]=useState({companyName:"",contactName:"",email:"",phone:"",businessType:"",industry:"",gstNumber:"",country:"",address:"",pinCode:"",password:"",confirmPwd:"",agreeToTerms:false,upi:"",cardNumber:"",cardName:"",cardExpiry:"",cardCvv:""});
  useEffect(()=>{const iv=setInterval(()=>setPackets(v=>v+Math.floor(Math.random()*40-10)),1100);return()=>clearInterval(iv);},[]);
  const price=useMemo(()=>BUNDLES.find(b=>b.id===activeBundle),[activeBundle]);
 useEffect(() => {
  const script = document.createElement("script");
  script.src = "https://checkout.razorpay.com/v1/checkout.js";
  script.async = true;
  document.body.appendChild(script);
}, []);

useEffect(() => {
  const amount = price?.price || 2999;

  const upiLink = `upi://pay?pa=pankajdyadav10699@okhdfcbank&pn=Pankaj Yadav&am=${amount}&cu=INR`;

  QRCode.toDataURL(upiLink)
    .then((url) => {
      console.log("QR Generated:", url); // debug
      setQr(url);
    })
    .catch((err) => {
      console.error("QR Error:", err);
    });
}, [price]);
  const handleChange=(e)=>{const n=e.target.name,v=e.target.type==="checkbox"?e.target.checked:e.target.value;setForm(p=>({...p,[n]:v}));if(errors[n])setErrors(p=>({...p,[n]:null}));};
  const validate=()=>{
    const e={};
    if(step===0){
      if(!form.companyName.trim()) e.companyName="Required";
      if(!form.contactName.trim()) e.contactName="Required";
      if(!/^\S+@\S+\.\S+$/.test(form.email)) e.email="Invalid email";
      if(!/^\d{10}$/.test(form.phone)) e.phone="10 digits required";
    }
    if(step===1){
      if(!form.businessType) e.businessType="Select type";
      if(!form.industry) e.industry="Select industry";
      if(form.gstNumber&&!/^[0-9A-Z]{15}$/.test(form.gstNumber.toUpperCase())) e.gstNumber="Must be 15 alphanumeric chars";
    }
    if(step===2){
      if(!form.country) e.country="Select country";
      if(form.address.length<5) e.address="Too short";
      if(!/^\d{6}$/.test(form.pinCode)) e.pinCode="6 digits required";
    }
    if(step===4){
      if(form.password.length<8) e.password="Min 8 chars";
      if(form.password!==form.confirmPwd) e.confirmPwd="No match";
      if(!form.agreeToTerms) e.agreeToTerms="You must agree to terms";
    }
    setErrors(e);
    return Object.keys(e).length===0;
  };
  const next=()=>{if(validate())setStep(s=>s+1);};
  const back=()=>{setErrors({});if(step===5&&paymentView!=="methods"){setPaymentView("methods");return;}setStep(s=>s-1);};

  const handleSubmit=async(paymentType)=>{
    setProcessing(true);setSubmitting(true);setErrors({});
    try{
      // STEP 1 — AI validates via /api/claude proxy (skipped if no credits)
      const validationRaw=await callClaude([{role:"user",content:`Validate this ERP registration. Respond ONLY in JSON (no markdown): {"valid":true,"issues":[]} Data — Company:"${form.companyName}", Email:"${form.email}", Phone:"${form.phone}", Business:"${form.businessType}", Industry:"${form.industry}". Return valid:false with issues if data looks fake or suspicious.`}]);
      if(validationRaw!=="__SKIP__"){
        let aiResult={valid:true,issues:[]};
        try{aiResult=JSON.parse(validationRaw.replace(/```json|```/g,"").trim());}catch{}
        if(!aiResult.valid){setErrors({general:"AI Review: "+(aiResult.issues?.join(", ")||"Please check your details.")});setProcessing(false);setSubmitting(false);return;}
      }

      // STEP 2 — Submit to backend (fields match CompanySchema exactly)
      const response=await fetch("/api/company/signup",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({
        companyName:  form.companyName,
        contactName:  form.contactName,
        email:        form.email,
        phone:        form.phone,
        country:      form.country,
        address:      form.address,
        pinCode:      form.pinCode,
        password:     form.password,
        agreeToTerms: form.agreeToTerms,
        ...(form.gstNumber.trim() && { gstNumber: form.gstNumber.trim().toUpperCase() }),
        // extra UX fields (not in schema — backend can ignore or store separately)
        businessType: form.businessType,
        industry:     form.industry,
        plan:         activeBundle,
        paymentMethod:paymentType,
      })});
      if(!response.ok){const errData=await response.json().catch(()=>({}));throw new Error(errData.message||"Registration failed.");}

      // STEP 3 — AI welcome message (fallback if no credits)
      const payLabel={upi:"UPI",card:"card",netbanking:"net banking",cash:"cash",paylater:"Pay Later (Net-30)",trial:"1 Week Free Trial"}[paymentType]||paymentType;
      const welcomeRaw=await callClaude([{role:"user",content:`Write a warm 2-sentence welcome for "${form.companyName}" (${form.industry}) who registered for the ${price?.name} ERP plan via ${payLabel}. Professional and exciting. No quotes.`}]);
      if(welcomeRaw==="__SKIP__"||!welcomeRaw.trim()){
        setWelcomeMsg(`Welcome aboard, ${form.companyName}! Your ${price?.name} ERP plan is now active. Let's build something great together.`);
      }else{
        setWelcomeMsg(welcomeRaw.trim());
      }

      // STEP 4 — Success screen + redirect
      setProcessing(false);setSubmitting(false);setStep(6);
      setTimeout(()=>router.push("/signin"),4000);
    }catch(err){
      setErrors({general:err.message||"Something went wrong. Please try again."});
      setProcessing(false);setSubmitting(false);
    }
  };
  const handleRazorpayPayment = async () => {
  try {
    setSubmitting(true);

    // 1. Create Order
    const res = await fetch("/api/payment/create-order", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: price.price,
      }),
    });

    const data = await res.json();

    if (!data.success) {
      throw new Error("Order creation failed");
    }

    // 2. Razorpay Options
    const options = {
      key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
      amount: data.order.amount,
      currency: "INR",
      name: "AITS ERP",
      description: "ERP Subscription",
      order_id: data.order.id,

      handler: async function (response) {
        // 3. Verify Payment
        const verifyRes = await fetch("/api/payment/verify", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(response),
        });

        const verifyData = await verifyRes.json();

        if (verifyData.success) {
          // ✅ SUCCESS → continue your flow
          await handleSubmit("razorpay");
        } else {
          alert("Payment verification failed");
        }
      },

      prefill: {
        name: form.contactName,
        email: form.email,
        contact: form.phone,
      },

      theme: {
        color: "#00f5ff",
      },

      modal: {
        ondismiss: function () {
          setSubmitting(false);
        },
      },
    };

    // 4. Open Razorpay
    const rzp = new window.Razorpay(options);
    rzp.open();

  } catch (err) {
    console.error(err);
    alert("Payment failed");
    setSubmitting(false);
  }
};

  const C={cyan:"#00f5ff",violet:"#a855f7",card:"rgba(5,2,18,0.92)"};
  const stepLabel=["Company Identity","Business Profile","Office Address","Choose Plan","Set Password","Complete Payment","You're Live"][step];

  const BackBtn=()=><button onClick={()=>setPaymentView("methods")} style={{background:"none",border:"none",color:"rgba(255,255,255,0.28)",fontSize:10,fontWeight:700,cursor:"pointer",letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:20,display:"flex",alignItems:"center",gap:5,padding:0}}>← Back to methods</button>;

  const renderPaymentDetail=()=>{
// 🔥 UI
if (paymentView === "upi") return (
  <div>
    <BackBtn />

    <div style={{
      textAlign: "center",
      padding: "20px",
      border: "1px solid rgba(0,245,255,0.2)",
      borderRadius: "12px",
      marginBottom: "20px"
    }}>
      <p style={{ color: "#00f5ff", fontWeight: "bold" }}>
        Scan & Pay via UPI
      </p>

      <p style={{ fontSize: "10px", color: "#999" }}>
        GPay · PhonePe · Paytm supported
      </p>

      {/* 👇 Important info */}
      <p style={{
        marginTop: "10px",
        fontSize: "11px",
        color: "#aaa"
      }}>
        Click below → QR will open
      </p>
    </div>

    <ConfirmBtn
      label={`Pay ₹${price?.price || 2999}`}
      onClick={handleRazorpayPayment}
      loading={submitting}
      color={C.cyan}
    />
  </div>
);
    // if(paymentView==="upi")return(<div><BackBtn/><FloatInput label="UPI ID" name="upi" value={form.upi} onChange={handleChange}/><p style={{fontSize:10,color:"rgba(255,255,255,0.22)",marginBottom:22}}>e.g. name@okaxis · name@ybl · name@paytm</p><ConfirmBtn label={`PAY Rs.${price?.price.toLocaleString()} VIA UPI`} onClick={()=>handleSubmit("upi")} loading={submitting} color={C.cyan}/></div>);
    if(paymentView==="card")return(<div><BackBtn/><FloatInput label="Card Number" name="cardNumber" value={form.cardNumber} onChange={handleChange}/><FloatInput label="Name on Card" name="cardName" value={form.cardName} onChange={handleChange}/><div style={{display:"flex",gap:12}}><div style={{flex:1}}><FloatInput label="Expiry MM/YY" name="cardExpiry" value={form.cardExpiry} onChange={handleChange}/></div><div style={{flex:1}}><FloatInput label="CVV" name="cardCvv" value={form.cardCvv} onChange={handleChange} type="password"/></div></div><ConfirmBtn label={`PAY Rs.${price?.price.toLocaleString()} SECURELY`} onClick={()=>handleSubmit("card")} loading={submitting} color={C.cyan}/></div>);
    if(paymentView==="netbanking")return(<div><BackBtn/><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:20}}>{["SBI","HDFC","ICICI","Axis","Kotak","PNB"].map(bank=><button key={bank} style={{padding:"12px 10px",background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:10,color:"rgba(255,255,255,0.5)",fontFamily:"monospace",fontSize:11,fontWeight:700,cursor:"pointer",transition:"all 0.2s"}} onMouseEnter={e=>{e.currentTarget.style.border="1px solid rgba(0,245,255,0.3)";e.currentTarget.style.color="#00f5ff";}} onMouseLeave={e=>{e.currentTarget.style.border="1px solid rgba(255,255,255,0.08)";e.currentTarget.style.color="rgba(255,255,255,0.5)"}}>{bank}</button>)}</div><ConfirmBtn label={`PAY Rs.${price?.price.toLocaleString()} VIA NET BANKING`} onClick={()=>handleSubmit("netbanking")} loading={submitting} color={C.cyan}/></div>);
    if(paymentView==="cash")return(<div><BackBtn/><div style={{padding:"16px",background:"rgba(251,146,60,0.06)",border:"1px solid rgba(251,146,60,0.2)",borderRadius:12,marginBottom:16}}><div style={{fontSize:11,color:"#fb923c",fontWeight:700,marginBottom:8}}>💵 Cash Payment Instructions</div><div style={{fontSize:11,color:"rgba(255,255,255,0.45)",lineHeight:1.9}}>1. Your account is created <span style={{color:"#fb923c",fontWeight:700}}>immediately</span><br/>2. Visit our office within <span style={{color:"#fb923c",fontWeight:700}}>7 working days</span><br/>3. Pay <span style={{color:"#fb923c",fontWeight:700}}>Rs.{price?.price.toLocaleString()}</span> at billing counter<br/>4. Collect payment receipt</div></div><div style={{padding:"12px 14px",background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:10,marginBottom:18}}><div style={{fontSize:9,color:"rgba(255,255,255,0.3)",letterSpacing:"0.12em",marginBottom:4}}>OFFICE ADDRESS</div><div style={{fontSize:11,color:"rgba(255,255,255,0.5)",lineHeight:1.6}}>AITS ERP Global, 4th Floor,<br/>Tech Park, Whitefield, Bengaluru — 560066</div></div><ConfirmBtn label="CONFIRM CASH PAYMENT" onClick={()=>handleSubmit("cash")} loading={submitting} color="#fb923c"/></div>);
    if(paymentView==="paylater")return(<div><BackBtn/><div style={{padding:"16px",background:"rgba(168,85,247,0.06)",border:"1px solid rgba(168,85,247,0.2)",borderRadius:12,marginBottom:16}}><div style={{fontSize:11,color:"#a855f7",fontWeight:700,marginBottom:8}}>🕐 Pay Later — Net 30</div><div style={{fontSize:11,color:"rgba(255,255,255,0.45)",lineHeight:1.9}}>• Full ERP access starts <span style={{color:"#a855f7",fontWeight:700}}>immediately</span><br/>• Invoice of <span style={{color:"#a855f7",fontWeight:700}}>Rs.{price?.price.toLocaleString()}</span> sent to your email<br/>• Payment due within <span style={{color:"#a855f7",fontWeight:700}}>30 days</span><br/>• Available for verified businesses only</div></div><div style={{padding:"12px 14px",background:"rgba(168,85,247,0.04)",border:"1px solid rgba(168,85,247,0.1)",borderRadius:10,marginBottom:18,display:"flex",alignItems:"center",gap:10}}><span style={{fontSize:16}}>📧</span><div><div style={{fontSize:9,color:"rgba(168,85,247,0.7)",fontWeight:700,letterSpacing:"0.1em"}}>INVOICE WILL BE SENT TO</div><div style={{fontSize:12,color:"rgba(255,255,255,0.6)",marginTop:2,fontWeight:600}}>{form.email||"your registered email"}</div></div></div><ConfirmBtn label="CONFIRM · PAY WITHIN 30 DAYS" onClick={()=>handleSubmit("paylater")} loading={submitting} color="#a855f7"/></div>);
    if(paymentView==="trial")return(<div><BackBtn/><div style={{padding:"16px",background:"rgba(0,245,255,0.05)",border:"1px solid rgba(0,245,255,0.2)",borderRadius:12,marginBottom:16}}><div style={{fontSize:11,color:C.cyan,fontWeight:700,marginBottom:8}}>🎁 1 Week Free Trial</div><div style={{fontSize:11,color:"rgba(255,255,255,0.45)",lineHeight:1.9}}>• <span style={{color:C.cyan,fontWeight:700}}>100% free</span> for 7 days — no card required<br/>• Full access to <span style={{color:C.cyan,fontWeight:700}}>{price?.name} Plan</span> features<br/>• Auto-reminder on Day 5 before trial ends<br/>• Upgrade anytime, cancel anytime</div></div><div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:18}}>{[{d:"Day 1",t:"Full Access"},{d:"Day 5",t:"Reminder"},{d:"Day 7",t:"Trial Ends"}].map(item=><div key={item.d} style={{padding:"12px 10px",background:"rgba(0,245,255,0.03)",border:"1px solid rgba(0,245,255,0.1)",borderRadius:10,textAlign:"center"}}><div style={{fontSize:10,color:C.cyan,fontWeight:700}}>{item.d}</div><div style={{fontSize:9,color:"rgba(255,255,255,0.3)",marginTop:3}}>{item.t}</div></div>)}</div><ConfirmBtn label="START FREE TRIAL → 7 DAYS" onClick={()=>handleSubmit("trial")} loading={submitting} color={C.cyan}/></div>);
  };

  return(
    <div style={{width:"100vw",height:"100vh",position:"relative",overflow:"hidden",background:"#0d0720",fontFamily:"monospace"}}>
      <style>{`@keyframes scanDown{0%{top:-3px}100%{top:100%}}@keyframes blink{0%,100%{opacity:1}50%{opacity:0.15}}@keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}@keyframes spin{to{transform:rotate(360deg)}}@keyframes pulse{0%,100%{opacity:0.5}50%{opacity:1}}@keyframes countdown{from{width:100%}to{width:0%}}input:-webkit-autofill,input:-webkit-autofill:focus{-webkit-box-shadow:0 0 0 1000px #0a0414 inset!important;-webkit-text-fill-color:#e2e8f0!important;}::-webkit-scrollbar{width:3px}::-webkit-scrollbar-thumb{background:rgba(0,245,255,0.2);border-radius:2px}select option{background:#0a0414;color:#e2e8f0}`}</style>
      <WorldMapCanvas/>
      <div style={{position:"absolute",left:0,right:0,height:2,background:"linear-gradient(90deg,transparent,rgba(0,245,255,0.15),transparent)",animation:"scanDown 7s linear infinite",pointerEvents:"none",zIndex:5}}/>

      {/* TOP BAR */}
      <div style={{position:"absolute",top:0,left:0,right:0,zIndex:30,display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 24px",background:"rgba(2,1,8,0.8)",borderBottom:"1px solid rgba(0,245,255,0.07)",backdropFilter:"blur(16px)"}}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <div style={{width:32,height:32,border:"1px solid rgba(0,245,255,0.45)",borderRadius:7,display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 0 16px rgba(0,245,255,0.18)",fontSize:15,color:C.cyan}}>◆</div>
          <div><div style={{fontSize:11,fontWeight:700,color:C.cyan,letterSpacing:"0.2em"}}>AITS ERP GLOBAL</div><div style={{fontSize:8,color:"rgba(0,245,255,0.3)",letterSpacing:"0.15em"}}>CLOUD REGISTRATION PORTAL</div></div>
        </div>
        <div style={{display:"flex",gap:24,alignItems:"center"}}>
          {[{l:"NODES",v:String(CITIES.length)},{l:"LINKS",v:String(CONNECTIONS.length)},{l:"PKT/S",v:packets.toLocaleString()},{l:"UPTIME",v:"99.98%"}].map(s=><div key={s.l} style={{textAlign:"center"}}><div style={{fontSize:13,fontWeight:700,color:C.cyan}}>{s.v}</div><div style={{fontSize:7,color:"rgba(255,255,255,0.2)",letterSpacing:"0.18em",marginTop:2}}>{s.l}</div></div>)}
          <div style={{display:"flex",alignItems:"center",gap:6,padding:"3px 10px",border:"1px solid rgba(0,255,100,0.28)",borderRadius:5,background:"rgba(0,255,100,0.05)"}}><div style={{width:5,height:5,borderRadius:"50%",background:"#00ff64",boxShadow:"0 0 7px #00ff64",animation:"blink 1.5s ease infinite"}}/><span style={{fontSize:8,color:"#00ff64",fontWeight:700,letterSpacing:"0.2em"}}>LIVE</span></div>
        </div>
      </div>

      {/* FORM */}
      <div style={{position:"absolute",inset:0,zIndex:20,display:"flex",alignItems:"center",justifyContent:"center",paddingTop:56,paddingBottom:40,overflowY:"auto"}}>
        <div style={{width:"100%",maxWidth:460,margin:"0 auto",padding:"0 16px",animation:"fadeUp 0.5s ease both"}}>
          <div style={{background:C.card,border:"1px solid rgba(0,245,255,0.12)",borderRadius:20,overflow:"hidden",boxShadow:"0 40px 80px rgba(0,0,0,0.7),inset 0 1px 0 rgba(255,255,255,0.04)"}}>
            <div style={{height:2,background:"linear-gradient(90deg,transparent,#00f5ff55,#a855f755,transparent)"}}/>
            <div style={{padding:"22px 26px 0"}}>
              {step<6&&(<div style={{display:"flex",alignItems:"center",gap:0,marginBottom:20}}>{STEPS.slice(0,-1).map((s,i)=><div key={i} style={{display:"flex",alignItems:"center",flex:i<STEPS.length-2?1:"none"}}><div style={{width:24,height:24,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,fontWeight:700,flexShrink:0,background:i<step?"linear-gradient(135deg,#0ea5e9,#00f5ff)":i===step?"rgba(0,245,255,0.12)":"rgba(255,255,255,0.04)",border:i===step?"1px solid rgba(0,245,255,0.6)":i<step?"none":"1px solid rgba(255,255,255,0.07)",color:i<=step?"#00f5ff":"rgba(255,255,255,0.2)",boxShadow:i===step?"0 0 14px rgba(0,245,255,0.4)":i<step?"0 0 8px rgba(0,245,255,0.25)":"none",transition:"all 0.4s"}}>{i<step?"✓":String(i+1)}</div>{i<STEPS.length-2&&<div style={{flex:1,height:1,margin:"0 3px",background:"rgba(255,255,255,0.05)",position:"relative",overflow:"hidden"}}><div style={{position:"absolute",inset:0,background:"linear-gradient(90deg,#0ea5e9,#00f5ff)",transform:"scaleX("+(i<step?1:0)+")",transformOrigin:"left",transition:"transform 0.5s ease"}}/></div>}</div>)}</div>)}
              <div style={{fontSize:9,color:"rgba(0,245,255,0.5)",letterSpacing:"0.22em",textTransform:"uppercase",marginBottom:5}}>{step<6?"Step "+(step+1)+" / 6":"Complete"}</div>
              <h1 style={{fontSize:22,fontWeight:800,color:"#f0f9ff",letterSpacing:"-0.02em",marginBottom:4,fontFamily:"sans-serif"}}>{stepLabel}</h1>
              {step>=3&&step<6&&(<div style={{display:"flex",alignItems:"center",gap:8,marginTop:10,marginBottom:2,padding:"8px 12px",background:"rgba(0,245,255,0.05)",borderRadius:8,border:"1px solid rgba(0,245,255,0.1)"}}><div style={{width:5,height:5,borderRadius:"50%",background:C.cyan,boxShadow:"0 0 6px "+C.cyan,animation:"pulse 1.5s ease infinite"}}/><span style={{fontSize:10,color:"rgba(255,255,255,0.4)",flex:1,fontWeight:600}}>{price?.name} Plan</span><span style={{fontSize:14,fontWeight:700,color:C.cyan}}>Rs.{price?.price.toLocaleString()}</span></div>)}
            </div>
            <div style={{padding:"20px 26px 24px",minHeight:300}}>
              {errors.general&&<div style={{marginBottom:16,padding:"10px 14px",background:"rgba(248,113,113,0.08)",border:"1px solid rgba(248,113,113,0.25)",borderRadius:10}}><p style={{fontSize:11,color:"#f87171",margin:0,fontWeight:600}}>⚠ {errors.general}</p></div>}
              {step===0&&<div><FloatInput label="Company Name" name="companyName" value={form.companyName} onChange={handleChange} error={errors.companyName}/><FloatInput label="Contact Person Name" name="contactName" value={form.contactName} onChange={handleChange} error={errors.contactName}/><FloatInput label="Official Email" name="email" value={form.email} onChange={handleChange} error={errors.email} type="email"/><FloatInput label="Phone Number (10 digits)" name="phone" value={form.phone} onChange={handleChange} error={errors.phone} type="tel"/></div>}
              {step===1&&<div><FloatSelect label="Business Structure" name="businessType" value={form.businessType} onChange={handleChange} options={BUSINESS_TYPES} error={errors.businessType}/><FloatSelect label="Industry Vertical" name="industry" value={form.industry} onChange={handleChange} options={INDUSTRIES} error={errors.industry}/><FloatInput label="GST Number (optional)" name="gstNumber" value={form.gstNumber} onChange={handleChange} error={errors.gstNumber}/><p style={{fontSize:10,color:"rgba(255,255,255,0.2)",marginTop:-10,marginBottom:16,paddingLeft:4}}>15-character GST (e.g. 22AAAAA0000A1Z5) · leave blank if not registered</p></div>}
              {step===2&&<div><FloatSelect label="Country" name="country" value={form.country} onChange={handleChange} options={["India","United States","United Kingdom","UAE","Singapore","Australia","Canada","Germany","Other"]} error={errors.country}/><FloatInput label="Full Address" name="address" value={form.address} onChange={handleChange} error={errors.address} multiline/><FloatInput label="PIN / ZIP Code (6 digits)" name="pinCode" value={form.pinCode} onChange={handleChange} error={errors.pinCode}/></div>}
              {step===3&&<div>{BUNDLES.map(b=>{const sel=activeBundle===b.id;return<div key={b.id} onClick={()=>setActiveBundle(b.id)} style={{position:"relative",padding:"18px 20px",borderRadius:14,cursor:"pointer",marginBottom:14,border:"1px solid "+(sel?"rgba(0,245,255,0.5)":"rgba(255,255,255,0.06)"),background:sel?"rgba(0,245,255,0.05)":"rgba(255,255,255,0.02)",boxShadow:sel?"0 0 30px rgba(0,245,255,0.1)":"none",transition:"all 0.25s"}}>{b.popular&&<div style={{position:"absolute",top:-10,right:14,background:"linear-gradient(135deg,#0ea5e9,#00f5ff)",color:"#020108",fontSize:7,fontWeight:900,padding:"3px 10px",borderRadius:20,letterSpacing:"0.2em"}}>RECOMMENDED</div>}<div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}><div><div style={{fontSize:13,fontWeight:800,color:"#f0f9ff",fontFamily:"sans-serif"}}>{b.name} Plan</div><div style={{fontSize:10,color:"rgba(255,255,255,0.3)",marginTop:2}}>{b.id==="starter"?"Core essentials":"Full suite"}</div></div><div style={{textAlign:"right"}}><div style={{fontSize:20,fontWeight:700,color:sel?C.cyan:"#f0f9ff"}}>Rs.{b.price.toLocaleString()}</div><div style={{fontSize:8,color:"rgba(255,255,255,0.25)"}}>/ year</div></div></div><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6}}>{b.features.map(f=><div key={f} style={{display:"flex",alignItems:"center",gap:6}}><div style={{width:4,height:4,borderRadius:"50%",background:sel?C.cyan:"rgba(255,255,255,0.15)",flexShrink:0,transition:"all 0.2s"}}/><span style={{fontSize:10,color:sel?"rgba(255,255,255,0.65)":"rgba(255,255,255,0.28)",fontWeight:600}}>{f}</span></div>)}</div></div>})}</div>}
              {step===4&&<div><FloatInput label="Create Password" name="password" value={form.password} onChange={handleChange} error={errors.password} type="password"/>{form.password.length>0&&<div style={{marginBottom:16}}><div style={{display:"flex",gap:3,marginBottom:5}}>{[0,1,2,3].map(i=>{const str=Math.min(4,Math.floor(form.password.length/2));const colors=["#f87171","#fb923c","#facc15","#4ade80"];return<div key={i} style={{flex:1,height:2,borderRadius:1,background:i<str?colors[Math.min(str-1,3)]:"rgba(255,255,255,0.06)",transition:"all 0.3s",boxShadow:i<str?"0 0 5px "+colors[Math.min(str-1,3)]+"60":"none"}}/>;})}</div><div style={{fontSize:9,color:"rgba(255,255,255,0.25)",fontWeight:600}}>{form.password.length<4?"Weak":form.password.length<6?"Fair":form.password.length<8?"Good":"Strong"}</div></div>}<FloatInput label="Confirm Password" name="confirmPwd" value={form.confirmPwd} onChange={handleChange} error={errors.confirmPwd} type="password"/><div onClick={()=>setForm(p=>({...p,agreeToTerms:!p.agreeToTerms}))} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 14px",borderRadius:10,background:"rgba(255,255,255,0.02)",border:"1px solid "+(errors.agreeToTerms?"rgba(248,113,113,0.4)":"rgba(255,255,255,0.06)"),cursor:"pointer"}}><div style={{width:20,height:20,borderRadius:6,background:form.agreeToTerms?"linear-gradient(135deg,#0ea5e9,#00f5ff)":"transparent",border:"1px solid "+(form.agreeToTerms?"transparent":"rgba(255,255,255,0.15)"),display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,color:"#020108",fontWeight:900,flexShrink:0,transition:"all 0.2s",boxShadow:form.agreeToTerms?"0 0 10px rgba(0,245,255,0.35)":"none"}}>{form.agreeToTerms&&"✓"}</div><span style={{fontSize:11,color:"rgba(255,255,255,0.4)",fontWeight:500,lineHeight:1.4}}>I confirm all details are accurate and accept the <span style={{color:C.cyan}}>Terms</span></span></div>{errors.agreeToTerms&&<p style={{fontSize:10,color:"#f87171",marginTop:6,paddingLeft:4,fontWeight:600}}>! {errors.agreeToTerms}</p>}</div>}
              {step===5&&<div>{paymentView==="methods"?<div><div style={{padding:"12px 14px",background:"rgba(0,255,100,0.05)",border:"1px solid rgba(0,255,100,0.12)",borderRadius:10,marginBottom:14,display:"flex",alignItems:"center",gap:10}}><span style={{fontSize:14}}>🔐</span><span style={{fontSize:10,color:"rgba(255,255,255,0.35)",fontWeight:600}}>256-bit SSL Encrypted · PCI DSS Compliant</span></div>{PAYMENT_METHODS.map(m=><button key={m.id} onClick={()=>setPaymentView(m.id)} style={{width:"100%",padding:"14px 18px",background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:12,display:"flex",alignItems:"center",gap:14,cursor:"pointer",textAlign:"left",marginBottom:8,transition:"all 0.2s",boxSizing:"border-box"}} onMouseEnter={e=>{e.currentTarget.style.border="1px solid rgba(0,245,255,0.3)";e.currentTarget.style.background="rgba(0,245,255,0.04)";}} onMouseLeave={e=>{e.currentTarget.style.border="1px solid rgba(255,255,255,0.07)";e.currentTarget.style.background="rgba(255,255,255,0.02)";}}><div style={{width:40,height:40,background:"rgba(255,255,255,0.04)",borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0,border:"1px solid rgba(255,255,255,0.06)"}}>{m.icon}</div><div style={{flex:1}}><div style={{display:"flex",alignItems:"center",gap:8}}><span style={{fontWeight:700,fontSize:12,color:"#f0f9ff"}}>{m.title}</span>{m.badge&&<span style={{fontSize:8,fontWeight:800,background:"rgba(255,255,255,0.05)",color:m.badgeColor||"#e2e8f0",padding:"2px 7px",borderRadius:8,letterSpacing:"0.1em",border:"1px solid "+(m.badgeColor?m.badgeColor+"33":"rgba(255,255,255,0.1)")}}>{m.badge}</span>}</div><div style={{fontSize:10,color:"rgba(255,255,255,0.28)",marginTop:3,fontWeight:500}}>{m.sub}</div></div><span style={{color:"rgba(255,255,255,0.15)",fontSize:18}}>›</span></button>)}</div>:renderPaymentDetail()}</div>}
              {step===6&&<div style={{textAlign:"center",padding:"20px 0 10px"}}><div style={{position:"relative",display:"inline-block",marginBottom:24}}><div style={{width:90,height:90,borderRadius:"50%",background:"rgba(0,245,255,0.08)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:44,border:"1px solid rgba(0,245,255,0.2)",boxShadow:"0 0 50px rgba(0,245,255,0.15)"}}>🎉</div><div style={{position:"absolute",inset:-8,borderRadius:"50%",border:"1px solid rgba(0,245,255,0.15)",animation:"spin 5s linear infinite"}}/></div><h2 style={{fontSize:22,fontWeight:800,color:"#f0f9ff",letterSpacing:"-0.02em",marginBottom:8,fontFamily:"sans-serif"}}>Registration Complete!</h2><p style={{fontSize:12,color:"rgba(255,255,255,0.35)",lineHeight:1.6,marginBottom:6}}>Your <span style={{color:C.cyan,fontWeight:700}}>{price?.name} Plan</span> is now active.</p>{welcomeMsg?<div style={{margin:"14px 0 18px",padding:"14px 16px",background:"rgba(168,85,247,0.08)",border:"1px solid rgba(168,85,247,0.25)",borderRadius:12,textAlign:"left"}}><div style={{fontSize:9,color:"#a855f7",fontWeight:700,letterSpacing:"0.15em",marginBottom:6}}>✦ AI WELCOME MESSAGE</div><p style={{fontSize:12,color:"rgba(255,255,255,0.6)",lineHeight:1.7,margin:0,fontStyle:"italic"}}>"{welcomeMsg}"</p></div>:<div style={{margin:"14px 0 18px",padding:"12px",background:"rgba(168,85,247,0.05)",border:"1px solid rgba(168,85,247,0.1)",borderRadius:12,display:"flex",alignItems:"center",justifyContent:"center",gap:8}}><div style={{animation:"spin 1s linear infinite",display:"inline-block",color:"#a855f7"}}>◌</div><span style={{fontSize:10,color:"rgba(255,255,255,0.3)"}}>Crafting your welcome message...</span></div>}<p style={{fontSize:10,color:"rgba(255,255,255,0.2)",marginBottom:16}}>Check your email for login credentials.</p><div style={{marginBottom:20}}><div style={{fontSize:9,color:"rgba(0,245,255,0.4)",marginBottom:6,letterSpacing:"0.1em"}}>REDIRECTING TO SIGN IN IN 4s...</div><div style={{height:2,background:"rgba(0,245,255,0.1)",borderRadius:1,overflow:"hidden"}}><div style={{height:"100%",background:"linear-gradient(90deg,#0ea5e9,#00f5ff)",animation:"countdown 4s linear forwards",borderRadius:1}}/></div></div><button onClick={()=>router.push("/signin")} style={{width:"100%",padding:"16px",background:"linear-gradient(135deg,#0ea5e9,#00f5ff)",border:"none",borderRadius:12,color:"#020108",fontFamily:"sans-serif",fontWeight:900,fontSize:12,letterSpacing:"0.12em",textTransform:"uppercase",cursor:"pointer",boxShadow:"0 0 30px rgba(0,245,255,0.3)"}}>GO TO SIGN IN →</button></div>}
              {step<6&&!(step===5&&paymentView!=="methods")&&<div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginTop:24,paddingTop:18,borderTop:"1px solid rgba(255,255,255,0.04)"}}><button disabled={step===0} onClick={back} style={{background:"none",border:"none",fontSize:10,fontWeight:700,color:step===0?"transparent":"rgba(255,255,255,0.25)",letterSpacing:"0.12em",textTransform:"uppercase",cursor:step===0?"default":"pointer",padding:0,transition:"color 0.2s",pointerEvents:step===0?"none":"auto"}}>← Back</button><button onClick={next} style={{padding:"13px 28px",background:"linear-gradient(135deg,#0ea5e9,#00f5ff)",border:"none",borderRadius:10,color:"#020108",fontFamily:"sans-serif",fontWeight:900,fontSize:11,letterSpacing:"0.12em",textTransform:"uppercase",cursor:"pointer",boxShadow:"0 0 24px rgba(0,245,255,0.3)"}}>{step===4?"Review & Pay":step===3?"Confirm Plan":"Continue"} →</button></div>}
            </div>
          </div>
          {step<6&&<p style={{textAlign:"center",fontSize:9,color:"rgba(255,255,255,0.1)",marginTop:14,letterSpacing:"0.1em"}}>Protected by AITS Security · <span style={{color:"rgba(0,245,255,0.3)"}}>Terms</span> · <span style={{color:"rgba(0,245,255,0.3)"}}>Privacy</span></p>}
        </div>
      </div>

      {/* BOTTOM BAR */}
      <div style={{position:"absolute",bottom:0,left:0,right:0,zIndex:30,display:"flex",alignItems:"center",justifyContent:"space-between",padding:"9px 24px",background:"rgba(2,1,8,0.8)",borderTop:"1px solid rgba(0,245,255,0.06)",backdropFilter:"blur(14px)"}}>
        <div style={{display:"flex",gap:24}}>{["ENCRYPTION: AES-256","PROTOCOL: TLS 1.3","AVG LATENCY: 4ms"].map(l=><span key={l} style={{fontSize:8,color:"rgba(255,255,255,0.18)",letterSpacing:"0.12em"}}>{l}</span>)}</div>
        <div style={{display:"flex",alignItems:"center",gap:8}}><span style={{fontSize:8,color:"rgba(0,245,255,0.35)",letterSpacing:"0.14em"}}>SYS TIME</span><LiveClock/></div>
      </div>

      {/* PROCESSING OVERLAY */}
      {processing&&<div style={{position:"fixed",inset:0,background:"rgba(2,1,8,0.92)",backdropFilter:"blur(16px)",zIndex:100,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}><div style={{position:"relative",width:72,height:72,marginBottom:28}}><div style={{position:"absolute",inset:0,borderRadius:"50%",border:"2px solid rgba(0,245,255,0.08)"}}/><div style={{position:"absolute",inset:0,borderRadius:"50%",border:"2px solid transparent",borderTopColor:C.cyan,animation:"spin 0.9s linear infinite"}}/><div style={{position:"absolute",inset:10,borderRadius:"50%",border:"2px solid transparent",borderTopColor:C.violet,animation:"spin 1.3s linear infinite reverse"}}/><div style={{position:"absolute",inset:22,borderRadius:"50%",background:"rgba(0,245,255,0.08)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,color:C.cyan}}>◆</div></div><div style={{fontSize:11,fontWeight:700,color:"#f0f9ff",letterSpacing:"0.25em",textTransform:"uppercase",marginBottom:8}}>Processing</div><div style={{fontSize:10,color:"rgba(255,255,255,0.28)",fontWeight:500}}>AI validating · Securing your account...</div></div>}
    </div>
  );
}




// 'use client';

// import { useState } from 'react';
// import Link from 'next/link';
// import axios from 'axios';

// export default function CreateAccount() {
//   const [formData, setFormData] = useState({
//     firstName: '',
//     lastName: '',
//     phone: '',
//     email: '',
//     country: '',
//     address: '',
//     pinCode: '',
//     agreeToTerms: false,
//   });

//   const [errors, setErrors] = useState({});

//   const validateEmail = (email) =>
//     /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email);
//   const validatePhone = (phone) => /^[0-9]{10}$/.test(phone);

//   const handleChange = (e) => {
//     const { name, value, type, checked } = e.target;
//     setFormData({
//       ...formData,
//       [name]: type === 'checkbox' ? checked : value,
//     });

//     // Field-specific validation
//     if (name === 'email' && !validateEmail(value)) {
//       setErrors({ ...errors, email: 'Invalid email address' });
//     } else if (name === 'phone' && !validatePhone(value)) {
//       setErrors({ ...errors, phone: 'Phone number must be 10 digits' });
//     } else {
//       setErrors({ ...errors, [name]: '' });
//     }
//   };

//   const handleSubmit = async (e) => {
//     e.preventDefault();
  
//     try {
//       const response = await axios.post('/api/signup', formData, {
//         headers: { 'Content-Type': 'application/json' },
//       });
  
//       if (response.status === 201) {
//         alert('Account created successfully!');
//         window.location.href = '/';
//         setFormData({
//           firstName: '',
//           lastName: '',
//           phone: '',
//           email: '',
//           country: '',
//           address: '',
//           pinCode: '',
//           agreeToTerms: false,
//         });
//         setErrors({});
        
//       }

//     } catch (error) {
//       if (error.response) {
//         // Handle error from server response
//         console.error('Server error:', error.response.data);
//         setErrors({ general: error.response.data.details || 'Error creating account.' });
//       } else {
//         // Handle other errors (network, etc.)
//         console.error('Error submitting form:', error.message);
//         setErrors({ general: 'Something went wrong. Please try again.' });
//       }
//     }
//   };

//   return (
//     <div className="min-h-screen flex items-center justify-center bg-gray-100">
//       <div className="w-full max-w-lg p-8 bg-white rounded-lg shadow-lg">
//         <form onSubmit={handleSubmit} className="space-y-4">
//           <div className="flex space-x-4">
//             <div>
//               <label
//                 htmlFor="firstName"
//                 className="block text-sm font-medium text-gray-700"
//               >
//                 First Name<span className="text-red-500">*</span>
//               </label>
//               <input
//                 type="text"
//                 id="firstName"
//                 name="firstName"
//                 value={formData.firstName}
//                 onChange={handleChange}
//                 className="w-full px-4 py-2 mt-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-400"
//               />
//               {errors.firstName && (
//                 <p className="text-red-500 text-xs">{errors.firstName}</p>
//               )}
//             </div>

//             <div>
//               <label
//                 htmlFor="lastName"
//                 className="block text-sm font-medium text-gray-700"
//               >
//                 Last Name<span className="text-red-500">*</span>
//               </label>
//               <input
//                 type="text"
//                 id="lastName"
//                 name="lastName"
//                 value={formData.lastName}
//                 onChange={handleChange}
//                 className="w-full px-4 py-2 mt-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-400"
//               />
//               {errors.lastName && (
//                 <p className="text-red-500 text-xs">{errors.lastName}</p>
//               )}
//             </div>
//           </div>

//           <div className="flex space-x-4">
//             <div>
//               <label
//                 htmlFor="phone"
//                 className="block text-sm font-medium text-gray-700"
//               >
//                 Phone Number<span className="text-red-500">*</span>
//               </label>
//               <input
//                 type="text"
//                 id="phone"
//                 name="phone"
//                 value={formData.phone}
//                 onChange={handleChange}
//                 className="w-full px-4 py-2 mt-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
//               />
//               {errors.phone && (
//                 <p className="text-red-500 text-xs">{errors.phone}</p>
//               )}
//             </div>

//             <div>
//               <label
//                 htmlFor="email"
//                 className="block text-sm font-medium text-gray-700"
//               >
//                 Email<span className="text-red-500">*</span>
//               </label>
//               <input
//                 type="email"
//                 id="email"
//                 name="email"
//                 value={formData.email}
//                 onChange={handleChange}
//                 className="w-full px-4 py-2 mt-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
//               />
//               {errors.email && (
//                 <p className="text-red-500 text-xs">{errors.email}</p>
//               )}
//             </div>
//           </div>

//           <div className="flex space-x-4">
//             <div>
//               <label
//                 htmlFor="country"
//                 className="block text-sm font-medium text-gray-700"
//               >
//                 Country<span className="text-red-500">*</span>
//               </label>
//               <select
//                 id="country"
//                 name="country"
//                 value={formData.country}
//                 onChange={handleChange}
//                 className="w-full px-4 py-2 mt-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
//               >
//                 <option value="">Select Country</option>
//                 <option value="India">India</option>
//                 <option value="USA">USA</option>
//                 <option value="Canada">Canada</option>
//                 <option value="Australia">Australia</option>
//               </select>
//               {errors.country && (
//                 <p className="text-red-500 text-xs">{errors.country}</p>
//               )}
//             </div>

//             <div>
//               <label
//                 htmlFor="address"
//                 className="block text-sm font-medium text-gray-700"
//               >
//                 Address (Optional)
//               </label>
//               <input
//                 type="text"
//                 id="address"
//                 name="address"
//                 value={formData.address}
//                 onChange={handleChange}
//                 className="w-full px-4 py-2 mt-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
//               />
//             </div>
//           </div>

//           <div>
//             <label htmlFor="agreeToTerms" className="flex items-center space-x-2">
//               <input
//                 type="checkbox"
//                 id="agreeToTerms"
//                 name="agreeToTerms"
//                 checked={formData.agreeToTerms}
//                 onChange={handleChange}
//                 className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
//               />
//               <span className="text-gray-700 text-sm">
//                 I agree to Import Export Terms of Service,Privacy Policy & Cookie Policy.
//               </span>
//             </label>
//             {errors.agreeToTerms && (
//               <p className="text-red-500 text-xs">{errors.agreeToTerms}</p>
//             )}
//           </div>

//           <button
//             type="submit"
//             className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
//           >
//             Create Account
//           </button>
//         </form>
//       <div className="mt-4 text-center">
//             <p className="text-sm">
//               I have an account?{' '}
//               <Link href="/">
//                 <button
//                   type="button"
//                   className="text-blue-600 hover:underline"
//                   onClick={() => console.log('Navigate to Create Account')}
//                 >
//                   Login
//                 </button>
//               </Link>
//             </p>
//           </div>
//       </div>
//     </div>
//   );
// }
