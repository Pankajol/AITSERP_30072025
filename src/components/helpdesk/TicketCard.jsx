"use client";

import { Clock, Tag, Hash, User, MessageSquare, ChevronRight, AlertCircle } from "lucide-react";

export default function TicketCard({ ticket }) {
  // Bold & Vibrant Status Styles for better interaction
  const getStatusStyles = (status = "") => {
    const s = status.toLowerCase();
    switch (s) {
      case "open": return "text-blue-600 bg-blue-50 border-blue-200 shadow-sm";
      case "closed": return "text-slate-500 bg-slate-50 border-slate-200 opacity-70";
      case "in_progress": return "text-indigo-600 bg-indigo-50 border-indigo-200 shadow-sm";
      case "waiting": return "text-amber-600 bg-amber-50 border-amber-200";
      default: return "text-slate-500 bg-slate-100 border-slate-200";
    }
  };

  const getPriorityInfo = (p = "") => {
    const priority = p.toLowerCase();
    if (priority === "high") return { color: "text-red-600", bg: "bg-red-500" };
    if (priority === "medium") return { color: "text-orange-500", bg: "bg-orange-400" };
    return { color: "text-slate-400", bg: "bg-slate-300" };
  };

  const priority = getPriorityInfo(ticket.priority);

  return (
    <div className="group relative bg-white border border-slate-200 rounded-xl p-4 transition-all duration-200 hover:shadow-lg hover:border-blue-400 hover:bg-blue-50/30 flex items-center gap-4 cursor-pointer mb-2">
      
      {/* 1. Dynamic Priority Bar */}
      <div className={`w-1.5 self-stretch rounded-full ${priority.bg} shadow-sm`} />

      <div className="flex-1 flex items-center min-w-0">
        
        {/* 2. Primary Information */}
        <div className="flex-1 min-w-0 pr-4">
          <div className="flex items-center gap-3 mb-1.5">
            <span className="flex items-center gap-1 text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
              <Hash size={12} strokeWidth={3} />{ticket.ticketNo 
    ? ticket.ticketNo 
    : `TKT-${ticket._id?.toString().slice(-6).toUpperCase()}`
  }
            </span>
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
              <User size={14} className="text-blue-500" />
              <span className="truncate max-w-[150px]">
                {ticket.customerId?.customerName || ticket.customerEmail?.split('@')[0]}
              </span>
            </div>
            {ticket.priority?.toLowerCase() === 'high' && (
              <span className="flex items-center gap-1 text-[10px] font-black text-red-600 uppercase animate-pulse">
                <AlertCircle size={10} /> Urgent
              </span>
            )}
          </div>
          
          <h2 className="text-[15px] font-bold text-slate-900 leading-snug group-hover:text-blue-700 transition-colors line-clamp-1">
            {ticket.subject}
          </h2>
        </div>

        {/* 3. Metadata - High Visibility */}
        <div className="hidden lg:flex items-center gap-6 mr-8">
          <div className="flex flex-col items-start">
            <span className="text-[10px] uppercase text-slate-400 font-bold tracking-widest">Category</span>
            <div className="flex items-center gap-1.5 text-slate-700 font-semibold text-xs">
              <Tag size={12} className="text-blue-400" />
              {ticket.category || "General"}
            </div>
          </div>
          <div className="flex flex-col items-start">
            <span className="text-[10px] uppercase text-slate-400 font-bold tracking-widest">Last Update</span>
            <div className="flex items-center gap-1.5 text-slate-700 font-semibold text-xs">
              <Clock size={12} className="text-blue-400" />
              {ticket.updatedAt ? new Date(ticket.updatedAt).toLocaleDateString() : 'Today'}
            </div>
          </div>
        </div>

        {/* 4. Action & Status */}
        <div className="flex items-center gap-5 flex-shrink-0 border-l border-slate-100 pl-6">
          <div className="flex flex-col items-center">
            <MessageSquare size={16} className="text-slate-300 group-hover:text-blue-400 transition-colors" />
            <span className="text-[10px] font-bold text-slate-400">{ticket.messages?.length || 0}</span>
          </div>
          
          <span className={`w-24 text-center py-1.5 rounded-lg text-[11px] font-extrabold uppercase tracking-wider border-2 ${getStatusStyles(ticket.status)}`}>
            {ticket.status?.replace("_", " ")}
          </span>

          <div className="w-8 h-8 rounded-full flex items-center justify-center bg-slate-50 group-hover:bg-blue-600 group-hover:text-white transition-all shadow-inner">
            <ChevronRight size={18} />
          </div>
        </div>
      </div>
    </div>
  );
}

