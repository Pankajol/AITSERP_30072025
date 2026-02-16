"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import TicketCard from "@/components/helpdesk/TicketCard";
import { Loader2, Ticket as TicketIcon } from "lucide-react";

export default function CustomerTickets() {
  const router = useRouter();

  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let ignore = false; // 👈 prevent state update after unmount

    const fetchTickets = async () => {
      try {
        const token = localStorage.getItem("token");

        if (!token) {
          setLoading(false);
          return;
        }

        const res = await fetch("/api/helpdesk/list", {
          headers: {
            Authorization: "Bearer " + token,
          },
        });

        const data = await res.json();

        if (!ignore) {
          if (data.success === false) {
            setError(data.msg || "Failed to load tickets");
            setTickets([]);
          } else {
            setTickets(data.tickets || []);
          }
          setLoading(false);
        }
      } catch (err) {
        if (!ignore) {
          setError("Something went wrong");
          setLoading(false);
        }
      }
    };

    fetchTickets();

    return () => {
      ignore = true;
    };
  }, []);

  return (
    <div className="max-w-5xl mx-auto">
      {/* HEADER */}
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <TicketIcon size={22} />
          My Tickets
        </h1>

        <button
          onClick={() => router.push("/customer-dashboard/helpdesk/new")}
          className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg shadow"
        >
          + New Ticket
        </button>
      </div>

      {/* LOADING */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={28} className="animate-spin text-blue-600" />
        </div>
      )}

      {/* ERROR */}
      {!loading && error && (
        <div className="text-center py-16 bg-red-50 rounded-xl shadow">
          <p className="font-medium text-red-600">{error}</p>
        </div>
      )}

      {/* EMPTY STATE */}
      {!loading && !error && tickets.length === 0 && (
        <div className="text-center py-16 bg-white rounded-xl shadow">
          <p className="font-medium text-gray-600">
            No tickets found.
          </p>
        </div>
      )}

      {/* TICKETS LIST */}
      <div className="space-y-4">
        {!loading &&
          !error &&
          tickets.map((ticket) => (
            <div
              key={ticket._id}
              onClick={() =>
                router.push(
                  `/customer-dashboard/helpdesk/tickets/${ticket._id}`
                )
              }
              className="cursor-pointer"
            >
              <TicketCard ticket={ticket} />
            </div>
          ))}
      </div>
    </div>
  );
}




// "use client";

// import { useEffect, useState } from "react";
// import { useRouter } from "next/navigation";
// import TicketCard from "@/components/helpdesk/TicketCard";
// import { Loader2, Ticket } from "lucide-react";

// export default function CustomerTickets() {
//   const router = useRouter();

//   const [tickets, setTickets] = useState([]);
//   const [loading, setLoading] = useState(true);

//   useEffect(() => {
//     const token = localStorage.getItem("token");
//     if (!token) {
//       setLoading(false);
//       return;
//     }

//     fetch("/api/helpdesk/list", {
//       headers: { Authorization: "Bearer " + token },
//     })
//       .then((r) => r.json())
//       .then((res) => {
//         setTickets(res.tickets || []);
//         setLoading(false);
//       })
//       .catch(() => setLoading(false));
//   }, []);

//   return (
//     <div className="max-w-5xl mx-auto">

//       {/* HEADER */}
//       <div className="flex justify-between items-center mb-8">
//         <h1 className="text-2xl font-bold flex items-center gap-2">
//           <Ticket size={22} />
//           My Tickets
//         </h1>

//         <button
//           onClick={() => router.push("/customer-dashboard/helpdesk/new")}
//           className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg shadow"
//         >
//           + New Ticket
//         </button>
//       </div>

//       {/* LOADING */}
//       {loading && (
//         <div className="flex items-center justify-center py-20">
//           <Loader2 size={28} className="animate-spin text-blue-600" />
//         </div>
//       )}

//       {/* EMPTY STATE */}
//       {!loading && tickets.length === 0 && (
//         <div className="text-center py-16 bg-white rounded-xl shadow">
//           <p className="font-medium text-gray-600">
//             No tickets found.
//           </p>
//         </div>
//       )}

//       {/* TICKETS LIST */}
//       <div className="space-y-4">
//         {tickets.map((ticket) => (
//           <div
//             key={ticket._id}
//             onClick={() => router.push(`/customer-dashboard/helpdesk/tickets/${ticket._id}`)}
//             className="cursor-pointer"
//           >
//             <TicketCard ticket={ticket} />
//           </div>
//         ))}
//       </div>

//     </div>
//   );
// }
