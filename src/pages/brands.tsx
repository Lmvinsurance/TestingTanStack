import { Link } from "react-router-dom";;
import { motion } from "motion/react";
import {
  ArrowLeft,
  ChefHat,
  CircleDot,
  Clock,
  CreditCard,
  Package,
  ScrollText,
  ShoppingBag,
  Store,
  Truck,
  UtensilsCrossed,
} from "lucide-react";
import kostaLogo from "@/assets/kosta-logo.asset.json";
import theeyagaLogo from "@/assets/theeyaga-logo.asset.json";
import { OrnamentalBorder } from "@/components/SplashDecorations";



/* ─────────────────────────  Data  ───────────────────────── */

const BRANDS = [
  {
    id: "kosta",
    logo: kostaLogo.url,
    title: "Kosia Rajula Ruchulu",
    description:
      "Freshly cooked Telugu meals, biryanis, curries, tiffins and family favorites.",
    features: ["Fresh Food", "Pickup", "Delivery", "Restaurant"],
    cta: "Order Food",
    ctaLink: "/customer/outlets" as const,
    accent: "saffron" as const,
  },
  {
    id: "theeyaga",
    logo: theeyagaLogo.url,
    title: "Theeyaga-Kaaranga",
    description:
      "Traditional Andhra pickles, sweets, snacks, festival specials and homemade delicacies.",
    features: ["Pickles", "Sweets", "Snacks", "Gift Packs"],
    cta: "Shop Products",
    ctaLink: "/categories" as const,
    accent: "maroon" as const,
  },
];

const TRUST_PILLARS = [
  {
    icon: <ScrollText className="h-6 w-6" />,
    title: "Authentic Recipes",
    description: "Time-honored Telugu recipes passed down through generations.",
  },
  {
    icon: <ChefHat className="h-6 w-6" />,
    title: "Fresh Ingredients",
    description: "Handpicked daily from trusted local farms and markets.",
  },
  {
    icon: <CreditCard className="h-6 w-6" />,
    title: "Secure Payments",
    description: "Bank-grade encryption keeps every transaction safe.",
  },
];

/* ─────────────────────────  Components  ───────────────────────── */

