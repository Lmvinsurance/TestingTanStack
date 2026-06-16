import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import { ArrowLeft, ChevronRight } from "lucide-react";
import catPickles from "@/assets/cat-pickles.jpg";
import catSweets from "@/assets/cat-sweets.jpg";
import catSnacks from "@/assets/cat-snacks.jpg";
import catBiryani from "@/assets/cat-biryani.jpg";

export const Route = createFileRoute("/categories")({
  head: () => ({
    meta: [
      { title: "Shop Products — Telugu Food Club" },
      { name: "description", content: "Browse traditional Andhra pickles, sweets, snacks and gift packs from Theeyaga-Kaaranga." },
    ],
  }),
  component: CategoriesScreen,
});

const CATEGORIES = [
  {
    id: "pickles",
    name: "Andhra Pickles",
    tagline: "Gongura · Avakaya · Tomato · Mango",
    count: 24,
    image: catPickles,
  },
  {
    id: "sweets",
    name: "Traditional Sweets",
    tagline: "Ariselu · Pootharekulu · Kajjikayalu · Laddu",
    count: 18,
    image: catSweets,
  },
  {
    id: "snacks",
    name: "Spicy Snacks",
    tagline: "Chekkalu · Murukulu · Sakinalu · Ribbon Pakoda",
    count: 22,
    image: catSnacks,
  },
  {
    id: "gifts",
    name: "Gift Packs",
    tagline: "Festive hampers · Mixed combos · Corporate gifting",
    count: 8,
    image: catBiryani,
  },
];

function CategoryCard({
  name,
  tagline,
  count,
  image,
  index,
}: {
  name: string;
  tagline: string;
  count: number;
  image: string;
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      whileHover={{ y: -3 }}
      whileTap={{ scale: 0.98 }}
      className="group relative cursor-pointer overflow-hidden rounded-2xl border border-gold/25 shadow-sm transition hover:border-gold/40 hover:shadow-md"
    >
      <div className="relative aspect-[16/10] overflow-hidden">
        <img
          src={image}
          alt={name}
          className="h-full w-full object-cover transition duration-700 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-maroon-deep/80 via-maroon-deep/30 to-transparent" />
      </div>
      <div className="absolute inset-x-0 bottom-0 p-4">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-display text-lg text-cream">{name}</p>
            <p className="mt-0.5 text-[11px] text-cream/70">{tagline}</p>
          </div>
          <div className="flex items-center gap-1 text-cream/80">
            <span className="text-[11px] font-medium">{count} items</span>
            <ChevronRight className="h-4 w-4" />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function CategoriesScreen() {
  return (
    <main className="min-h-screen bg-cream">
      <motion.header
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3 border-b border-gold/20 px-5 py-4"
      >
        <Link
          to="/brands"
          className="grid h-10 w-10 place-items-center rounded-full border border-gold/40 text-maroon transition hover:bg-cream-warm/50"
          aria-label="Back"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-display text-lg text-maroon">Shop Products</h1>
          <p className="text-[11px] text-maroon-deep/60">Theeyaga-Kaaranga</p>
        </div>
      </motion.header>

      <div className="mx-auto max-w-md px-5 py-6 sm:max-w-lg">
        <div className="flex flex-col gap-4">
          {CATEGORIES.map((cat, i) => (
            <CategoryCard key={cat.id} {...cat} index={i} />
          ))}
        </div>
      </div>
    </main>
  );
}
