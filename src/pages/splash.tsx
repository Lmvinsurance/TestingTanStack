;
import { motion } from "motion/react";
import logoAsset from "@/assets/kosta-logo.asset.json";
import {
  FloatingFood,
  MandalaBackdrop,
  OrnamentalBorder,
} from "@/components/SplashDecorations";



function SplashScreen() {
  return (
    <main className="splash-bg relative flex min-h-screen w-full items-center justify-center overflow-hidden px-6">
      {/* Vignette */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_50%,oklch(0.38_0.14_25/0.35)_100%)]" />

      {/* Mandala */}
      <MandalaBackdrop />

      {/* Top ornament */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.2, delay: 0.2 }}
        className="absolute left-1/2 top-10 -translate-x-1/2 text-maroon/60"
      >
        <OrnamentalBorder className="h-4 w-56 sm:w-72" />
      </motion.div>

      {/* Floating foods */}
      <FloatingFood food="biryani" className="left-[8%] top-[18%]" delay={1.2} duration={7} rotate={-6} />
      <FloatingFood food="dosa" className="right-[8%] top-[22%]" delay={1.4} duration={6.5} rotate={8} />
      <FloatingFood food="idli" className="left-[6%] top-[55%]" delay={1.6} duration={7.5} rotate={4} />
      <FloatingFood food="pesarattu" className="right-[6%] top-[58%]" delay={1.8} duration={6.8} rotate={-5} />
      <FloatingFood food="pulihora" className="left-[14%] bottom-[20%]" delay={2.0} duration={7.2} rotate={6} />
      <FloatingFood food="gongura" className="right-[14%] bottom-[22%]" delay={2.2} duration={6.6} rotate={-8} />

      {/* Center stack */}
      <div className="relative z-10 flex flex-col items-center text-center">
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
          className="logo-glow relative"
        >
          {/* Soft halo ring */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1.4, delay: 0.3 }}
            className="absolute inset-0 -z-10 rounded-full bg-[radial-gradient(circle,oklch(0.92_0.12_82/0.7)_0%,transparent_70%)] blur-2xl"
          />
          <motion.div
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
            className="relative"
          >
            <div className="rounded-full bg-cream/30 p-2 backdrop-blur-sm ring-1 ring-gold/40">
              <img
                src={logoAsset.url}
                alt="Kosta Rajula Ruchulu — Authentic Telugu Cuisine"
                className="h-44 w-44 rounded-full object-contain sm:h-56 sm:w-56"
              />
            </div>
          </motion.div>
        </motion.div>

        {/* Brand name */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 1.0 }}
          className="mt-8 flex flex-col items-center"
        >
          <div className="flex items-center gap-3 text-gold">
            <span className="h-px w-8 bg-current opacity-60" />
            <span className="text-[10px] font-medium uppercase tracking-[0.35em] text-maroon/70">
              Est · Andhra · Telangana
            </span>
            <span className="h-px w-8 bg-current opacity-60" />
          </div>
          <h1 className="text-display mt-3 text-4xl leading-[1.05] text-maroon sm:text-5xl">
            Kosta Rajula
            <span className="block font-script text-5xl text-saffron-deep sm:text-6xl">
              Ruchulu
            </span>
          </h1>
        </motion.div>

        {/* Tagline */}
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 1.6 }}
          className="mt-5 max-w-xs text-sm font-light tracking-wide text-maroon-deep/80 sm:text-base"
        >
          Authentic Telugu Flavours <span className="text-saffron-deep">·</span>{" "}
          Delivered Fresh
        </motion.p>
      </div>

      {/* Bottom loader */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 2.2 }}
        className="absolute bottom-10 left-1/2 z-10 flex -translate-x-1/2 flex-col items-center gap-3"
      >
        <div className="flex items-center gap-2">
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              className="block h-2 w-2 rounded-full bg-maroon"
              animate={{ opacity: [0.25, 1, 0.25], scale: [0.8, 1.15, 0.8] }}
              transition={{
                duration: 1.4,
                repeat: Infinity,
                delay: i * 0.2,
                ease: "easeInOut",
              }}
            />
          ))}
        </div>
        <p className="text-[11px] font-medium uppercase tracking-[0.3em] text-maroon-deep/70">
          Preparing Your Culinary Experience
        </p>
        <div className="text-maroon/50">
          <OrnamentalBorder className="h-3 w-40" />
        </div>
      </motion.div>
    </main>
  );
}

export default SplashScreen;
