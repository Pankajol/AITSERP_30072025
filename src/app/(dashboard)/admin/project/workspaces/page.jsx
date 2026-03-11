"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import { 
  FaLayerGroup, FaPlus, FaEdit, FaTrash, 
  FaInfoCircle, FaCheck, FaArrowLeft 
} from "react-icons/fa";

export default function WorkspacesPage() {
  const [workspaces, setWorkspaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editWorkspace, setEditWorkspace] = useState(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  // fetch workspaces
  useEffect(() => {
    const fetchWorkspaces = async () => {
      setLoading(true);
      try {
        const res = await api.get("/project/workspaces");
        setWorkspaces(res.data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchWorkspaces();
  }, []);

  // open modal (add/edit)
  const openModal = (workspace = null) => {
    setEditWorkspace(workspace);
    setName(workspace ? workspace.name : "");
    setDescription(workspace ? workspace.description : "");
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditWorkspace(null);
    setName("");
    setDescription("");
  };

  // add / edit workspace
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editWorkspace) {
        const res = await api.put(`/project/workspaces/${editWorkspace._id}`, {
          name,
          description,
        });
        setWorkspaces((prev) =>
          prev.map((w) => (w._id === editWorkspace._id ? res.data : w))
        );
      } else {
        const res = await api.post("/project/workspaces", { name, description });
        setWorkspaces([...workspaces, res.data]);
      }
      closeModal();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this workspace?")) return;
    try {
      await api.delete(`/workspaces/${id}`);
      setWorkspaces(workspaces.filter((w) => w._id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  // --- UI Helpers ---
  const Lbl = ({ text, req }) => (
    <label className="block text-[10.5px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">
      {text}{req && <span className="text-red-500 ml-0.5">*</span>}
    </label>
  );

  const fi = "w-full px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm font-medium focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all outline-none placeholder:text-gray-300";

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-10">
      <div className="max-w-5xl mx-auto">
        
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 flex items-center gap-3">
              <FaLayerGroup className="text-indigo-600" /> Workspaces
            </h1>
            <p className="text-sm text-gray-400 mt-0.5">Organize projects and teams into environments</p>
          </div>
          <button 
            onClick={() => openModal()} 
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all"
          >
            <FaPlus size={12} /> New Workspace
          </button>
        </div>

        {/* Table Container */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-6 py-4 text-left text-[10.5px] font-bold uppercase tracking-wider text-gray-400">Workspace Name</th>
                  <th className="px-6 py-4 text-left text-[10.5px] font-bold uppercase tracking-wider text-gray-400">Description</th>
                  <th className="px-6 py-4 text-right text-[10.5px] font-bold uppercase tracking-wider text-gray-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  <tr>
                    <td colSpan="3" className="px-6 py-10 text-center text-gray-400 italic font-medium">Loading environments...</td>
                  </tr>
                ) : workspaces.length > 0 ? (
                  workspaces.map((w) => (
                    <tr key={w._id} className="hover:bg-indigo-50/20 transition-colors">
                      <td className="px-6 py-4 font-bold text-gray-900 uppercase tracking-tight">{w.name}</td>
                      <td className="px-6 py-4 text-gray-500 font-medium">{w.description || "—"}</td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button onClick={() => openModal(w)} className="p-2 text-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all" title="Edit">
                            <FaEdit size={16} />
                          </button>
                          <button onClick={() => handleDelete(w._id)} className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all" title="Delete">
                            <FaTrash size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="3" className="px-6 py-20 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <FaLayerGroup size={40} className="text-gray-200" />
                        <p className="text-gray-400 font-medium italic">No workspaces found. Create one to get started.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal Overlay */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-8 py-6 border-b border-gray-100 flex items-center gap-3 bg-indigo-50/50">
              <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-indigo-600 shadow-sm">
                <FaInfoCircle size={20} />
              </div>
              <h2 className="text-xl font-black text-gray-900 tracking-tight">
                {editWorkspace ? "Update Workspace" : "New Workspace"}
              </h2>
            </div>
            
            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div>
                <Lbl text="Workspace Name" req />
                <input
                  type="text"
                  placeholder="e.g. Production Floor A"
                  className={fi}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div>
                <Lbl text="Short Description" />
                <textarea
                  placeholder="Briefly describe the scope of this workspace..."
                  className={`${fi} h-24 resize-none`}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
              <div className="flex justify-end items-center gap-4 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="text-sm font-bold text-gray-400 hover:text-gray-600 uppercase tracking-widest"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-2 px-8 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all"
                >
                  <FaCheck size={12} /> {editWorkspace ? "Update" : "Create"}
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

// export default function WorkspacesPage() {
//   const [workspaces, setWorkspaces] = useState([]);
//   const [isModalOpen, setIsModalOpen] = useState(false);
//   const [editWorkspace, setEditWorkspace] = useState(null);

//   const [name, setName] = useState("");
//   const [description, setDescription] = useState("");

//   // fetch workspaces
//   useEffect(() => {
//     const fetchWorkspaces = async () => {
//       try {
//         const res = await api.get("/project/workspaces");
//         setWorkspaces(res.data);
//       } catch (err) {
//         console.error(err);
//       }
//     };
//     fetchWorkspaces();
//   }, []);

//   // open modal (add/edit)
//   const openModal = (workspace = null) => {
//     setEditWorkspace(workspace);
//     setName(workspace ? workspace.name : "");
//     setDescription(workspace ? workspace.description : "");
//     setIsModalOpen(true);
//   };

//   const closeModal = () => {
//     setIsModalOpen(false);
//     setEditWorkspace(null);
//     setName("");
//     setDescription("");
//   };

//   // add / edit workspace
//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     try {
//       if (editWorkspace) {
//         // update
//         const res = await api.put(`/project/workspaces/${editWorkspace._id}`, {
//           name,
//           description,
//         });
//         setWorkspaces((prev) =>
//           prev.map((w) => (w._id === editWorkspace._id ? res.data : w))
//         );
//       } else {
//         // create
//         const res = await api.post("/project/workspaces", { name, description });
//         setWorkspaces([...workspaces, res.data]);
//       }
//       closeModal();
//     } catch (err) {
//       console.error(err);
//     }
//   };

//   // delete workspace
//   const handleDelete = async (id) => {
//     if (!confirm("Are you sure you want to delete this workspace?")) return;
//     try {
//       await api.delete(`/workspaces/${id}`);
//       setWorkspaces(workspaces.filter((w) => w._id !== id));
//     } catch (err) {
//       console.error(err);
//     }
//   };

//   return (
//     <div className="p-6">
//       <div className="flex justify-between items-center mb-6">
//         <h1 className="text-2xl font-bold">Workspaces</h1>
//         <button
//           onClick={() => openModal()}
//           className="bg-green-600 text-white px-4 py-2 rounded"
//         >
//           + Add Workspace
//         </button>
//       </div>

//       {/* Workspaces Table */}
//       <table className="w-full border">
//         <thead>
//           <tr className="bg-gray-100">
//             <th className="p-2 border">Name</th>
//             <th className="p-2 border">Description</th>
//             <th className="p-2 border">Actions</th>
//           </tr>
//         </thead>
//         <tbody>
//           {workspaces.map((w) => (
//             <tr key={w._id}>
//               <td className="p-2 border">{w.name}</td>
//               <td className="p-2 border">{w.description || "-"}</td>
//               <td className="p-2 border space-x-2">
//                 <button
//                   onClick={() => openModal(w)}
//                   className="bg-blue-500 text-white px-3 py-1 rounded"
//                 >
//                   Edit
//                 </button>
//                 <button
//                   onClick={() => handleDelete(w._id)}
//                   className="bg-red-500 text-white px-3 py-1 rounded"
//                 >
//                   Delete
//                 </button>
//               </td>
//             </tr>
//           ))}
//         </tbody>
//       </table>

//       {/* Modal */}
//       {isModalOpen && (
//         <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
//           <div className="bg-white rounded-lg shadow-lg p-6 w-96">
//             <h2 className="text-lg font-bold mb-4">
//               {editWorkspace ? "Edit Workspace" : "Add Workspace"}
//             </h2>
//             <form onSubmit={handleSubmit} className="grid gap-4">
//               <input
//                 type="text"
//                 placeholder="Workspace Name"
//                 className="border p-2 rounded"
//                 value={name}
//                 onChange={(e) => setName(e.target.value)}
//                 required
//               />
//               <textarea
//                 placeholder="Description"
//                 className="border p-2 rounded"
//                 value={description}
//                 onChange={(e) => setDescription(e.target.value)}
//               />
//               <div className="flex justify-end gap-2">
//                 <button
//                   type="button"
//                   onClick={closeModal}
//                   className="px-4 py-2 border rounded"
//                 >
//                   Cancel
//                 </button>
//                 <button
//                   type="submit"
//                   className="bg-green-600 text-white px-4 py-2 rounded"
//                 >
//                   {editWorkspace ? "Update" : "Create"}
//                 </button>
//               </div>
//             </form>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }
