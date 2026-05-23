"use client";
import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import axios from "axios";
import { FiArrowLeft, FiEdit2, FiTrash2, FiPhone, FiMapPin, FiCalendar, FiUser } from "react-icons/fi";

export default function VoterDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [voter, setVoter] = useState(null);
  const [loading, setLoading] = useState(true);
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  useEffect(() => {
    if (!token) return;
    const fetchVoter = async () => {
      try {
        const { data } = await axios.get(`/api/election/voter?id=${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (data.success) setVoter(data.data);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    fetchVoter();
  }, [id, token]);

  const handleDelete = async () => {
    if (!confirm("Delete this voter?")) return;
    await axios.delete(`/api/election/voter?id=${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    router.push("/election/voters");
  };

  if (loading) return <div className="text-center py-20">Loading...</div>;
  if (!voter) return <div className="text-center py-20 text-gray-400">Voter not found</div>;

  return (
    <div className="max-w-4xl mx-auto">
      <button onClick={() => router.back()} className="flex items-center gap-1 text-sm text-gray-500 hover:text-indigo-600 mb-6">
        <FiArrowLeft /> Back to Voters
      </button>

      <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 px-6 py-6 text-white">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center text-2xl font-bold">
              {voter.firstName?.[0]}{voter.lastName?.[0]}
            </div>
            <div>
              <h1 className="text-2xl font-bold">{voter.firstName} {voter.middleName} {voter.lastName}</h1>
              <p className="text-indigo-100 text-sm">EPIC: {voter.voterId || "N/A"} | Phone: {voter.phone || "N/A"}</p>
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="flex items-center justify-end gap-2 mb-6">
            <button onClick={() => router.push(`/election/voters?edit=${id}`)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-600 text-xs font-bold hover:bg-indigo-100">
              <FiEdit2 size={14} /> Edit
            </button>
            <button onClick={handleDelete} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-50 text-red-500 text-xs font-bold hover:bg-red-100">
              <FiTrash2 size={14} /> Delete
            </button>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            <DetailItem icon={FiUser} label="Full Name" value={`${voter.firstName} ${voter.middleName||""} ${voter.lastName||""}`} />
            <DetailItem icon={FiPhone} label="Phone" value={voter.phone} />
            <DetailItem icon={FiPhone} label="Alt Phone" value={voter.altPhone} />
            <DetailItem label="Age" value={voter.age} />
            <DetailItem label="Gender" value={voter.gender} />
            <DetailItem label="Date of Birth" value={voter.dob ? new Date(voter.dob).toLocaleDateString() : ""} />
            <DetailItem label="Caste" value={voter.caste} />
            <DetailItem label="Religion" value={voter.religion} />
            <DetailItem label="Occupation" value={voter.occupation} />
            <DetailItem label="Education" value={voter.education} />
            <DetailItem label="Support Level" value={<span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${
              voter.supportLevel === "StrongSupporter" ? "bg-green-100 text-green-700" :
              voter.supportLevel === "Opposition" ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-600"
            }`}>{voter.supportLevel}</span>} />
            <DetailItem label="Influence Rating" value={voter.influenceRating} />
            <DetailItem label="Membership No." value={voter.membershipNumber} />
            <DetailItem label="Address" value={`${voter.address?.line1 || ""}, ${voter.address?.village||""}, ${voter.address?.postOffice||""} - ${voter.address?.pincode||""}`} />
          </div>

          {/* Booth & Constituency */}
          <div className="mb-8 p-4 bg-gray-50 rounded-xl border">
            <h3 className="text-sm font-bold text-gray-700 mb-2">Assigned Booth</h3>
            <p className="text-sm text-gray-600">{voter.booth?.name ? `${voter.booth.boothNumber} - ${voter.booth.name}` : "N/A"}</p>
            {voter.booth?.constituency && (
              <p className="text-xs text-gray-500 mt-1">Constituency: {voter.booth.constituency.name}</p>
            )}
          </div>

          {/* Contact History */}
          <div className="mb-8">
            <h3 className="text-lg font-bold text-gray-800 mb-3">Contact History</h3>
            {voter.contactHistory?.length > 0 ? (
              <div className="space-y-2">
                {voter.contactHistory.map((contact, idx) => (
                  <div key={idx} className="flex justify-between items-start p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="text-sm font-semibold text-gray-700">{contact.type} – {contact.outcome || "N/A"}</p>
                      <p className="text-xs text-gray-500">{contact.summary}</p>
                      <p className="text-xs text-gray-400 mt-1">{new Date(contact.date).toLocaleString()}</p>
                    </div>
                    <span className="text-xs text-gray-400">{contact.createdBy?.name}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400 italic">No contact history yet.</p>
            )}
          </div>

          {/* Surveys */}
          <div>
            <h3 className="text-lg font-bold text-gray-800 mb-3">Survey Responses</h3>
            {voter.surveys?.length > 0 ? (
              <div className="space-y-2">
                {voter.surveys.map((sur, idx) => (
                  <div key={idx} className="p-3 bg-gray-50 rounded-lg flex justify-between items-start">
                    <div>
                      <p className="text-sm font-semibold text-gray-700">{sur.survey?.title || "Unknown Survey"}</p>
                      <p className="text-xs text-gray-500">Taken on {new Date(sur.date).toLocaleDateString()}</p>
                      <pre className="text-xs text-gray-600 mt-1">{JSON.stringify(sur.answers, null, 2)}</pre>
                    </div>
                    <span className="text-xs text-gray-400">{sur.surveyedBy?.name}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400 italic">No surveys taken yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailItem({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-2">
      {Icon && <Icon size={16} className="text-gray-400 mt-0.5" />}
      <div>
        <p className="text-[10px] font-bold uppercase text-gray-400">{label}</p>
        <p className="text-sm font-medium text-gray-800">{value || "—"}</p>
      </div>
    </div>
  );
}