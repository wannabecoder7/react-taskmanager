// client/src/pages/Dashboard.js
import { useEffect, useState } from "react";
import API from "../api/axios";
import { useNavigate } from "react-router-dom";

export default function Dashboard() {
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState("");
  const [assignUser, setAssignUser] = useState("");
  const [users, setUsers] = useState([]);
  const [user, setUser] = useState(null);

  // Notes modal state
  const [activeTask, setActiveTask] = useState(null);
  const [noteContent, setNoteContent] = useState("");
  const [isEditingNote, setIsEditingNote] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("access");
    if (!token) {
      navigate("/login");
      return;
    }

    // 1) get current user
    API.get("auth/me/")
      .then((res) => {
        setUser(res.data);

        // 2) if admin, fetch users list for dropdown
        if (res.data.is_staff || res.data.is_superuser) {
          API.get("auth/all/")
            .then((res2) => {
              setUsers(res2.data.results || res2.data || []);
            })
            .catch((err) =>
              console.error("❌ Failed to fetch users:", err.response?.data || err.message)
            );
        }
      })
      .catch((err) => console.error("❌ Failed to fetch current user:", err));

    // fetch tasks (backend returns tasks filtered by user or all tasks if admin)
    API.get("tasks/")
      .then((res) => {
        setTasks(res.data.results || res.data || []);
      })
      .catch((err) => console.error("❌ Failed to fetch tasks:", err));
  }, [navigate]);

  // Add new task
  const handleAddTask = async (e) => {
    e.preventDefault();
    if (!newTask.trim()) return; // no||empty input

    try {
      const payload = { title: newTask, status: "TODO" };

      // If admin and an assigned user selected, include it (id expected)
      if ((user?.is_staff || user?.is_superuser) && assignUser) {
        payload.user = assignUser;
      }

      const res = await API.post("tasks/", payload);
      setTasks((prev) => [...prev, res.data]);
      setNewTask("");
      setAssignUser("");
    } catch (err) {
      console.error("❌ Failed to add task:", err.response?.data || err.message);
      alert("Could not add task: " + JSON.stringify(err.response?.data || err.message));
    }
  };

  // Update task status (merge notes & user so they don't vanish)
  const handleUpdateTask = async (id, currentStatus) => {
    const nextStatus =
      currentStatus === "TODO"
        ? "IN_PROGRESS"
        : currentStatus === "IN_PROGRESS"
        ? "DONE"
        : "TODO";

    try {
      const res = await API.patch(`tasks/${id}/`, { status: nextStatus });
      const serverData = res.data || {};

      setTasks((prev) =>
        prev.map((t) => {
          if (t.id !== id) return t;

          // preserve existing notes (if any), otherwise fall back to server notes
          const preservedNotes = t.notes && t.notes.length ? t.notes : serverData.notes || [];

          // preserve existing user (if client has it), otherwise use server user
          const preservedUser = t.user || serverData.user || null;

          return {
            ...t, // keep any client-only fields
            ...serverData, // apply fields returned by server (status, timestamps, etc.)
            notes: preservedNotes,
            user: preservedUser,
          };
        })
      );

      // If modal is open for this task, update activeTask too but keep its notes
      if (activeTask?.id === id) {
        setActiveTask((at) => {
          const preservedNotes = at.notes && at.notes.length ? at.notes : serverData.notes || [];
          const preservedUser = at.user || serverData.user || null;
          return {
            ...at,
            ...serverData,
            notes: preservedNotes,
            user: preservedUser,
          };
        });
      }
    } catch (err) {
      console.error("❌ Failed to update task:", err.response?.data || err.message);
      alert("Could not update task: " + JSON.stringify(err.response?.data || err.message));
    }
  };

  // Delete task
  const handleDeleteTask = async (id) => {
    try {
      await API.delete(`tasks/${id}/`);
      setTasks((prev) => prev.filter((t) => t.id !== id));
      if (activeTask?.id === id) setActiveTask(null);
    } catch (err) {
      console.error("❌ Failed to delete task:", err.response?.data || err.message);
      alert("Could not delete task");
    }
  };

  // Open note modal (view or edit depending on whether a note exists)
  const handleViewNote = (task) => {
    setActiveTask(task);
    setNoteContent(task.notes?.length ? task.notes[0].content : "");
    setIsEditingNote(!task.notes?.length); // if no note, open in edit mode
  };

  // Save note (create or update)
  const handleSaveNote = async () => {
    if (!noteContent.trim()) return;

    try {
      let res;
      if (activeTask.notes?.length) {
        // Update existing note (assume first note)
        const noteId = activeTask.notes[0].id;
        res = await API.patch(`notes/${noteId}/`, { content: noteContent });
      } else {
        // Create new note; assume notes serializer expects task (id), title, content
        res = await API.post("notes/", {
          task: activeTask.id,
          title: `Note for ${activeTask.title}`,
          content: noteContent,
        });
      }

      const updatedTask = { ...activeTask, notes: [res.data] };

      setActiveTask(updatedTask);
      setTasks((prev) => prev.map((t) => (t.id === updatedTask.id ? updatedTask : t)));
      setIsEditingNote(false);
    } catch (err) {
      console.error("❌ Failed to save note:", err.response?.data || err.message);
      alert("Could not save note");
    }
  };

  // Delete note
  const handleDeleteNote = async () => {
    if (!activeTask?.notes?.length) return;

    try {
      const noteId = activeTask.notes[0].id;
      await API.delete(`notes/${noteId}/`);

      const updatedTask = { ...activeTask, notes: [] };
      setActiveTask(updatedTask);
      setTasks((prev) => prev.map((t) => (t.id === updatedTask.id ? updatedTask : t)));
      setIsEditingNote(false);
    } catch (err) {
      console.error("❌ Failed to delete note:", err.response?.data || err.message);
      alert("Could not delete note");
    }
  };

  // Render a single column (To Do / In Progress / Done)
  const renderColumn = (status, title) => (
    <div className="w-1/3 bg-gray-100 p-4 rounded-lg shadow-inner">
      <h2 className="text-lg font-semibold text-gray-700 border-b pb-2 mb-4 text-center">
        {title}
      </h2>

      {tasks.filter((task) => task.status === status).length === 0 && (
        <div className="text-sm text-gray-500 text-center italic">No tasks</div>
      )}

      {tasks
        .filter((task) => task.status === status)
        .map((task) => (
          <div
            className={`p-4 mb-3 bg-white shadow rounded-lg border-l-4 ${
              status === "TODO"
                ? "border-red-400"
                : status === "IN_PROGRESS"
                ? "border-yellow-400"
                : "border-green-400"
            }`}
          >
            {/* Task title + status tag */}
            <div className="flex justify-between items-center mb-2">
              <span className="font-semibold text-gray-800">{task.title}</span>
              <span
                className={`text-xs px-2 py-1 rounded ${
                  status === "TODO"
                    ? "bg-red-50 text-red-600"
                    : status === "IN_PROGRESS"
                    ? "bg-yellow-50 text-yellow-600"
                    : "bg-green-50 text-green-600"
                }`}
              >
                {status.replace("_", " ")}
              </span>
            </div>

            {/* Meta info */}
            <div className="text-xs text-gray-500 mb-1">
              Created: {task.created_at ? new Date(task.created_at).toLocaleString() : "—"}
            </div>
            {task.updated_at && (
              <div className="text-xs text-gray-400 mb-1">
                Updated: {new Date(task.updated_at).toLocaleString()}
              </div>
            )}
            <div className="text-xs text-blue-600 mb-3">
              Assigned to: {task.user?.username ?? (typeof task.user === "string" ? task.user : "Unassigned")}
            </div>

            {/* Action buttons */}
            <div className="flex justify-end gap-2">
              <button
                onClick={() => handleViewNote(task)}
                className="bg-blue-500 hover:bg-blue-600 text-white text-xs px-2 py-1 rounded"
              >
                {task.notes?.length ? "View Note" : "Add Note"}
              </button>
              <button
                onClick={() => handleUpdateTask(task.id, task.status)}
                className="bg-yellow-500 hover:bg-yellow-600 text-white text-xs px-2 py-1 rounded"
              >
                ➡
              </button>
              <button
                onClick={() => handleDeleteTask(task.id)}
                className="bg-red-500 hover:bg-red-600 text-white text-xs px-2 py-1 rounded"
              >
                ✕
              </button>
            </div>
          </div>
        ))}
    </div>
  );

  // Logout helper
  const handleLogout = () => {
    localStorage.removeItem("access");
    localStorage.removeItem("refresh");
    navigate("/login");
  };

  return (
    <div className="h-screen bg-gray-50 p-6 overflow-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-4xl font-extrabold 
        bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 text-transparent 
        bg-clip-text">Welcome {user ? user.username : ""}</h1>
        <div className="space-x-2">
          <button onClick={handleLogout} className="bg-red-500 text-white px-4 py-2 rounded">
            Logout
          </button>
        </div>
      </div>

      {/* Add Task Form */}
      <form onSubmit={handleAddTask} className="mb-6 flex items-center gap-2">
        <input
          type="text"
          placeholder="New Task"
          value={newTask}
          onChange={(e) => setNewTask(e.target.value)}
          className="flex-1 p-2 rounded border"
        />

        {/* show dropdown only for admins */}
        {(user?.is_staff || user?.is_superuser) && (
          <select value={assignUser} onChange={(e) => setAssignUser(e.target.value)} className="p-2 border rounded">
            <option value="">Assign to...</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.username}
              </option>
            ))}
          </select>
        )}

        <button className="bg-blue-500 text-white px-4 py-2 rounded">Add</button>
      </form>

      {/* Kanban Columns */}
      <div className="flex space-x-4">
        {renderColumn("TODO", "To Do")}
        {renderColumn("IN_PROGRESS", "In Progress")}
        {renderColumn("DONE", "Done")}
      </div>

      {/* Note Modal */}
      {activeTask && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white p-6 rounded shadow w-96">
            <h2 className="text-xl font-bold mb-4">Note for {activeTask.title}</h2>

            {isEditingNote ? (
              <textarea
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                className="w-full p-2 border rounded mb-4"
                rows={6}
              />
            ) : (
              <div className="mb-4 whitespace-pre-wrap">{noteContent || "No note yet."}</div>
            )}

            <div className="flex justify-end space-x-2">
              {isEditingNote ? (
                <button onClick={handleSaveNote} className="bg-blue-500 text-white px-4 py-2 rounded">
                  Save
                </button>
              ) : (
                <button onClick={() => setIsEditingNote(true)} className="bg-yellow-500 text-white px-4 py-2 rounded">
                  Edit
                </button>
              )}

              {activeTask.notes?.length > 0 && !isEditingNote && (
                <button onClick={handleDeleteNote} className="bg-red-500 text-white px-4 py-2 rounded">
                  Delete
                </button>
              )}

              <button
                onClick={() => {
                  setActiveTask(null);
                  setIsEditingNote(false);
                }}
                className="bg-gray-500 text-white px-4 py-2 rounded"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
