export default function MessageBubble({ msg, meId }) {
  const mine = msg.sender?._id?.toString() === meId || msg.sender === meId;
  const isAI = msg.aiSuggested;
  return (
    <div className={`max-w-xl ${mine ? "ml-auto text-right" : "mr-auto text-left"}`}>
      <div className={`inline-block p-3 rounded-xl ${mine ? "bg-blue-600 text-white" : isAI ? "bg-purple-700 text-white" : "bg-gray-700 text-white"}`}>
        <div>{msg.sender?.name || msg.sender?.email}</div>
        <div>{msg.message}</div>
        <small className="block opacity-60 text-xs mt-2">{new Date(msg.createdAt).toLocaleString()}</small>
      </div>
    </div>
  );
}
