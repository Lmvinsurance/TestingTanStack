import { Link } from "react-router-dom";
import { motion } from "motion/react";
import { outletService, Outlet } from "@/lib/supabase-outlets.service";
import { useState, useEffect } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  Leaf,
  Lock,
  MapPin,
  Menu,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Star,
  Truck,
  User,
  UtensilsCrossed,
  X,
  Award,
} from "lucide-react";
// Import your actual logo images
import headerLogo from "@/assets/Logotfc1-DFU8N0iG (1).png";
import kostaLogo from "@/assets/Logotfc1-DFU8N0iG (1).png";
import theeyagaLogo from "@/assets/THEEYAGA-KAARAMGA-PHOTOROOM.png";
import heroThali from "@/assets/hero-thali.jpg";
import outlet1 from "@/assets/outlet-1.jpg";
import outlet2 from "@/assets/outlet-2.jpg";
import { OrnamentalBorder } from "@/components/SplashDecorations";
// Import Supabase menu components
import { menuService, MenuCategory } from "@/lib/supabase-menu.service";
import { toast } from "sonner";

/* ─────────────────────────  Shared Decorative bits  ───────────────────────── */

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-center gap-3 text-saffron-deep">
      <span className="h-px w-8 bg-current opacity-60" />
      <span className="text-[10px] font-semibold uppercase tracking-[0.35em]">
        {children}
      </span>
      <span className="h-px w-8 bg-current opacity-60" />
    </div>
  );
}

function SectionHeading({
  label,
  title,
  subtitle,
}: {
  label: string;
  title: React.ReactNode;
  subtitle?: string;
}) {
  return (
    <div className="flex flex-col items-center text-center">
      <SectionLabel>{label}</SectionLabel>
      <h2 className="text-display mt-3 text-3xl leading-[1.1] text-maroon sm:text-4xl md:text-5xl">
        {title}
      </h2>
      {subtitle && (
        <p className="mt-3 max-w-xl text-sm text-maroon-deep/70 sm:text-base">
          {subtitle}
        </p>
      )}
      <div className="mt-5 text-saffron-deep/60">
        <OrnamentalBorder className="h-3 w-40" />
      </div>
    </div>
  );
}

/* ─────────────────────────  Navbar  ───────────────────────── */

function Navbar() {
  const [open, setOpen] = useState(false);
  const links = [
    { label: "Brands", href: "#brands" },
    { label: "Categories", href: "#categories" },
    { label: "Outlets", href: "#outlets" },
    { label: "Reviews", href: "#reviews" },
  ];
  return (
    <header className="sticky top-0 z-40 border-b border-gold/30 bg-cream/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3">
        <Link to="/" className="flex items-center gap-2">
          <img
            src={headerLogo}
            alt="Telugu Food Club"
            className="h-12 w-auto object-contain"
          />
        </Link>
        <nav className="hidden items-center gap-8 md:flex">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-sm font-medium text-maroon-deep/80 transition hover:text-saffron-deep"
            >
              {l.label}
            </a>
          ))}
        </nav>
        <div className="hidden items-center gap-3 md:flex">
          <Link
            to="/admin/login"
            className="inline-flex items-center gap-1.5 rounded-full border border-maroon/20 bg-cream/60 px-4 py-2 text-xs font-medium text-maroon-deep transition hover:border-maroon/40 hover:bg-cream"
          >
            <Lock className="h-3.5 w-3.5" />
            Admin
          </Link>
          <Link
            to="/customer/signin"
            className="inline-flex items-center gap-1.5 rounded-full border border-gold/40 bg-cream/70 px-4 py-2 text-xs font-medium text-maroon-deep transition hover:border-saffron/60 hover:bg-cream"
          >
            <User className="h-3.5 w-3.5" />
            Sign In
          </Link>
          <Link
            to="/customer/menu"
            className="inline-flex items-center gap-2 rounded-full bg-maroon px-5 py-2.5 text-sm font-medium text-cream shadow-md transition hover:bg-maroon-deep"
          >
            <ShoppingBag className="h-4 w-4" />
            Order Now
          </Link>
        </div>
        <button
          onClick={() => setOpen((s) => !s)}
          className="grid h-10 w-10 place-items-center rounded-full border border-gold/40 text-maroon md:hidden"
          aria-label="Menu"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>
      {open && (
        <div className="border-t border-gold/30 bg-cream md:hidden">
          <div className="flex flex-col px-5 py-3">
            {links.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="py-2 text-sm font-medium text-maroon-deep"
              >
                {l.label}
              </a>
            ))}
            <div className="mt-2 flex flex-col gap-2">
              <Link
                to="/admin/login"
                onClick={() => setOpen(false)}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-maroon/20 px-5 py-2.5 text-sm font-medium text-maroon-deep"
              >
                <Lock className="h-4 w-4" /> Admin Login
              </Link>
              <Link
                to="/customer/signin"
                onClick={() => setOpen(false)}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-gold/40 px-5 py-2.5 text-sm font-medium text-maroon-deep"
              >
                <User className="h-4 w-4" /> Sign In
              </Link>
              <Link
                to="/customer/menu"
                onClick={() => setOpen(false)}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-maroon px-5 py-2.5 text-sm font-medium text-cream"
              >
                <ShoppingBag className="h-4 w-4" /> Order Now
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

