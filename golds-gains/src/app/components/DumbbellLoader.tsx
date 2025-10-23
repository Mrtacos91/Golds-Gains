"use client";

interface DumbbellLoaderProps {
  size?: number;
  className?: string;
}

export default function DumbbellLoader({
  size = 96,
  className = "",
}: DumbbellLoaderProps) {
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div className="loader-wrapper">
        <div className="container" style={{ height: size, width: size }}>
          <span></span>
          <span></span>
          <span></span>
          <span></span>
        </div>
      </div>

      <style jsx>{`
        .loader-wrapper {
          position: relative;
          width: ${size}px;
          height: ${size}px;
        }

        .container {
          position: absolute;
          top: 50%;
          left: 50%;
          border-radius: 50%;
          animation: rotate_3922 1.2s linear infinite;
          background-color: #ffd700;
          background-image: linear-gradient(#ffd700, #ffb6c1, #add8e6);
        }

        .container span {
          position: absolute;
          border-radius: 50%;
          height: 100%;
          width: 100%;
          background-color: #ffd700;
          background-image: linear-gradient(#ffd700, #ffb6c1, #add8e6);
        }

        .container span:nth-of-type(1) {
          filter: blur(5px);
        }

        .container span:nth-of-type(2) {
          filter: blur(10px);
        }

        .container span:nth-of-type(3) {
          filter: blur(25px);
        }

        .container span:nth-of-type(4) {
          filter: blur(50px);
        }

        .container::after {
          content: "";
          position: absolute;
          top: 10px;
          left: 10px;
          right: 10px;
          bottom: 10px;
          background-color: #0a0a0a;
          border: solid 5px #0a0a0a;
          border-radius: 50%;
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
        }

        @keyframes rotate_3922 {
          from {
            transform: translate(-50%, -50%) rotate(0deg);
          }

          to {
            transform: translate(-50%, -50%) rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}
