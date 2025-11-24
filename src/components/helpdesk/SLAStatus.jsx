export default function SLAStatus({ ticket }) {
  const created = new Date(ticket.createdAt);
  const now = new Date();
  const hours = Math.floor((now - created) / (1000 * 60 * 60));
  const urgent = ticket.status !== "closed" && hours > 24;
  return (
    <div>
      <span className={`px-2 py-1 rounded ${ticket.status === "closed" ? "bg-green-600" : urgent ? "bg-red-600" : "bg-yellow-600"} text-white`}>
        {ticket.status} · {hours}h
      </span>
    </div>
  );
}