/* ─────────────────────────  Section 1: Hero  ───────────────────────── */

function Hero() {
  return (
    <section className="relative isolate overflow-hidden">
      <div className="splash-bg absolute inset-0 -z-10" />
      <div
        className="absolute inset-0 -z-10 opacity-25 mix-blend-multiply"
        style={{
          backgroundImage: `url(${heroThali})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-cream/40 via-cream/10 to-cream" />

      <div className="mx-auto flex max-w-6xl flex-col items-center px-5 pb-24 pt-12 text-center md:pb-32 md:pt-20">
        {/* Logo plaque - Kosta Rajula Ruchulu Logo */}
        <motion.div
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          className="logo-glow relative"
        >
          <div className="absolute inset-0 -z-10 rounded-full bg-[radial-gradient(circle,oklch(0.92_0.12_82/0.65)_0%,transparent_70%)] blur-2xl" />
          <div className="rounded-full bg-cream/40 p-2 ring-1 ring-gold/40 backdrop-blur-sm">
            <img
              src={kostaLogo}
              alt="Kosta Rajula Ruchulu"
              className="h-32 w-32 rounded-full object-contain sm:h-40 sm:w-40"
            />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="mt-7"
        >
          <SectionLabel>Est · Andhra · Telangana</SectionLabel>
          <h1 className="text-display mt-4 text-4xl leading-[1.05] text-maroon sm:text-5xl md:text-6xl">
            Authentic Telugu Flavours,
            <span className="block font-script text-5xl text-saffron-deep sm:text-6xl md:text-7xl">
              Delivered Fresh
            </span>
          </h1>
          <p className="mx-auto mt-5 max-w-md text-sm leading-relaxed text-maroon-deep/80 sm:text-base">
            Traditional recipes, regional favourites and homemade taste from
            the heart of Telugu cuisine.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.7 }}
          className="mt-8 flex w-full max-w-md flex-col items-center gap-3 sm:flex-row sm:justify-center"
        >
          <Link
            to="/customer/menu"
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-maroon px-7 py-3.5 text-sm font-medium text-cream shadow-lg shadow-maroon/20 transition hover:bg-maroon-deep sm:w-auto"
          >
            <UtensilsCrossed className="h-4 w-4" /> Order Food
          </Link>
          <Link
            to="/brands"
            className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-maroon/30 bg-cream/70 px-7 py-3.5 text-sm font-medium text-maroon backdrop-blur-sm transition hover:border-maroon hover:bg-cream sm:w-auto"
          >
            Explore Our Brands
          </Link>
        </motion.div>

        {/* Trust strip */}
        <div className="mt-12 grid w-full max-w-md grid-cols-3 gap-3 text-center">
          {[
            { icon: <Leaf className="h-4 w-4" />, label: "Fresh Daily" },
            { icon: <Star className="h-4 w-4" />, label: "4.9 Rated" },
            { icon: <Truck className="h-4 w-4" />, label: "On-time" },
          ].map((s) => (
            <div
              key={s.label}
              className="flex flex-col items-center gap-1 rounded-2xl border border-gold/30 bg-cream/60 px-2 py-3 backdrop-blur-sm"
            >
              <div className="text-saffron-deep">{s.icon}</div>
              <p className="text-[11px] font-medium text-maroon-deep">
                {s.label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────  Section 2: Brands  ───────────────────────── */

function BrandCard({
  logo,
  title,
  tagline,
  description,
  features,
  cta,
  accent,
}: {
  logo: string;
  title: string;
  tagline: string;
  description: string;
  features: string[];
  cta: string;
  accent: "saffron" | "maroon";
}) {
  const accentBg =
    accent === "saffron"
      ? "from-saffron/15 to-gold-soft/20"
      : "from-maroon/10 to-saffron/10";
  const ctaCls =
    accent === "saffron"
      ? "bg-saffron-deep text-cream hover:bg-maroon"
      : "bg-maroon text-cream hover:bg-maroon-deep";
  return (
    <motion.article
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.7 }}
      className={`relative overflow-hidden rounded-3xl border border-gold/30 bg-gradient-to-br ${accentBg} p-6 shadow-xl shadow-maroon/5 backdrop-blur-sm sm:p-8`}
    >
      <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-saffron/10 blur-2xl" />
      <div className="flex flex-col items-center text-center">
        <div className="rounded-full bg-cream p-2 ring-1 ring-gold/40 shadow-md">
          <img
            src={logo}
            alt={title}
            className="h-24 w-24 rounded-full object-contain sm:h-28 sm:w-28"
          />
        </div>
        <p className="mt-4 text-[10px] font-semibold uppercase tracking-[0.3em] text-saffron-deep">
          {tagline}
        </p>
        <h3 className="text-display mt-2 text-2xl text-maroon sm:text-3xl">
          {title}
        </h3>
        <p className="mt-3 max-w-sm text-sm text-maroon-deep/75">
          {description}
        </p>
      </div>

      <ul className="mt-6 grid grid-cols-2 gap-2">
        {features.map((f) => (
          <li
            key={f}
            className="flex items-center gap-2 rounded-xl border border-gold/30 bg-cream/70 px-3 py-2 text-[12px] font-medium text-maroon-deep"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-saffron-deep" />
            {f}
          </li>
        ))}
      </ul>

      <Link
        to="/customer/menu"
        className={`mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-medium shadow-md transition ${ctaCls}`}
      >
        {cta} <ChevronRight className="h-4 w-4" />
      </Link>
    </motion.article>
  );
}

function Brands() {
  return (
    <section
      id="brands"
      className="relative bg-cream-warm/40 px-5 py-20 sm:py-24"
    >
      <div className="mx-auto max-w-6xl">
        <SectionHeading
          label="Our Brands"
          title={
            <>
              Choose Your{" "}
              <span className="font-script text-saffron-deep">
                Telugu Food
              </span>{" "}
              Experience
            </>
          }
          subtitle="Two heritage brands. One culinary ecosystem rooted in Andhra & Telangana traditions."
        />
        <div className="mt-12 grid gap-6 md:grid-cols-2">
          <BrandCard
            logo={kostaLogo}
            title="Kosta Rajula Ruchulu"
            tagline="Traditional Telugu Restaurant"
            description="Freshly prepared Telugu meals, biryanis, curries, tiffins and family favourites."
            features={[
              "Restaurant Ordering",
              "Freshly Cooked",
              "Multiple Outlets",
              "Online Ordering",
              "Pickup & Delivery",
              "Family Dining",
            ]}
            cta="Order Now"
            accent="maroon"
          />
          <BrandCard
            logo={theeyagaLogo}
            title="Theeyaga-Kaaranga"
            tagline="Snacks · Sweets · Pickles"
            description="Traditional Andhra pickles, homemade sweets, spicy snacks and regional delicacies."
            features={[
              "Andhra Pickles",
              "Homemade Sweets",
              "Spicy Snacks",
              "Gift Packs",
              "Festival Specials",
              "Pan-India Shipping",
            ]}
            cta="Shop Now"
            accent="saffron"
          />
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────  Section 3: Why  ───────────────────────── */

function Why() {
  const items = [
    {
      icon: <Sparkles className="h-5 w-5" />,
      title: "Authentic Telugu Recipes",
      copy: "Generations-old recipes from Andhra & Telangana kitchens.",
    },
    {
      icon: <Leaf className="h-5 w-5" />,
      title: "Fresh Ingredients",
      copy: "Sourced daily from trusted regional farms and markets.",
    },
    {
      icon: <ShieldCheck className="h-5 w-5" />,
      title: "Secure Online Payments",
      copy: "Bank-grade encryption on every order, every time.",
    },
    {
      icon: <Truck className="h-5 w-5" />,
      title: "Fast Order Fulfillment",
      copy: "Hot meals at your door. Snacks shipped pan-India.",
    },
  ];
  return (
    <section className="px-5 py-20 sm:py-24">
      <div className="mx-auto max-w-6xl">
        <SectionHeading
          label="Why Choose Us"
          title="Heritage Quality, Modern Convenience"
        />
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((it, i) => (
            <motion.div
              key={it.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              className="group relative overflow-hidden rounded-2xl border border-gold/30 bg-cream p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-xl hover:shadow-maroon/10"
            >
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-saffron to-saffron-deep text-cream shadow-md">
                {it.icon}
              </div>
              <h3 className="text-display mt-4 text-lg text-maroon">
                {it.title}
              </h3>
              <p className="mt-2 text-sm text-maroon-deep/70">{it.copy}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────  Section 4: Categories (Supabase Powered - Only Categories)  ───────────────────────── */

// Categories Component - Only shows categories as cards
function Categories() {
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      setLoading(true);
      const data = await menuService.getCategories();
      setCategories(data);
    } catch (error) {
      console.error("Error loading categories:", error);
      toast.error("Failed to load menu categories");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <section
        id="categories"
        className="bg-gradient-to-b from-cream to-cream-warm/50 px-4 py-16 sm:py-20"
      >
        <div className="mx-auto max-w-6xl">
          <SectionHeading
            label="Categories"
            title="Explore Our Menu"
            subtitle="Discover authentic Telugu flavors from our curated menu"
          />
          <div className="mt-10 flex items-center justify-center py-12">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-saffron-deep border-t-transparent" />
          </div>
        </div>
      </section>
    );
  }

  if (categories.length === 0) {
    return (
      <section
        id="categories"
        className="bg-gradient-to-b from-cream to-cream-warm/50 px-4 py-16 sm:py-20"
      >
        <div className="mx-auto max-w-6xl">
          <SectionHeading
            label="Categories"
            title="Explore Our Menu"
            subtitle="Discover authentic Telugu flavors from our curated menu"
          />
          <div className="mt-10 text-center text-maroon-deep/70">
            <UtensilsCrossed className="mx-auto h-16 w-16 text-saffron-deep/40" />
            <p className="mt-4 text-lg">No categories available</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      id="categories"
      className="bg-gradient-to-b from-cream to-cream-warm/50 px-4 py-16 sm:py-20"
    >
      <div className="mx-auto max-w-6xl">
        <SectionHeading
          label="Categories"
          title="Explore Our Menu"
          subtitle="Discover authentic Telugu flavors from our curated menu"
        />

        {/* Category Cards Grid */}
        <div className="mt-10 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {categories.map((category, index) => (
            <motion.div
              key={category.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.05 }}
              className="group"
            >
              <Link
                to={`/customer/menu`}
                className="block relative overflow-hidden rounded-xl border border-gold/30 bg-cream shadow-sm hover:shadow-md transition-all hover:-translate-y-1"
              >
                {/* Category Image */}
                <div className="aspect-square overflow-hidden bg-cream">
                  {category.image_url ? (
                    <img
                      src={category.image_url}
                      alt={category.category_name}
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-110"
                      loading="lazy"
                    />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-gold/10 to-saffron/10">
                      <UtensilsCrossed className="h-12 w-12 text-gold/30" />
                    </div>
                  )}
                </div>
                
                {/* Category Name Overlay */}
                <div className="absolute bottom-0 left-0 right-0 p-3 text-center bg-gradient-to-t from-black/70 via-black/40 to-transparent">
                  <p className="text-sm font-semibold text-cream">
                    {category.category_name}
                  </p>
                  <p className="text-[10px] text-cream/70 mt-0.5">
                    View Menu →
                  </p>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>

        {/* View Full Menu Button */}
        <div className="mt-12 text-center">
          <Link
            to="/customer/menu"
            className="inline-flex items-center gap-2 rounded-full bg-maroon px-8 py-3.5 text-sm font-medium text-cream transition hover:bg-maroon-deep shadow-lg shadow-maroon/20"
          >
            View Full Menu
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────  Section 5: Outlets  ───────────────────────── */

/* ─────────────────────────  Section 5: Outlets (Supabase Powered)  ───────────────────────── */

function Outlets() {
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOutlets();
  }, []);

  const loadOutlets = async () => {
    try {
      setLoading(true);
      const data = await outletService.getOutlets();
      setOutlets(data);
    } catch (error) {
      console.error("Error loading outlets:", error);
      toast.error("Failed to load outlets");
    } finally {
      setLoading(false);
    }
  };

  const getDefaultImage = (index: number) => {
    // Use different default images based on index
    const images = [outlet1, outlet2, outlet1];
    return images[index % images.length];
  };

  if (loading) {
    return (
      <section id="outlets" className="px-5 py-20 sm:py-24">
        <div className="mx-auto max-w-6xl">
          <SectionHeading
            label="Outlet Locations"
            title="Find Us Across The Telugu States"
          />
          <div className="mt-12 flex items-center justify-center py-12">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-saffron-deep border-t-transparent" />
          </div>
        </div>
      </section>
    );
  }

  if (outlets.length === 0) {
    return (
      <section id="outlets" className="px-5 py-20 sm:py-24">
        <div className="mx-auto max-w-6xl">
          <SectionHeading
            label="Outlet Locations"
            title="Find Us Across The Telugu States"
          />
          <div className="mt-12 text-center text-maroon-deep/70">
            <MapPin className="mx-auto h-16 w-16 text-saffron-deep/40" />
            <p className="mt-4 text-lg">No outlets available</p>
            <p className="text-sm">Please check back later</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="outlets" className="px-5 py-20 sm:py-24">
      <div className="mx-auto max-w-6xl">
        <SectionHeading
          label="Outlet Locations"
          title="Find Us Across The Telugu States"
        />
        <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {outlets.map((outlet, index) => {
            const isOpen = outletService.isOutletOpen(outlet);
            const timeRange = outletService.formatTimeRange(outlet);
            const imageUrl = outlet.image_url || getDefaultImage(index);
            
            return (
              <motion.div
                key={outlet.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="overflow-hidden rounded-3xl border border-gold/30 bg-cream shadow-md hover:shadow-lg transition-shadow"
              >
                <div className="relative aspect-[4/3] overflow-hidden">
                  <img
                    src={imageUrl}
                    alt={outlet.outlet_name}
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                  <div className={`absolute left-3 top-3 inline-flex items-center gap-1 rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-wider ${
                    isOpen 
                      ? "bg-green-100 text-green-700" 
                      : "bg-red-100 text-red-700"
                  }`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${
                      isOpen ? "bg-green-600" : "bg-red-600"
                    }`} />
                    {isOpen ? "Open Now" : "Closed"}
                  </div>
                </div>
                <div className="p-5">
                  <h3 className="text-display text-lg text-maroon">
                    {outlet.outlet_name}
                  </h3>
                  
                  {outlet.address && (
                    <p className="mt-2 flex items-start gap-2 text-sm text-maroon-deep/75">
                      <MapPin className="mt-0.5 h-4 w-4 flex-shrink-0 text-saffron-deep" />
                      <span>{outlet.address}</span>
                    </p>
                  )}
                  
                  {(outlet.city || outlet.state) && (
                    <p className="mt-1 text-sm text-maroon-deep/60 pl-6">
                      {[outlet.city, outlet.state].filter(Boolean).join(', ')}
                    </p>
                  )}
                  
                  <p className="mt-2 flex items-center gap-2 text-sm text-maroon-deep/75">
                    <Clock className="h-4 w-4 text-saffron-deep" />
                    {timeRange}
                  </p>
                  
                  {outlet.phone && (
                    <p className="mt-1 text-sm text-maroon-deep/60">
                      📞 {outlet.phone}
                    </p>
                  )}
                  
                  <Link
                    to="/customer/outlets"
                    className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full bg-maroon px-5 py-2.5 text-sm font-medium text-cream transition hover:bg-maroon-deep"
                  >
                    Order from this outlet
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────  Section 6: Reviews  ───────────────────────── */

const reviews = [
  {
    name: "Lakshmi Priya",
    city: "Hyderabad",
    quote:
      "The avakaya tastes exactly like my grandmother used to make. Every jar feels like a memory from home.",
    rating: 5,
  },
  {
    name: "Ravi Teja",
    city: "Bengaluru",
    quote:
      "Best Hyderabadi biryani I've had outside of Hyderabad. The kebabs and mirchi ka salan are unmatched.",
    rating: 5,
  },
  {
    name: "Anitha Reddy",
    city: "Vijayawada",
    quote:
      "Their gongura pachadi and bobbatlu got delivered fresh for Sankranti. Family loved every bite.",
    rating: 5,
  },
  {
    name: "Sridhar Rao",
    city: "Visakhapatnam",
    quote:
      "Pesarattu and upma in the morning, biryani at lunch — this is true Telugu hospitality, digitally delivered.",
    rating: 5,
  },
];

function Reviews() {
  const [i, setI] = useState(0);
  const next = () => setI((p) => (p + 1) % reviews.length);
  const prev = () => setI((p) => (p - 1 + reviews.length) % reviews.length);
  const r = reviews[i];
  return (
    <section
      id="reviews"
      className="relative overflow-hidden bg-gradient-to-b from-maroon-deep to-maroon px-5 py-20 text-cream sm:py-24"
    >
      <div className="pointer-events-none absolute inset-0 opacity-10">
        <div className="absolute -left-20 top-10 h-80 w-80 rounded-full bg-saffron blur-3xl" />
        <div className="absolute -right-20 bottom-10 h-80 w-80 rounded-full bg-gold blur-3xl" />
      </div>
      <div className="relative mx-auto max-w-3xl text-center">
        <div className="flex items-center justify-center gap-3 text-gold">
          <span className="h-px w-8 bg-current opacity-60" />
          <span className="text-[10px] font-semibold uppercase tracking-[0.35em]">
            Customer Stories
          </span>
          <span className="h-px w-8 bg-current opacity-60" />
        </div>
        <h2 className="text-display mt-3 text-3xl leading-tight sm:text-4xl">
          Loved by Telugu Families
          <span className="block font-script text-4xl text-gold sm:text-5xl">
            Across the World
          </span>
        </h2>

        <motion.figure
          key={r.name}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mt-10 rounded-3xl border border-gold/30 bg-cream/5 p-8 backdrop-blur-sm sm:p-10"
        >
          <div className="flex justify-center gap-1 text-gold">
            {Array.from({ length: r.rating }).map((_, k) => (
              <Star key={k} className="h-4 w-4 fill-current" />
            ))}
          </div>
          <blockquote className="text-display mt-5 text-xl leading-relaxed text-cream sm:text-2xl">
            “{r.quote}”
          </blockquote>
          <figcaption className="mt-6 text-sm text-cream/70">
            <span className="font-semibold text-cream">{r.name}</span>
            <span className="mx-2 text-gold">·</span>
            {r.city}
          </figcaption>
        </motion.figure>

        <div className="mt-6 flex items-center justify-center gap-4">
          <button
            onClick={prev}
            aria-label="Previous"
            className="grid h-10 w-10 place-items-center rounded-full border border-gold/40 text-cream transition hover:bg-cream/10"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div className="flex gap-2">
            {reviews.map((_, k) => (
              <button
                key={k}
                onClick={() => setI(k)}
                aria-label={`Review ${k + 1}`}
                className={`h-1.5 rounded-full transition-all ${
                  k === i ? "w-8 bg-gold" : "w-2 bg-cream/30"
                }`}
              />
            ))}
          </div>
          <button
            onClick={next}
            aria-label="Next"
            className="grid h-10 w-10 place-items-center rounded-full border border-gold/40 text-cream transition hover:bg-cream/10"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────  Section 7: CTA  ───────────────────────── */

function CTA() {
  return (
    <section id="cta" className="px-5 py-20 sm:py-24">
      <div
        className="relative mx-auto max-w-5xl overflow-hidden rounded-[2rem] border border-gold/40 p-8 text-center sm:p-14"
        style={{
          background:
            "linear-gradient(135deg, oklch(0.96 0.04 85) 0%, oklch(0.88 0.1 70) 100%)",
        }}
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-20 mix-blend-multiply"
          style={{
            backgroundImage: `url(${heroThali})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        <div className="relative">
          <div className="mx-auto flex w-fit gap-3">
            <img
              src={kostaLogo}
              alt="Kosta Rajula Ruchulu"
              className="h-14 w-14 rounded-full bg-cream object-contain ring-2 ring-gold/40"
            />
            <img
              src={theeyagaLogo}
              alt="Theeyaga-Kaaranga"
              className="h-14 w-14 rounded-full bg-cream object-contain ring-2 ring-gold/40"
            />
          </div>
          <h2 className="text-display mt-6 text-3xl leading-tight text-maroon sm:text-5xl">
            Bringing Telugu Tradition
            <span className="block font-script text-4xl text-saffron-deep sm:text-6xl">
              To Your Doorstep
            </span>
          </h2>
          <p className="mx-auto mt-4 max-w-md text-sm text-maroon-deep/80 sm:text-base">
            From restaurant kitchens to heritage pantries — one Telugu food
            ecosystem, two beloved brands.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              to="/customer/menu"
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-maroon px-7 py-3.5 text-sm font-medium text-cream shadow-lg shadow-maroon/20 transition hover:bg-maroon-deep sm:w-auto"
            >
              <UtensilsCrossed className="h-4 w-4" /> Order Food
            </Link>
            <Link
              to="/brands"
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-saffron-deep px-7 py-3.5 text-sm font-medium text-cream shadow-lg shadow-saffron-deep/30 transition hover:bg-maroon sm:w-auto"
            >
              <ShoppingBag className="h-4 w-4" /> Shop Snacks & Pickles
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────  Footer  ───────────────────────── */

function Footer() {
  const cols = [
    { title: "Explore", links: ["About Us", "Outlets", "Brands", "Careers"] },
    { title: "Support", links: ["Contact", "Order Tracking", "FAQ", "Shipping"] },
    {
      title: "Legal",
      links: ["Privacy Policy", "Terms of Service", "Refund Policy"],
    },
  ];
  return (
    <footer className="bg-maroon-deep px-5 pb-8 pt-16 text-cream/85">
      <div className="mx-auto max-w-6xl">
        <div className="flex justify-center text-gold/40">
          <OrnamentalBorder className="h-3 w-56" />
        </div>
        <div className="mt-10 grid gap-10 md:grid-cols-4">
          <div>
            <Link to="/" className="flex items-center gap-2">
              <img
                src={headerLogo}
                alt="Telugu Food Club"
                className="h-12 w-auto object-contain"
              />
            </Link>
            <p className="mt-4 text-sm text-cream/70">
              A premium Telugu food ecosystem celebrating the heritage of Andhra
              & Telangana — one meal, one jar at a time.
            </p>
          </div>

          {cols.map((c) => (
            <div key={c.title}>
              <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-gold">
                {c.title}
              </p>
              <ul className="mt-4 space-y-2 text-sm">
                {c.links.map((l) => (
                  <li key={l}>
                    <a
                      href="#"
                      className="text-cream/75 transition hover:text-gold"
                    >
                      {l}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-gold/20 pt-6 text-xs text-cream/60 sm:flex-row">
          <p>© {new Date().getFullYear()} Telugu Food Club. All rights reserved.</p>
          <div className="flex gap-4">
            {["Instagram", "Facebook", "YouTube", "WhatsApp"].map((s) => (
              <a key={s} href="#" className="hover:text-gold">
                {s}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}

/* ─────────────────────────  Page  ───────────────────────── */

function Landing() {
  return (
    <div className="min-h-screen bg-cream text-maroon-deep">
      <Navbar />
      <Hero />
      <Categories />
      <Brands />
      <Why />
      <Outlets />
      <Reviews />
      <CTA />
      <Footer />
    </div>
  );
}

export default Landing;