function BrandCard({
  logo,
  title,
  description,
  features,
  cta,
  ctaLink,
  accent,
  index,
}: {
  logo: string;
  title: string;
  description: string;
  features: string[];
  cta: string;
  ctaLink: string;
  accent: "saffron" | "maroon";
  index: number;
}) {
  const isSaffron = accent === "saffron";

  return (
    <motion.article
      initial={{ opacity: 0, y: 28 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.2 + index * 0.15, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -4, transition: { duration: 0.25 } }}
      whileTap={{ scale: 0.98 }}
      className={`relative overflow-hidden rounded-3xl border ${isSaffron ? "border-saffron/40" : "border-maroon/30"} bg-cream shadow-xl ${isSaffron ? "shadow-saffron/10" : "shadow-maroon/10"}`}
    >
      {/* Background gradient */}
      <div
        className={`absolute inset-0 bg-gradient-to-br ${isSaffron ? "from-saffron/12 via-gold-soft/15 to-gold/10" : "from-maroon/10 via-saffron/8 to-gold-soft/10"}`}
      />

      {/* Decorative corner blob */}
      <div
        className={`pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full ${isSaffron ? "bg-saffron/10" : "bg-maroon/8"} blur-3xl`}
      />

      <div className="relative flex flex-col items-center px-6 pb-7 pt-7 sm:px-8 sm:pb-8 sm:pt-8">
        {/* Logo */}
        <motion.div
          whileHover={{ scale: 1.05, rotate: 2 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          className="relative"
        >
          <div
            className={`rounded-full bg-cream p-2 shadow-lg ${isSaffron ? "shadow-saffron/20 ring-2 ring-saffron/30" : "shadow-maroon/15 ring-2 ring-maroon/20"}`}
          >
            <img
              src={logo}
              alt={title}
              className="h-24 w-24 rounded-full object-contain sm:h-28 sm:w-28"
            />
          </div>
        </motion.div>

        {/* Title & description */}
        <h3 className="text-display mt-5 text-2xl text-maroon sm:text-3xl">
          {title}
        </h3>
        <p className="mt-2 max-w-xs text-center text-sm leading-relaxed text-maroon-deep/70">
          {description}
        </p>

        {/* Feature chips */}
        <ul className="mt-5 flex flex-wrap justify-center gap-2">
          {features.map((f) => (
            <li
              key={f}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide ${isSaffron ? "border-saffron/30 bg-saffron/10 text-saffron-deep" : "border-maroon/20 bg-maroon/8 text-maroon-deep"}`}
            >
              <CircleDot className="h-2.5 w-2.5" />
              {f}
            </li>
          ))}
        </ul>

        {/* CTA */}
        <Link
          to={ctaLink}
          className={`mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full px-6 py-3.5 text-sm font-semibold shadow-lg transition-colors duration-200 ${isSaffron ? "bg-saffron-deep text-cream shadow-saffron/25 hover:bg-maroon" : "bg-maroon text-cream shadow-maroon/20 hover:bg-maroon-deep"}`}
        >
          {cta === "Order Food" ? (
            <UtensilsCrossed className="h-4 w-4" />
          ) : (
            <ShoppingBag className="h-4 w-4" />
          )}
          {cta}
        </Link>
      </div>
    </motion.article>
  );
}

function TrustCard({
  icon,
  title,
  description,
  index,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.8 + index * 0.1, ease: "easeOut" }}
      className="flex flex-col items-center rounded-2xl border border-gold/25 bg-cream/80 px-5 py-6 text-center shadow-sm backdrop-blur-sm transition hover:-translate-y-1 hover:border-gold/40 hover:shadow-md"
    >
      <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-saffron to-saffron-deep text-cream shadow-md">
        {icon}
      </div>
      <h4 className="text-display mt-3 text-base text-maroon">{title}</h4>
      <p className="mt-1 text-xs leading-relaxed text-maroon-deep/60">
        {description}
      </p>
    </motion.div>
  );
}

/* ─────────────────────────  Screen  ───────────────────────── */

function BrandSelectionScreen() {
  return (
    <main className="relative min-h-screen bg-cream">
      {/* Subtle background texture */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,oklch(0.92_0.1_80/0.5)_0%,transparent_60%),radial-gradient(ellipse_at_50%_100%,oklch(0.78_0.15_55/0.35)_0%,transparent_55%)]" />

      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 flex items-center gap-3 px-5 py-4"
      >
        <Link
          to="/"
          className="grid h-10 w-10 place-items-center rounded-full border border-gold/40 text-maroon transition hover:bg-cream-warm/50"
          aria-label="Back"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
      </motion.header>

      <div className="relative z-10 mx-auto max-w-md px-5 pb-10 sm:max-w-lg">
        {/* Title block */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="flex flex-col items-center text-center"
        >
          <div className="flex items-center gap-3 text-saffron-deep/70">
            <span className="h-px w-6 bg-current" />
            <span className="text-[10px] font-semibold uppercase tracking-[0.35em]">
              Telugu Food Club
            </span>
            <span className="h-px w-6 bg-current" />
          </div>

          <h1 className="text-display mt-3 text-3xl leading-[1.1] text-maroon sm:text-4xl">
            Choose Your{" "}
            <span className="font-script text-4xl text-saffron-deep sm:text-5xl">
              Experience
            </span>
          </h1>

          <p className="mt-3 max-w-xs text-sm text-maroon-deep/70">
            Discover authentic Telugu flavors your way.
          </p>

          <div className="mt-4 text-saffron-deep/40">
            <OrnamentalBorder className="h-3 w-32" />
          </div>
        </motion.div>

        {/* Brand cards */}
        <div className="mt-8 flex flex-col gap-5">
          {BRANDS.map((brand, i) => (
            <BrandCard key={brand.id} {...brand} index={i} />
          ))}
        </div>

        {/* Trust section */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="mt-10"
        >
          <div className="flex items-center justify-center gap-3 text-maroon/50">
            <span className="h-px w-8 bg-current opacity-60" />
            <span className="text-[10px] font-semibold uppercase tracking-[0.3em]">
              Why Customers Love Us
            </span>
            <span className="h-px w-8 bg-current opacity-60" />
          </div>

          <div className="mt-5 grid grid-cols-3 gap-3">
            {TRUST_PILLARS.map((pillar, i) => (
              <TrustCard key={pillar.title} {...pillar} index={i} />
            ))}
          </div>
        </motion.div>

        {/* Footer ornament */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 1.2 }}
          className="mt-10 flex justify-center text-maroon/30"
        >
          <OrnamentalBorder className="h-3 w-40" />
        </motion.div>
      </div>
    </main>
  );
}

export default BrandSelectionScreen;
