// src/pages/Home.js
import { Link } from "react-router-dom";

export default function Home() {
  return (
    <div className="h-screen bg-gradient-to-r from-gray-800 via-blue-700 to-gray-900 text-white flex flex-col">
      
      {/* Top-right corner buttons */}
      <div className="flex justify-end space-x-4 p-6">
        <Link to="/login" className=" px-4 py-2 rounded">
          Login
        </Link>
        <Link to="/register" className=" px-4 py-2 rounded">
          Register
        </Link>
      </div>

      {/* Centered main content */}
      <div className="flex flex-col items-center justify-center flex-grow">
        <h1 className="mb-20 text-5xl font-bold bg-gradient-to-r from-cyan-600 via-violet-500 to-cyan-500 bg-clip-text text-transparent">
          Welcome to Task Manager 🚀
        </h1>
        <p className="text-2xl mb-8 text-gray-300">
          Your personal Kanban board & notes app.
        </p>
      </div>
    </div>
  );
}
