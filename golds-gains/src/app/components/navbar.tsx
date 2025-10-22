"use client";

interface NavbarProps {
  activeSection: "home" | "insights" | "config";
  onSectionChange: (section: "home" | "insights" | "config") => void;
  userName?: string;
}

export default function Navbar({
  activeSection,
  onSectionChange,
  userName,
}: NavbarProps) {
  return (
    <nav className="sticky top-0 z-50 bg-[#0a0a0a]/90 backdrop-blur-lg border-b border-gray-800/50/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <img
              src="/logo.png"
              alt="Gold's Gains"
              className="w-10 h-10 object-contain"
            />
            <h1 className="text-2xl font-bold bg-linear-to-r from-orange-400 to-orange-500 bg-clip-text text-transparent hidden sm:block">
              Gold's Gains
            </h1>
          </div>

          {/* Pill Navigation - Desktop & Mobile */}
          <div className="flex items-center">
            <div className="bg-[#0f0f0f] rounded-full p-1 border border-gray-800/50 shadow-lg">
              <div className="flex items-center space-x-1">
                <button
                  onClick={() => onSectionChange("home")}
                  className={`group relative px-6 py-2 rounded-full font-medium transition-all duration-300 ${
                    activeSection === "home"
                      ? "bg-orange-400 text-white shadow-lg shadow-orange-400/50"
                      : "text-gray-400 hover:text-white hover:bg-[#1a1a1a]"
                  }`}
                >
                  <span className="relative z-10 flex items-center gap-2 text-sm sm:text-base">
                    <svg
                      className="w-4 h-4 sm:w-5 sm:h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                      />
                    </svg>
                    <span className="hidden sm:inline">Home</span>
                  </span>
                </button>

                <button
                  onClick={() => onSectionChange("insights")}
                  className={`group relative px-6 py-2 rounded-full font-medium transition-all duration-300 ${
                    activeSection === "insights"
                      ? "bg-blue-400 text-white shadow-lg shadow-blue-400/50"
                      : "text-gray-400 hover:text-white hover:bg-[#1a1a1a]"
                  }`}
                >
                  <span className="relative z-10 flex items-center gap-2 text-sm sm:text-base">
                    <svg
                      className="w-4 h-4 sm:w-5 sm:h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                      />
                    </svg>
                    <span className="hidden sm:inline">Insights</span>
                  </span>
                </button>

                <button
                  onClick={() => onSectionChange("config")}
                  className={`group relative px-6 py-2 rounded-full font-medium transition-all duration-300 ${
                    activeSection === "config"
                      ? "bg-pink-400 text-white shadow-lg shadow-pink-400/50"
                      : "text-gray-400 hover:text-white hover:bg-[#1a1a1a]"
                  }`}
                >
                  <span className="relative z-10 flex items-center gap-2 text-sm sm:text-base">
                    <svg
                      className="w-4 h-4 sm:w-5 sm:h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                    <span className="hidden sm:inline">Config</span>
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* User Info - Solo Desktop */}
          <div className="hidden lg:flex items-center">
            <div className="flex items-center gap-3 px-4 py-2 bg-[#0f0f0f] rounded-full border border-gray-800/50">
              <div className="w-8 h-8 rounded-full bg-linear-to-br from-[#ff6b35] to-[#ff8555] flex items-center justify-center text-white font-bold text-sm">
                {userName?.charAt(0).toUpperCase() || "U"}
              </div>
              <span className="text-gray-300 text-sm font-medium">
                {userName || "Usuario"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
