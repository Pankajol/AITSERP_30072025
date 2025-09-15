"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import api from "@/lib/api";

export default function TaskDetailsPage() {
  const { id } = useParams();
  const [task, setTask] = useState(null);
  const [comment, setComment] = useState("");

  useEffect(() => {
    api.get(`/project/tasks/${id}`).then((res) => {
      // Ensure comments is always an array
      setTask({ ...res.data, comments: res.data.comments || [] });
    });
  }, [id]);

  const addComment = async () => {
    const res = await api.post(`/project/tasks/${id}/comments`, { text: comment });

    setTask((prevTask) => ({
      ...prevTask,
      comments: [...(prevTask.comments || []), res.data],
    }));

    setComment("");
  };

  if (!task) return <p>Loading...</p>;

  return (
    <>
      <h1 className="text-xl font-bold mb-4">{task.title}</h1>
      <p>{task.description}</p>

      <h2 className="mt-6 font-semibold">Comments</h2>
      <ul className="mb-4">
        {(task.comments || []).map((c, i) => (
          <li key={i} className="border-b py-1">
            {c.text}
          </li>
        ))}
      </ul>

      <div className="flex gap-2">
        <input
          type="text"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Add a comment"
          className="flex-1 border rounded px-2 py-1"
        />
        <button
          onClick={addComment}
          className="bg-blue-500 text-white px-3 py-1 rounded"
        >
          Send
        </button>
      </div>
    </>
  );
}
