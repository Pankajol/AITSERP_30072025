"use client";
import { useEffect, useState } from "react";
import api from "@/lib/api";
import Select from "react-select";
import { useRouter } from "next/navigation";


export default function ProjectsPage() {
  const [projects, setProjects] = useState([]);
  const [workspaces, setWorkspaces] = useState([]);
  const [description, setDescription] = useState("");
  const [users, setUsers] = useState([]);
  const [assignees, setAssignees] = useState([]);
  const [assignedTo, setAssignedTo] = useState("");
  const [dueDate, setDueDate] = useState("");
  // projeced date
  const [projectedStartDate, setProjectedStartDate] = useState("");
  const [projectedEndDate, setProjectedEndDate] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [priority, setPriority] = useState("low");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editProject, setEditProject] = useState(null);

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






  // fetch projects + workspaces
  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("token");
        if (!token) return;
        const headers = { headers: { Authorization: `Bearer ${token}` } };

        const [uRes, pRes, wRes, cRes, soRes] = await Promise.all([
          api.get("/company/users", headers),
          api.get("/project/projects", headers),
          api.get("/project/workspaces", headers),
          api.get("/customers", headers), // fetch customers
          api.get("/sales-order", headers), // fetch sales orders
        ]);

        // console.log("all project data", pRes.data);
        // console.log(wRes.data);

        // filter users to only include those with "Employee" role
        const employees = uRes.data.filter((user) =>
          user.roles?.includes("Employee")
        );
        setUsers(employees);
        //
        // setUsers(uRes.data);
        setProjects(pRes.data);
        setWorkspaces(wRes.data);
        setCustomers(cRes.data.data || []);
        setSalesOrders(soRes.data.data || []);
      } catch (err) {
        console.error(err);
      }
    };
    fetchData();
  }, [customer]);
  const filteredSalesOrders = customer
    ? salesOrders.filter((so) => so.customer === customer.value)
    : [];
  // open modal
  const openModal = (project = null) => {
    setEditProject(project);
    setName(project ? project.name : "");
    setWorkspaceId(project ? project.workspace?._id : "");
    setStatus(project ? project.status : "active");
    setIsModalOpen(true);
    setDescription(project ? project.description : "");
    setDueDate(project ? (project.dueDate ? project.dueDate.split("T")[0] : "") : "");
    setProjectedStartDate(project ? (project.projectedStartDate ? project.projectedStartDate.split("T")[0] : "") : "");
    setProjectedEndDate(project ? (project.projectedEndDate ? project.projectedEndDate.split("T")[0] : "") : "");
    setStartDate(project ? (project.startDate ? project.startDate.split("T")[0] : "") : "");
    setEndDate(project ? (project.endDate ? project.endDate.split("T")[0] : "") : "");
    setPriority(project ? project.priority : "low");
    setAssignees(project ? (Array.isArray(project.members) ? project.members.map((m) => (typeof m === "object" ? m._id : m)) : []) : []);
    setAssignedTo(project && project.assignedTo ? (typeof project.assignedTo === "object" ? project.assignedTo._id : project.assignedTo) : "");
    setCustomer(project && project.customer ? { value: project.customer._id, label: project.customer.customerName || `C-${project.customer._id}` } : "");
    setSalesOrder(project && project.salesOrder ? { value: project.salesOrder._id, label: project.salesOrder.documentNumberOrder || `SO-${project.salesOrder._id}` } : "");
    setCostingBilling(project ? project.costingBilling : "");
    setEstimatedCosting(project ? project.estimatedCosting : "");
    setDefaultCostCenter(project ? project.defaultCostCenter : "");

  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditProject(null);
    setName("");
    setWorkspaceId("");
    setStatus("active");
    setDescription("");
    setDueDate("");
    setProjectedStartDate("");
    setProjectedEndDate("");
    setStartDate("");
    setEndDate("");
    setPriority("low");
    setAssignees([]);
    setAssignedTo("");
    setCustomer("");
    setSalesOrder("");
    setCostingBilling("");
    setEstimatedCosting("");
    setDefaultCostCenter("");
  };

  // add / edit project
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editProject) {
        // update
        const res = await api.put(`/project/projects/${editProject._id}`, {
          name,
          workspace: workspaceId,
          status,
          description,
          dueDate,
          projectedStartDate,
          projectedEndDate,
          startDate,
          endDate,
          priority,
          members: assignees,
          assignedTo,
          customer : customer,
          salesOrder: salesOrder,
          costingBilling,
          estimatedCosting,
          defaultCostCenter,
        });
        setProjects((prev) =>
          prev.map((p) => (p._id === editProject._id ? res.data : p))
        );
      } else {
        // create
        const res = await api.post("/project/projects", {
          name,
          workspace: workspaceId,
          status,
          description,
          dueDate,
          projectedStartDate,
          projectedEndDate,
          startDate,
          endDate,
          priority,
          members: assignees,
          assignedTo,
          customer: customer ? customer.value : null,
          salesOrder: salesOrder ? salesOrder.value : null,
          costingBilling,
          estimatedCosting,
          defaultCostCenter,
        });
        setProjects([...projects, res.data]);
      }
      closeModal();
    } catch (err) {
      console.error(err);
    }
  };

  // delete
  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this project?")) return;
    try {
      await api.delete(`/project/projects/${id}`);
      setProjects(projects.filter((p) => p._id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  // fetch users for assignee dropdown

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Projects</h1>
        <button
          onClick={() => openModal()}
          className="bg-purple-600 text-white px-4 py-2 rounded"
        >
          + Add Project
        </button>
      </div>

      {/* Projects Table */}
      <table className="w-full border">
        <thead>
          <tr className="bg-gray-100">
            <th className="p-2 border">Name</th>
            <th className="p-2 border">Workspace</th>
            <th className="p-2 border">Description</th>
            {/* <th className="p-2 border">Assigned To</th> */}
            <th className="p-2 border">Assignees</th>
            <th className="p-2 border">Due Date</th>
            <th className="p-2 border">Projected Start Date</th>
            <th className="p-2 border">Projected End Date</th>

            <th className="p-2 border">Start Date</th>
            <th className="p-2 border">End Date</th>
            <th className="p-2 border">Priority</th>

            <th className="p-2 border">Status</th>
            <th className="p-2 border">Actions</th>
          </tr>
        </thead>
        <tbody>
          {projects.map((p) => (
            <tr key={p._id}>
              <td className="p-2 border cursor-pointer hover:bg-gray-100 flex items-center gap-2 text-purple-600"
              onClick={() => router.push(`/admin/project/projects/${p._id}`)}>
                {p.name}</td>
              <td className="p-2 border">{p.workspace?.name}</td>
              <td className="p-2 border">{p.description}</td>
              {/* <td className="p-2 border">{p.assignedTo?.name || "-"}</td> */}
              <td className="p-2 border">
                {Array.isArray(p.members) && p.members.length
                  ? p.members.map((u) => (u.name ? u.name : u)).join(", ")
                  : "-"}
              </td>
              <td className="p-2 border">
                {" "}
                {p.dueDate ? new Date(p.dueDate).toLocaleDateString() : "-"}
              </td>
              <td className="p-2 border">
                {p.projectedStartDate ? new Date(p.projectedStartDate).toLocaleDateString() : "-"}
              </td>
              <td className="p-2 border">
                {p.projectedEndDate ? new Date(p.projectedEndDate).toLocaleDateString() : "-"}
              </td>

              <td className="p-2 border">
                {p.startDate ? new Date(p.startDate).toLocaleDateString() : "-"}
              </td>
              <td className="p-2 border">
                {p.endDate ? new Date(p.endDate).toLocaleDateString() : "-"}
              </td>
              <td className="p-2 border">{p.priority}</td>

              <td className="p-2 border">{p.status}</td>
              <td className="p-2 border space-x-2">
                <button
                  onClick={() => openModal(p)}
                  className="bg-blue-500 text-white px-3 py-1 rounded"
                >
                  Edit
                </button>
                {/* view */}
                <button 
                  onClick={() => alert(JSON.stringify(p, null, 2))}
                className="bg-green-500 text-white px-3 py-1 rounded">
                  View
                </button>
                <button
                  onClick={() => handleDelete(p._id)}
                  className="bg-red-500 text-white px-3 py-1 rounded"
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold mb-4">
              {editProject ? "Edit Project" : "Add Project"}
            </h2>

            <form onSubmit={handleSubmit} className="grid gap-4">
              {/* Name */}
              <div className="flex flex-col">
                <label className="font-semibold mb-1">Name</label>
                <input
                  type="text"
                  placeholder="Project Name"
                  className="border p-2 rounded"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              {/* Description */}
              <div className="flex flex-col">
                <label className="font-semibold mb-1">Description</label>
                <textarea
                  placeholder="Description"
                  className="border p-2 rounded"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col">
                  <label className="font-semibold mb-1">Due Date</label>
                  <input
                    type="date"
                    className="border p-2 rounded"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                  />
                </div>
                {/* projected start date */} 
                <div className="flex flex-col">
                  <label className="font-semibold mb-1">Projected Start Date</label>
                  <input
                    type="date"
                    className="border p-2 rounded"
                    value={projectedStartDate}
                    onChange={(e) => setProjectedStartDate(e.target.value)}
                  />
                </div>
                {/* projected end date */}
                <div className="flex flex-col">
                  <label className="font-semibold mb-1">Projected End Date</label>
                  <input
                    type="date"
                    className="border p-2 rounded"
                    value={projectedEndDate}
                    onChange={(e) => setProjectedEndDate(e.target.value)}
                  />
                </div>
                {/* start date */}
                <div className="flex flex-col">
                  <label className="font-semibold mb-1">Start Date</label>
                  <input
                    type="date"
                    className="border p-2 rounded"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div className="flex flex-col col-span-2">
                  <label className="font-semibold mb-1">End Date</label>
                  <input
                    type="date"
                    className="border p-2 rounded"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>

              {/* Priority */}
              <div className="flex flex-col">
                <label className="font-semibold mb-1">Priority</label>
                <select
                  className="border p-2 rounded"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>

              {/* Assignees */}
              <div className="flex flex-col">
                <label className="font-semibold mb-1">Assignees</label>
                <Select
                  isMulti
                  options={users.map((u) => ({ value: u._id, label: u.name }))}
                  value={assignees.map((id) => {
                    const user = users.find((u) => u._id === id);
                    return { value: id, label: user?.name || id };
                  })}
                  onChange={(selected) =>
                    setAssignees(selected.map((s) => s.value))
                  }
                  placeholder="Search & select users"
                  className="text-sm"
                />
              </div>

              {/* Workspace */}
              <div className="flex flex-col">
                <label className="font-semibold mb-1">Workspace</label>
                <select
                  className="border p-2 rounded"
                  value={workspaceId}
                  onChange={(e) => setWorkspaceId(e.target.value)}
                  required
                >
                  <option value="">Select Workspace</option>
                  {workspaces.map((w) => (
                    <option key={w._id} value={w._id}>
                      {w.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-4">

<div className="flex flex-col">
  <label className="font-semibold mb-1">Customer</label>
  <Select
    options={customers.map((c) => ({
      value: c._id,
      label: c.customerName || `C-${c._id}`,
    }))}
    value={customer}
    onChange={(selected) => setCustomer(selected)}
    placeholder="Search & select customer"
    className="text-sm"
    isSearchable
  />
</div>


<div className="flex flex-col">
  <label className="font-semibold mb-1">Sales Order</label>
  <Select
    options={filteredSalesOrders.map((so) => ({
      value: so._id,
      label: so.documentNumberOrder || `SO-${so._id}`,
    }))}
    value={salesOrder}
    onChange={(selected) => setSalesOrder(selected)}
    placeholder={
      customer ? "Search & select sales order" : "Select a customer first"
    }
    className="text-sm"
    isDisabled={!customer}
    isSearchable
  />
</div>


    </div>

              <div className="flex flex-col">
                <label className="font-semibold mb-1">Costing & Billing</label>
                <input
                  type="text"
                  placeholder="Costing & Billing"
                  className="border p-2 rounded"
                  value={costingBilling}
                  onChange={(e) => setCostingBilling(e.target.value)}
                />
              </div>
              <div className="flex flex-col">
                <label className="font-semibold mb-1">Estimated Costing</label>
                <input
                  type="text"
                  placeholder="Estimated Costing"
                  className="border p-2 rounded"
                  value={estimatedCosting}
                  onChange={(e) => setEstimatedCosting(e.target.value)}
                />
              </div>
              <div className="flex flex-col">
                <label className="font-semibold mb-1">
                  Default Cost Center
                </label>
                <input
                  type="text"
                  placeholder="Default Cost Center"
                  className="border p-2 rounded"
                  value={defaultCostCenter}
                  onChange={(e) => setDefaultCostCenter(e.target.value)}
                />{" "}
              </div>

              {/* Status */}
              <div className="flex flex-col">
                <label className="font-semibold mb-1">Status</label>
                <select
                  className="border p-2 rounded"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  <option value="active">Active</option>
                  <option value="archived">Archived</option>
                </select>
              </div>

              {/* Buttons */}
              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 border rounded hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700"
                >
                  {editProject ? "Update" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
