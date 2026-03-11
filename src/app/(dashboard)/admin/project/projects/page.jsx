"use client";

import { useEffect, useState, useMemo } from "react";
import api from "@/lib/api";
import Select from "react-select";
import { useRouter } from "next/navigation";
import { HiDotsVertical } from "react-icons/hi";
import { 
  FaProjectDiagram, FaPlus, FaCalendarAlt, FaUserFriends, 
  FaRegAddressCard, FaMoneyBillWave, FaWarehouse ,FaCheck
} from "react-icons/fa";

export default function ProjectsPage() {
  const [projects, setProjects] = useState([]);
  const [workspaces, setWorkspaces] = useState([]);
  const [description, setDescription] = useState("");
  const [users, setUsers] = useState([]);
  const [assignees, setAssignees] = useState([]);
  const [dueDate, setDueDate] = useState("");
  const [projectedStartDate, setProjectedStartDate] = useState("");
  const [projectedEndDate, setProjectedEndDate] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [priority, setPriority] = useState("low");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editProject, setEditProject] = useState(null);
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState("");
  const [workspaceId, setWorkspaceId] = useState("");
  const [status, setStatus] = useState("active");
  const [customers, setCustomers] = useState([]);
  const [salesOrders, setSalesOrders] = useState([]);
  const [customer, setCustomer] = useState("");
  const [salesOrder, setSalesOrder] = useState("");
  const [costingBilling, setCostingBilling] = useState("");
  const [estimatedCosting, setEstimatedCosting] = useState("");
  const [defaultCostCenter, setDefaultCostCenter] = useState("");

  const router = useRouter();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem("token");
        if (!token) return;
        const headers = { headers: { Authorization: `Bearer ${token}` } };

        const [uRes, pRes, wRes, cRes, soRes] = await Promise.all([
          api.get("/company/users", headers),
          api.get("/project/projects", headers),
          api.get("/project/workspaces", headers),
          api.get("/customers", headers),
          api.get("/sales-order", headers),
        ]);

        const employees = uRes.data.filter((user) => user.roles?.includes("Employee"));
        setUsers(employees);
        setProjects(pRes.data);
        setWorkspaces(wRes.data);
        setCustomers(cRes.data.data || []);
        setSalesOrders(soRes.data.data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const filteredSalesOrders = customer
    ? salesOrders.filter((so) => so.customer === customer.value)
    : [];

  const openModal = (project = null) => {
    setEditProject(project);
    setName(project ? project.name : "");
    setWorkspaceId(project ? project.workspace?._id : "");
    setStatus(project ? project.status : "active");
    setDescription(project ? project.description : "");
    setDueDate(project?.dueDate ? project.dueDate.split("T")[0] : "");
    setProjectedStartDate(project?.projectedStartDate ? project.projectedStartDate.split("T")[0] : "");
    setProjectedEndDate(project?.projectedEndDate ? project.projectedEndDate.split("T")[0] : "");
    setStartDate(project?.startDate ? project.startDate.split("T")[0] : "");
    setEndDate(project?.endDate ? project.endDate.split("T")[0] : "");
    setPriority(project ? project.priority : "low");
    setAssignees(project?.members ? project.members.map(m => m._id || m) : []);
    setCustomer(project?.customer ? { value: project.customer._id, label: project.customer.customerName } : "");
    setSalesOrder(project?.salesOrder ? { value: project.salesOrder._id, label: project.salesOrder.documentNumberOrder } : "");
    setCostingBilling(project ? project.costingBilling : "");
    setEstimatedCosting(project ? project.estimatedCosting : "");
    setDefaultCostCenter(project ? project.defaultCostCenter : "");
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditProject(null);
    setName(""); setDescription(""); setDueDate(""); setProjectedStartDate("");
    setProjectedEndDate(""); setStartDate(""); setEndDate(""); setPriority("low");
    setAssignees([]); setCustomer(""); setSalesOrder(""); setCostingBilling("");
    setEstimatedCosting(""); setDefaultCostCenter("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      name, workspace: workspaceId, status, description, dueDate,
      projectedStartDate, projectedEndDate, startDate, endDate,
      priority, members: assignees, customer: customer?.value || null,
      salesOrder: salesOrder?.value || null, costingBilling,
      estimatedCosting, defaultCostCenter,
    };

    try {
      if (editProject) {
        const res = await api.put(`/project/projects/${editProject._id}`, payload);
        setProjects(prev => prev.map(p => p._id === editProject._id ? res.data : p));
      } else {
        const res = await api.post("/project/projects", payload);
        setProjects([...projects, res.data]);
      }
      closeModal();
    } catch (err) {
      console.error("❌ Project save failed:", err);
    }
  };

  // --- UI Helpers ---
  const Lbl = ({ text, req }) => (
    <label className="block text-[10.5px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">
      {text}{req && <span className="text-red-500 ml-0.5">*</span>}
    </label>
  );

  const fi = "w-full px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm font-medium focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all outline-none";

  const PriorityBadge = ({ level }) => {
    const colors = {
      critical: "bg-red-100 text-red-700",
      high: "bg-orange-100 text-orange-700",
      medium: "bg-blue-100 text-blue-700",
      low: "bg-emerald-100 text-emerald-700",
    };
    return <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${colors[level] || colors.low}`}>{level}</span>;
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-10">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 flex items-center gap-3">
              <FaProjectDiagram className="text-indigo-600" /> Projects
            </h1>
            <p className="text-sm text-gray-400 mt-0.5">Manage deliverables, costing, and team assignments</p>
          </div>
          <button 
            onClick={() => openModal()} 
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all"
          >
            <FaPlus size={12} /> New Project
          </button>
        </div>

        {/* Table Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-6 py-4 text-left text-[10.5px] font-bold uppercase tracking-wider text-gray-400">Project Name</th>
                  <th className="px-6 py-4 text-left text-[10.5px] font-bold uppercase tracking-wider text-gray-400">Environment</th>
                  <th className="px-6 py-4 text-left text-[10.5px] font-bold uppercase tracking-wider text-gray-400">Team</th>
                  <th className="px-6 py-4 text-left text-[10.5px] font-bold uppercase tracking-wider text-gray-400">Timeline</th>
                  <th className="px-6 py-4 text-center text-[10.5px] font-bold uppercase tracking-wider text-gray-400">Priority</th>
                  <th className="px-6 py-4 text-center text-[10.5px] font-bold uppercase tracking-wider text-gray-400">Status</th>
                  <th className="px-6 py-4 text-right text-[10.5px] font-bold uppercase tracking-wider text-gray-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  <tr><td colSpan="7" className="px-6 py-10 text-center text-gray-400 italic">Syncing project data...</td></tr>
                ) : projects.map((p) => (
                  <tr key={p._id} className="hover:bg-indigo-50/20 transition-colors">
                    <td className="px-6 py-4 font-bold text-indigo-600 hover:underline cursor-pointer" onClick={() => router.push(`/admin/project/projects/${p._id}`)}>
                      {p.name}
                    </td>
                    <td className="px-6 py-4 font-medium text-gray-500 uppercase text-[11px] tracking-tight">
                      {p.workspace?.name || "Unassigned"}
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-400">
                      {p.members?.length > 0 ? `${p.members.length} Members` : "No Assignees"}
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-500">
                      <div className="flex flex-col">
                        <span className="font-bold">{p.dueDate ? new Date(p.dueDate).toLocaleDateString('en-GB') : "No Deadline"}</span>
                        <span className="text-[10px] text-gray-300">Started: {p.startDate ? new Date(p.startDate).toLocaleDateString('en-GB') : "-"}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <PriorityBadge level={p.priority} />
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${p.status === 'active' ? 'bg-indigo-50 text-indigo-600' : 'bg-gray-100 text-gray-400'}`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button onClick={() => openModal(p)} className="p-2 text-gray-300 hover:text-indigo-600 transition-colors">
                        <HiDotsVertical size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
            <div className="px-8 py-6 border-b border-gray-100 flex items-center gap-3 bg-indigo-50/50">
              <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-indigo-600 shadow-sm">
                <FaProjectDiagram size={20} />
              </div>
              <h2 className="text-xl font-black text-gray-900 tracking-tight">
                {editProject ? "Update Project Details" : "New Project Initiation"}
              </h2>
            </div>
            
            <form onSubmit={handleSubmit} className="p-8 space-y-8 overflow-y-auto">
              {/* Basic Info Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <Lbl text="Project Name" req />
                  <input type="text" className={fi} value={name} onChange={(e) => setName(e.target.value)} required />
                </div>
                <div className="md:col-span-2">
                  <Lbl text="Project Description" />
                  <textarea className={`${fi} h-20 resize-none`} value={description} onChange={(e) => setDescription(e.target.value)} />
                </div>
              </div>

              {/* Assignment & Workspace */}
              <div className="border-t border-gray-100 pt-6">
                <p className="text-[11px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-4">Organization & Team</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Lbl text="Workspace" req />
                    <select className={fi} value={workspaceId} onChange={(e) => setWorkspaceId(e.target.value)} required>
                      <option value="">Select Environment</option>
                      {workspaces.map((w) => <option key={w._id} value={w._id}>{w.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <Lbl text="Team Members" />
                    <Select
                      isMulti
                      options={users.map((u) => ({ value: u._id, label: u.name }))}
                      value={assignees.map(id => ({ value: id, label: users.find(u => u._id === id)?.name || id }))}
                      onChange={(s) => setAssignees(s.map(x => x.value))}
                      className="text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* CRM & Billing */}
              <div className="border-t border-gray-100 pt-6">
                <p className="text-[11px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-4">Financial & Customer Linking</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <Lbl text="Customer" />
                    <Select
                      options={customers.map((c) => ({ value: c._id, label: c.customerName }))}
                      value={customer}
                      onChange={(s) => setCustomer(s)}
                      className="text-sm"
                    />
                  </div>
                  <div>
                    <Lbl text="Reference Sales Order" />
                    <Select
                      options={filteredSalesOrders.map((so) => ({ value: so._id, label: so.documentNumberOrder }))}
                      value={salesOrder}
                      onChange={(s) => setSalesOrder(s)}
                      isDisabled={!customer}
                      className="text-sm"
                    />
                  </div>
                  <div>
                    <Lbl text="Est. Total Cost" />
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">₹</span>
                      <input type="text" className={`${fi} pl-7`} value={estimatedCosting} onChange={(e) => setEstimatedCosting(e.target.value)} />
                    </div>
                  </div>
                  <div>
                    <Lbl text="Cost Center" />
                    <input type="text" className={fi} value={defaultCostCenter} onChange={(e) => setDefaultCostCenter(e.target.value)} />
                  </div>
                </div>
              </div>

              {/* Timeline Section */}
              <div className="border-t border-gray-100 pt-6">
                <p className="text-[11px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-4">Deadlines & Scheduling</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                  <div><Lbl text="Priority" /><select className={fi} value={priority} onChange={(e) => setPriority(e.target.value)}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option></select></div>
                  <div><Lbl text="Final Due Date" /><input type="date" className={fi} value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></div>
                  <div><Lbl text="Status" /><select className={fi} value={status} onChange={(e) => setStatus(e.target.value)}><option value="active">Active</option><option value="archived">Archived</option></select></div>
                </div>
              </div>

              {/* Footer */}
              <div className="flex justify-end items-center gap-4 pt-4 sticky bottom-0 bg-white border-t border-gray-50 mt-4 py-4">
                <button type="button" onClick={closeModal} className="text-sm font-bold text-gray-400 hover:text-gray-600 uppercase tracking-widest">Cancel</button>
                <button type="submit" className="flex items-center gap-2 px-8 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all">
                  <FaCheck size={12} /> {editProject ? "Update Project" : "Initiate Project"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}



// "use client";
// import { useEffect, useState } from "react";
// import api from "@/lib/api";
// import Select from "react-select";
// import { useRouter } from "next/navigation";
// import { HiDotsVertical } from "react-icons/hi";


// export default function ProjectsPage() {
//   const [projects, setProjects] = useState([]);
//   const [workspaces, setWorkspaces] = useState([]);
//   const [description, setDescription] = useState("");
//   const [users, setUsers] = useState([]);
//   const [assignees, setAssignees] = useState([]);
//   const [assignedTo, setAssignedTo] = useState("");
//   const [dueDate, setDueDate] = useState("");
//   // projeced date
//   const [projectedStartDate, setProjectedStartDate] = useState("");
//   const [projectedEndDate, setProjectedEndDate] = useState("");
//   const [startDate, setStartDate] = useState("");
//   const [endDate, setEndDate] = useState("");
//   const [priority, setPriority] = useState("low");
//   const [isModalOpen, setIsModalOpen] = useState(false);
//   const [editProject, setEditProject] = useState(null);

//   const [name, setName] = useState("");
//   const [workspaceId, setWorkspaceId] = useState("");
//   const [status, setStatus] = useState("active");
//   const [customers, setCustomers] = useState([]);
//   const [salesOrders, setSalesOrders] = useState([]);
//   const [customer, setCustomer] = useState("");
//   const [salesOrder, setSalesOrder] = useState("");
//   const [costingBilling, setCostingBilling] = useState("");
//   const [estimatedCosting, setEstimatedCosting] = useState("");
//   const [defaultCostCenter, setDefaultCostCenter] = useState("");

//   const router = useRouter();






//   // fetch projects + workspaces
//   useEffect(() => {
//     const fetchData = async () => {
//       try {
//         const token = localStorage.getItem("token");
//         if (!token) return;
//         const headers = { headers: { Authorization: `Bearer ${token}` } };

//         const [uRes, pRes, wRes, cRes, soRes] = await Promise.all([
//           api.get("/company/users", headers),
//           api.get("/project/projects", headers),
//           api.get("/project/workspaces", headers),
//           api.get("/customers", headers), // fetch customers
//           api.get("/sales-order", headers), // fetch sales orders
//         ]);

//         // console.log("all project data", pRes.data);
//         // console.log(wRes.data);

//         // filter users to only include those with "Employee" role
//         const employees = uRes.data.filter((user) =>
//           user.roles?.includes("Employee")
//         );
//         setUsers(employees);
//         //
//         // setUsers(uRes.data);
//         setProjects(pRes.data);
//         setWorkspaces(wRes.data);
//         setCustomers(cRes.data.data || []);
//         setSalesOrders(soRes.data.data || []);
//       } catch (err) {
//         console.error(err);
//       }
//     };
//     fetchData();
//   }, [customer]);
//   const filteredSalesOrders = customer
//     ? salesOrders.filter((so) => so.customer === customer.value)
//     : [];
//   // open modal
//   const openModal = (project = null) => {
//     setEditProject(project);
//     setName(project ? project.name : "");
//     setWorkspaceId(project ? project.workspace?._id : "");
//     setStatus(project ? project.status : "active");
//     setIsModalOpen(true);
//     setDescription(project ? project.description : "");
//     setDueDate(project ? (project.dueDate ? project.dueDate.split("T")[0] : "") : "");
//     setProjectedStartDate(project ? (project.projectedStartDate ? project.projectedStartDate.split("T")[0] : "") : "");
//     setProjectedEndDate(project ? (project.projectedEndDate ? project.projectedEndDate.split("T")[0] : "") : "");
//     setStartDate(project ? (project.startDate ? project.startDate.split("T")[0] : "") : "");
//     setEndDate(project ? (project.endDate ? project.endDate.split("T")[0] : "") : "");
//     setPriority(project ? project.priority : "low");
//     setAssignees(project ? (Array.isArray(project.members) ? project.members.map((m) => (typeof m === "object" ? m._id : m)) : []) : []);
//     setAssignedTo(project && project.assignedTo ? (typeof project.assignedTo === "object" ? project.assignedTo._id : project.assignedTo) : "");
//     setCustomer(project && project.customer ? { value: project.customer._id, label: project.customer.customerName || `C-${project.customer._id}` } : "");
//     setSalesOrder(project && project.salesOrder ? { value: project.salesOrder._id, label: project.salesOrder.documentNumberOrder || `SO-${project.salesOrder._id}` } : "");
//     setCostingBilling(project ? project.costingBilling : "");
//     setEstimatedCosting(project ? project.estimatedCosting : "");
//     setDefaultCostCenter(project ? project.defaultCostCenter : "");

//   };

//   const closeModal = () => {
//     setIsModalOpen(false);
//     setEditProject(null);
//     setName("");
//     setWorkspaceId("");
//     setStatus("active");
//     setDescription("");
//     setDueDate("");
//     setProjectedStartDate("");
//     setProjectedEndDate("");
//     setStartDate("");
//     setEndDate("");
//     setPriority("low");
//     setAssignees([]);
//     setAssignedTo("");
//     setCustomer("");
//     setSalesOrder("");
//     setCostingBilling("");
//     setEstimatedCosting("");
//     setDefaultCostCenter("");
//   };

  

// // add / edit project
// const handleSubmit = async (e) => {
//   e.preventDefault();
//   try {
//     if (editProject) {
//       // update
//       const res = await api.put(`/project/projects/${editProject._id}`, {
//         name,
//         workspace: workspaceId,
//         status,
//         description,
//         dueDate,
//         projectedStartDate,
//         projectedEndDate,
//         startDate,
//         endDate,
//         priority,
//         members: assignees, // array of user IDs
//         assignedTo,
//         customer: customer ? customer.value : null,   // ✅ fixed
//         salesOrder: salesOrder ? salesOrder.value : null, // ✅ fixed
//         costingBilling,
//         estimatedCosting,
//         defaultCostCenter,
//       });
//       setProjects((prev) =>
//         prev.map((p) => (p._id === editProject._id ? res.data : p))
//       );
//     } else {
//       // create
//       const res = await api.post("/project/projects", {
//         name,
//         workspace: workspaceId,
//         status,
//         description,
//         dueDate,
//         projectedStartDate,
//         projectedEndDate,
//         startDate,
//         endDate,
//         priority,
//         members: assignees, // array of user IDs
//         assignedTo,
//         customer: customer ? customer.value : null,
//         salesOrder: salesOrder ? salesOrder.value : null,
//         costingBilling,
//         estimatedCosting,
//         defaultCostCenter,
//       });
//       setProjects([...projects, res.data]);
//     }
//     closeModal();
//   } catch (err) {
//     console.error("❌ Project save failed:", err.response?.data || err.message);
//   }
// };




//   // delete
// const handleDelete = async (id) => {
//   if (!confirm("Are you sure you want to delete this project?")) return;

//   try {
//     await api.delete(`/project/projects/${id}`); // 🔴 Must match backend
//     setProjects((prev) => prev.filter((p) => p._id !== id));
//   } catch (err) {
//     console.error("❌ Delete error:", err);
//   }
// };


//   // fetch users for assignee dropdown

//   return (
//     <div className="p-6">
//       <div className="flex justify-between items-center mb-6">
//         <h1 className="text-2xl font-bold">Projects</h1>
//         <button
//           onClick={() => openModal()}
//           className="bg-purple-600 text-white px-4 py-2 rounded"
//         >
//           + Add Project
//         </button>
//       </div>

//       {/* Projects Table */}
//       <table className="w-full border">
//         <thead>
//           <tr className="bg-gray-100">
//             <th className="p-2 border">Name</th>
//             <th className="p-2 border">Workspace</th>
//             <th className="p-2 border">Description</th>
//             {/* <th className="p-2 border">Assigned To</th> */}
//             <th className="p-2 border">Assignees</th>
//             <th className="p-2 border">Due Date</th>
//             <th className="p-2 border">Projected Start Date</th>
//             <th className="p-2 border">Projected End Date</th>

//             <th className="p-2 border">Start Date</th>
//             <th className="p-2 border">End Date</th>
//             <th className="p-2 border">Priority</th>

//             <th className="p-2 border">Status</th>
//             <th className="p-2 border">Actions</th>
//           </tr>
//         </thead>
//         <tbody>
//           {projects.map((p) => (
//             <tr key={p._id}>
//               <td className="p-2 border cursor-pointer hover:bg-gray-100 flex items-center gap-2 text-purple-600"
//               onClick={() => router.push(`/admin/project/projects/${p._id}`)}>
//                 {p.name}</td>
//               <td className="p-2 border">{p.workspace?.name}</td>
//               <td className="p-2 border">{p.description}</td>
//               {/* <td className="p-2 border">{p.assignedTo?.name || "-"}</td> */}
//               <td className="p-2 border">
//                 {Array.isArray(p.members) && p.members.length
//                   ? p.members.map((u) => (u.name ? u.name : u)).join(", ")
//                   : "-"}
//               </td>
//               <td className="p-2 border">
//                 {" "}
//                 {p.dueDate ? new Date(p.dueDate).toLocaleDateString() : "-"}
//               </td>
//               <td className="p-2 border">
//                 {p.projectedStartDate ? new Date(p.projectedStartDate).toLocaleDateString() : "-"}
//               </td>
//               <td className="p-2 border">
//                 {p.projectedEndDate ? new Date(p.projectedEndDate).toLocaleDateString() : "-"}
//               </td>

//               <td className="p-2 border">
//                 {p.startDate ? new Date(p.startDate).toLocaleDateString() : "-"}
//               </td>
//               <td className="p-2 border">
//                 {p.endDate ? new Date(p.endDate).toLocaleDateString() : "-"}
//               </td>
//               <td className="p-2 border">{p.priority}</td>

//               <td className="p-2 border">{p.status}</td>
//               {/* <td className="p-2 border space-x-2">
//                 <button
//                   onClick={() => openModal(p)}
//                   className="bg-blue-500 text-white px-3 py-1 rounded"
//                 >
//                   Edit
//                 </button>
             
//                 <button 
//                   onClick={() => alert(JSON.stringify(p, null, 2))}
//                 className="bg-green-500 text-white px-3 py-1 rounded">
//                   View
//                 </button>
//                 <button
//                   onClick={() => handleDelete(p._id)}
//                   className="bg-red-500 text-white px-3 py-1 rounded"
//                 >
//                   Delete
//                 </button>
//               </td> */}

//               {/* Actions dropdown */}
//               <td className="p-2 border" onClick={(e) => e.stopPropagation()}>
//                 <div className="relative inline-block text-left">
//                   {/* Trigger button */}
//                   <button
//                     onClick={() =>
//                       setProjects((prev) =>
//                         prev.map((proj) =>
//                           proj._id === p._id
//                             ? { ...proj, menuOpen: !proj.menuOpen }
//                             : { ...proj, menuOpen: false }
//                         )
//                       )
//                     }
//                     className="px-3 py-1 bg-gray-100 border rounded hover:bg-gray-200"
//                   >
//                    <HiDotsVertical />
//                   </button>

//                   {/* Dropdown menu */}
//                   {p.menuOpen && (
//                     <div className="absolute right-0 mt-1 w-32 bg-white border rounded shadow-lg z-10">
//                       <button
//                         onClick={() => openModal(p)}
//                         className="block w-full text-left px-4 py-2 text-sm text-blue-600 hover:bg-gray-100"
//                       >
//                         Edit
//                       </button>
//                       {/* <button
//                         onClick={() => alert(JSON.stringify(p, null, 2))}
//                         className="block w-full text-left px-4 py-2 text-sm text-green-600 hover:bg-gray-100"
//                       >
//                         View
//                       </button> */}
//                       <button
//                         onClick={() => handleDelete(p._id)}
//                         className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
//                       >
//                         Delete
//                       </button>
//                     </div>
//                   )}
//                 </div>
//               </td>

//             </tr>
//           ))}
//         </tbody>
//       </table>

//       {/* Modal */}
//       {isModalOpen && (
//         <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
//           <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
//             <h2 className="text-lg font-bold mb-4">
//               {editProject ? "Edit Project" : "Add Project"}
//             </h2>

//             <form onSubmit={handleSubmit} className="grid gap-4">
//               {/* Name */}
//               <div className="flex flex-col">
//                 <label className="font-semibold mb-1">Name</label>
//                 <input
//                   type="text"
//                   placeholder="Project Name"
//                   className="border p-2 rounded"
//                   value={name}
//                   onChange={(e) => setName(e.target.value)}
//                   required
//                 />
//               </div>

//               {/* Description */}
//               <div className="flex flex-col">
//                 <label className="font-semibold mb-1">Description</label>
//                 <textarea
//                   placeholder="Description"
//                   className="border p-2 rounded"
//                   value={description}
//                   onChange={(e) => setDescription(e.target.value)}
//                 />
//               </div>

//               {/* Dates */}
//               <div className="grid grid-cols-2 gap-2">
//                 <div className="flex flex-col">
//                   <label className="font-semibold mb-1">Due Date</label>
//                   <input
//                     type="date"
//                     className="border p-2 rounded"
//                     value={dueDate}
//                     onChange={(e) => setDueDate(e.target.value)}
//                   />
//                 </div>
//                 {/* projected start date */} 
//                 <div className="flex flex-col">
//                   <label className="font-semibold mb-1">Projected Start Date</label>
//                   <input
//                     type="date"
//                     className="border p-2 rounded"
//                     value={projectedStartDate}
//                     onChange={(e) => setProjectedStartDate(e.target.value)}
//                   />
//                 </div>
//                 {/* projected end date */}
//                 <div className="flex flex-col">
//                   <label className="font-semibold mb-1">Projected End Date</label>
//                   <input
//                     type="date"
//                     className="border p-2 rounded"
//                     value={projectedEndDate}
//                     onChange={(e) => setProjectedEndDate(e.target.value)}
//                   />
//                 </div>
//                 {/* start date */}
//                 <div className="flex flex-col">
//                   <label className="font-semibold mb-1">Start Date</label>
//                   <input
//                     type="date"
//                     className="border p-2 rounded"
//                     value={startDate}
//                     onChange={(e) => setStartDate(e.target.value)}
//                   />
//                 </div>
//                 <div className="flex flex-col col-span-2">
//                   <label className="font-semibold mb-1">End Date</label>
//                   <input
//                     type="date"
//                     className="border p-2 rounded"
//                     value={endDate}
//                     onChange={(e) => setEndDate(e.target.value)}
//                   />
//                 </div>
//               </div>

//               {/* Priority */}
//               <div className="flex flex-col">
//                 <label className="font-semibold mb-1">Priority</label>
//                 <select
//                   className="border p-2 rounded"
//                   value={priority}
//                   onChange={(e) => setPriority(e.target.value)}
//                 >
//                   <option value="low">Low</option>
//                   <option value="medium">Medium</option>
//                   <option value="high">High</option>
//                   <option value="critical">Critical</option>
//                 </select>
//               </div>

//               {/* Assignees */}
//               <div className="flex flex-col">
//                 <label className="font-semibold mb-1">Assignees</label>
//                 <Select
//                   isMulti
//                   options={users.map((u) => ({ value: u._id, label: u.name }))}
//                   value={assignees.map((id) => {
//                     const user = users.find((u) => u._id === id);
//                     return { value: id, label: user?.name || id };
//                   })}
//                   onChange={(selected) =>
//                     setAssignees(selected.map((s) => s.value))
//                   }
//                   placeholder="Search & select users"
//                   className="text-sm"
//                 />
//               </div>

//               {/* Workspace */}
//               <div className="flex flex-col">
//                 <label className="font-semibold mb-1">Workspace</label>
//                 <select
//                   className="border p-2 rounded"
//                   value={workspaceId}
//                   onChange={(e) => setWorkspaceId(e.target.value)}
//                   required
//                 >
//                   <option value="">Select Workspace</option>
//                   {workspaces.map((w) => (
//                     <option key={w._id} value={w._id}>
//                       {w.name}
//                     </option>
//                   ))}
//                 </select>
//               </div>

//               <div className="flex flex-col gap-4">

// <div className="flex flex-col">
//   <label className="font-semibold mb-1">Customer</label>
//   <Select
//     options={customers.map((c) => ({
//       value: c._id,
//       label: c.customerName || `C-${c._id}`,
//     }))}
//     value={customer}
//     onChange={(selected) => setCustomer(selected)}
//     placeholder="Search & select customer"
//     className="text-sm"
//     isSearchable
//   />
// </div>


// <div className="flex flex-col">
//   <label className="font-semibold mb-1">Sales Order</label>
//   <Select
//     options={filteredSalesOrders.map((so) => ({
//       value: so._id,
//       label: so.documentNumberOrder || `SO-${so._id}`,
//     }))}
//     value={salesOrder}
//     onChange={(selected) => setSalesOrder(selected)}
//     placeholder={
//       customer ? "Search & select sales order" : "Select a customer first"
//     }
//     className="text-sm"
//     isDisabled={!customer}
//     isSearchable
//   />
// </div>


//     </div>

//               <div className="flex flex-col">
//                 <label className="font-semibold mb-1">Costing & Billing</label>
//                 <input
//                   type="text"
//                   placeholder="Costing & Billing"
//                   className="border p-2 rounded"
//                   value={costingBilling}
//                   onChange={(e) => setCostingBilling(e.target.value)}
//                 />
//               </div>
//               <div className="flex flex-col">
//                 <label className="font-semibold mb-1">Estimated Costing</label>
//                 <input
//                   type="text"
//                   placeholder="Estimated Costing"
//                   className="border p-2 rounded"
//                   value={estimatedCosting}
//                   onChange={(e) => setEstimatedCosting(e.target.value)}
//                 />
//               </div>
//               <div className="flex flex-col">
//                 <label className="font-semibold mb-1">
//                   Default Cost Center
//                 </label>
//                 <input
//                   type="text"
//                   placeholder="Default Cost Center"
//                   className="border p-2 rounded"
//                   value={defaultCostCenter}
//                   onChange={(e) => setDefaultCostCenter(e.target.value)}
//                 />{" "}
//               </div>

//               {/* Status */}
//               <div className="flex flex-col">
//                 <label className="font-semibold mb-1">Status</label>
//                 <select
//                   className="border p-2 rounded"
//                   value={status}
//                   onChange={(e) => setStatus(e.target.value)}
//                 >
//                   <option value="active">Active</option>
//                   <option value="archived">Archived</option>
//                 </select>
//               </div>

//               {/* Buttons */}
//               <div className="flex justify-end gap-2 pt-4">
//                 <button
//                   type="button"
//                   onClick={closeModal}
//                   className="px-4 py-2 border rounded hover:bg-gray-100"
//                 >
//                   Cancel
//                 </button>
//                 <button
//                   type="submit"
//                   className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700"
//                 >
//                   {editProject ? "Update" : "Create"}
//                 </button>
//               </div>
//             </form>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }
