import { motion } from "motion/react";

// Decorative South Indian inspired ornamental border (kolam/rangoli motif)
export function OrnamentalBorder({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 200 20"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M0 10 H40 M160 10 H200"
        stroke="currentColor"
        strokeWidth="0.6"
        strokeLinecap="round"
      />
      <g stroke="currentColor" strokeWidth="0.6" fill="none">
        {[50, 100, 150].map((cx) => (
          <g key={cx}>
            <circle cx={cx} cy={10} r={3} />
            <circle cx={cx} cy={10} r={6} opacity={0.6} />
            <path
              d={`M${cx - 10} 10 Q${cx - 5} 4 ${cx} 10 Q${cx + 5} 16 ${cx + 10} 10`}
              opacity={0.7}
            />
          </g>
        ))}
      </g>
    </svg>
  );
}

// Subtle mandala backdrop
export function MandalaBackdrop() {
  return (
    <motion.svg
      initial={{ opacity: 0, rotate: -8, scale: 0.9 }}
      animate={{ opacity: 0.14, rotate: 0, scale: 1 }}
      transition={{ duration: 2.2, ease: "easeOut" }}
      viewBox="0 0 400 400"
      className="absolute inset-0 m-auto h-[120vmin] w-[120vmin] text-maroon"
      aria-hidden
    >
      <g fill="none" stroke="currentColor" strokeWidth="0.5">
        {Array.from({ length: 24 }).map((_, i) => {
          const angle = (i * 360) / 24;
          return (
            <g key={i} transform={`rotate(${angle} 200 200)`}>
              <path d="M200 60 Q210 100 200 140 Q190 100 200 60 Z" />
              <circle cx="200" cy="70" r="3" />
            </g>
          );
        })}
        <circle cx="200" cy="200" r="60" />
        <circle cx="200" cy="200" r="90" />
        <circle cx="200" cy="200" r="130" strokeDasharray="2 4" />
        <circle cx="200" cy="200" r="170" />
      </g>
    </motion.svg>
  );
}

// Hand-drawn food illustrations
const foods = {
  biryani: (
    <g fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round">
      <path d="M8 28 Q24 18 40 28 L36 36 Q24 40 12 36 Z" />
      <path d="M14 26 q2 -3 4 0 M22 24 q2 -3 4 0 M30 26 q2 -3 4 0" />
      <circle cx="18" cy="30" r="1" />
      <circle cx="26" cy="29" r="1" />
      <circle cx="32" cy="31" r="1" />
      <path d="M20 22 l1 -4 M28 21 l-1 -4" />
    </g>
  ),
  dosa: (
    <g fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round">
      <path d="M6 30 Q24 14 42 30 Q24 34 6 30 Z" />
      <path d="M14 26 Q24 22 34 26" opacity="0.6" />
      <circle cx="24" cy="32" r="2" />
    </g>
  ),
  idli: (
    <g fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round">
      <ellipse cx="16" cy="28" rx="8" ry="6" />
      <ellipse cx="32" cy="28" rx="8" ry="6" />
      <path d="M8 28 Q16 24 24 28 M24 28 Q32 24 40 28" opacity="0.5" />
    </g>
  ),
  pesarattu: (
    <g fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round">
      <circle cx="24" cy="26" r="14" />
      <path d="M16 22 q2 -2 4 0 M28 22 q2 -2 4 0 M18 30 q3 2 6 0 q3 -2 6 0" opacity="0.6" />
    </g>
  ),
  pulihora: (
    <g fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round">
      <path d="M10 32 Q24 18 38 32 Q24 38 10 32 Z" />
      <circle cx="18" cy="28" r="0.8" />
      <circle cx="24" cy="26" r="0.8" />
      <circle cx="30" cy="28" r="0.8" />
      <path d="M20 24 l-1 -3 M28 24 l1 -3" />
    </g>
  ),
  gongura: (
    <g fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round">
      <path d="M24 10 Q12 18 16 32 Q24 38 32 32 Q36 18 24 10 Z" />
      <path d="M24 14 L24 32 M18 22 L30 22" opacity="0.5" />
    </g>
  ),
};

type FoodKey = keyof typeof foods;

export function FloatingFood({
  food,
  className,
  delay = 0,
  duration = 6,
  rotate = 0,
}: {
  food: FoodKey;
  className?: string;
  delay?: number;
  duration?: number;
  rotate?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.6 }}
      animate={{ opacity: 0.5, y: 0, scale: 1 }}
      transition={{ duration: 1.4, delay, ease: "easeOut" }}
      className={`absolute text-maroon ${className ?? ""}`}
      aria-hidden
    >
      <motion.div
        animate={{ y: [0, -12, 0], rotate: [rotate - 2, rotate + 2, rotate - 2] }}
        transition={{ duration, repeat: Infinity, ease: "easeInOut" }}
      >
        <svg viewBox="0 0 48 48" className="h-14 w-14 sm:h-16 sm:w-16">
          {foods[food]}
        </svg>
      </motion.div>
    </motion.div>
  );
}
