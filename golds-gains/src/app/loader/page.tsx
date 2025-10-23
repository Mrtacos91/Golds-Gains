"use client";

import DumbbellLoader from "../components/DumbbellLoader";

export default function LoaderPage() {
  return (
    <div className="min-h-screen bg-linear-to-br from-[#0a0a0a] via-[#0f0f0f] to-[#1a1a1a] flex flex-col items-center justify-center gap-8">
      <DumbbellLoader size={180} />

      <div className="text-center space-y-3">
        <h1 className="text-3xl font-bold bg-linear-to-r from-yellow-400 via-yellow-500 to-yellow-600 bg-clip-text text-transparent">
          Gold&apos;s Gains
        </h1>
        <p className="text-gray-400 text-sm">
          Preparando tu experiencia de entrenamiento...
        </p>
      </div>
    </div>
  );
}