// "use client";

// import { Clock, Tag, AlertCircle, Hash } from "lucide-react";

// export default function TicketCard({ ticket }) {
//   // Database status lowercase hote hain, isliye .toLowerCase() use karna safe hai
//   const getStatusStyles = (status = "") => {
//     const s = status.toLowerCase();
//     switch (s) {
//       case "open":
//         return "bg-emerald-100 text-emerald-700 border-emerald-200";
//       case "closed":
//         return "bg-slate-100 text-slate-500 border-slate-200";
//       case "in_progress":
//         return "bg-indigo-100 text-indigo-700 border-indigo-200";
//       case "waiting":
//         return "bg-amber-100 text-amber-700 border-amber-200";
//       default:
//         return "bg-gray-100 text-gray-600 border-gray-200";
//     }
//   };

//   const getPriorityColor = (priority = "") => {
//     const p = priority.toLowerCase();
//     switch (p) {
//       case "high":
//         return "text-red-600 bg-red-50 px-2 py-0.5 rounded-md border border-red-100";
//       case "medium":
//         return "text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-100";
//       case "low":
//         return "text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100";
//       default:
//         return "text-slate-500 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100";
//     }
//   };

//   return (
//     <div className="group bg-white rounded-2xl border border-slate-200 p-5 hover:border-indigo-300 hover:shadow-xl hover:shadow-indigo-500/5 transition-all duration-300">
//       <div className="flex justify-between items-start gap-4">
        
//         {/* LEFT CONTENT */}
//         <div className="space-y-3 flex-1">
//           <div className="flex items-center gap-2">
//             <span className="flex items-center gap-1 text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full uppercase tracking-wider">
//               <Hash size={10} />
//               {ticket.ticketNo || ticket._id?.slice(-6)}
//             </span>
//             <span className={`text-[10px] font-bold uppercase tracking-wider ${getPriorityColor(ticket.priority)}`}>
//               {ticket.priority || "Normal"}
//             </span>
//           </div>

//           <div>
//             <h2 className="text-base font-bold text-slate-800 line-clamp-1 group-hover:text-indigo-600 transition-colors">
//               {ticket.subject}
//             </h2>
//             <p className="text-xs text-slate-500 font-medium truncate mt-1">
//               {ticket.customerEmail}
//             </p>
//           </div>

//           <div className="flex flex-wrap items-center gap-4 pt-1">
//             <p className="text-[11px] text-slate-400 flex items-center gap-1.5 font-medium">
//               <Tag size={12} className="text-slate-300" />
//               {ticket.category || "General"}
//             </p>
//             <p className="text-[11px] text-slate-400 flex items-center gap-1.5 font-medium">
//               <Clock size={12} className="text-slate-300" />
//               {new Date(ticket.updatedAt).toLocaleDateString()}
//             </p>
//           </div>
//         </div>

//         {/* RIGHT CONTENT */}
//         <div className="flex flex-col items-end gap-3">
//           <span
//             className={`text-[10px] font-bold px-3 py-1 rounded-full border shadow-sm uppercase tracking-tighter ${getStatusStyles(
//               ticket.status
//             )}`}
//           >
//             {ticket.status?.replace("_", " ")}
//           </span>
          
//           <div className="flex -space-x-2">
//              {/* Yahan aap agent ka avatar dikha sakte hain agar data hai */}
//              <div className="w-7 h-7 rounded-full border-2 border-white bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-400 uppercase">
//                 {ticket.agentId?.name?.charAt(0) || "?"}
//              </div>
//           </div>
//         </div>

//       </div>
//     </div>
//   );
// }

