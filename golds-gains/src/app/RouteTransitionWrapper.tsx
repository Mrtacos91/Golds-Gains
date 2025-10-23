"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import DumbbellLoader from "./components/DumbbellLoader";

export default function RouteTransitionWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [displayPath, setDisplayPath] = useState(pathname);

  useEffect(() => {
    if (pathname !== displayPath) {
      setIsTransitioning(true);

      const timer = setTimeout(() => {
        setDisplayPath(pathname);
        setIsTransitioning(false);
      }, 800);

      return () => clearTimeout(timer);
    }
  }, [pathname, displayPath]);

  if (isTransitioning) {
    return (
      <div className="min-h-screen bg-linear-to-br from-[#0a0a0a] via-[#0f0f0f] to-[#1a1a1a] flex items-center justify-center">
        <DumbbellLoader size={150} />
      </div>
    );
  }

  return <>{children}</>;
}
