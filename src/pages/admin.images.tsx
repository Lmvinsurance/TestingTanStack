;
import { useMemo, useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Search, Plus, X, Upload, Star, Trash2, Loader2, AlertTriangle, ImageIcon, Inbox, AlertCircle, RefreshCcw } from "lucide-react";
import { useServerFn } from "@/lib/react-start-mock";
import { toast } from "sonner";
import { AdminGuard } from "@/components/admin/AdminGuard";
import { AdminHeader, AdminBottomNav, AdminPage, StatCard, Chip } from "@/components/admin/AdminShell";
import { supabase } from "@/integrations/supabase/client";
import {
  listAdminImages,
  createAdminImage,
  setPrimaryAdminImage,
  replaceAdminImage,
  deleteAdminImage,
} from "@/lib/admin-images.functions";



const BUCKET = "menu-item-images";

type ImageRow = { id: string; item_id: string; image_url: string; is_primary: boolean; display_order: number; created_at: string };
type ItemRow = { id: string; item_name: string; category_id: string | null; is_active: boolean };

async function uploadFile(itemId: string, file: File): Promise<string> {
  const clean = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `items/${itemId}/${Date.now()}-${clean}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type,
  });
  if (error) throw new Error(error.message);
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

function ImagesAdmin() {
  const replace = useServerFn(replaceAdminImage);
  const remove = useServerFn(deleteAdminImage);

  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await list();
      setData(res);
    } catch (err: any) {
      setError(err);
    } finally {
      setIsLoading(false);
    }
  }, [list]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"All" | "Primary" | "Gallery" | "Missing" | "Recent">("All");
  const [uploadFor, setUploadFor] = useState<string | "">(""); // item_id
  const [uploadOpen, setUploadOpen] = useState(false);
  const [galleryFor, setGalleryFor] = useState<string | null>(null);
  const [confirmDel, setConfirmDel] = useState<ImageRow | null>(null);
  const [replaceFor, setReplaceFor] = useState<ImageRow | null>(null);
  const [working, setWorking] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const replaceInput = useRef<HTMLInputElement>(null);

  const items = (data?.items ?? []) as ItemRow[];
  const images = (data?.images ?? []) as ImageRow[];
  const itemsById = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);

  const grouped = useMemo(() => {
    const needle = search.trim().toLowerCase();
    const map = new Map<string, ImageRow[]>();
    images.forEach((img) => {
      const arr = map.get(img.item_id) ?? [];
      arr.push(img);
      map.set(img.item_id, arr);
    });
    let groups = Array.from(map.entries()).map(([itemId, imgs]) => ({
      item: itemsById.get(itemId),
      itemId,
      imgs,
    }));
    if (needle) groups = groups.filter((g) => g.item?.item_name.toLowerCase().includes(needle));
    if (filter === "Primary") groups = groups.map((g) => ({ ...g, imgs: g.imgs.filter((i) => i.is_primary) })).filter((g) => g.imgs.length);
    if (filter === "Gallery") groups = groups.map((g) => ({ ...g, imgs: g.imgs.filter((i) => !i.is_primary) })).filter((g) => g.imgs.length);
    if (filter === "Recent") {
      const week = Date.now() - 7 * 86400000;
      groups = groups.map((g) => ({ ...g, imgs: g.imgs.filter((i) => new Date(i.created_at).getTime() > week) })).filter((g) => g.imgs.length);
    }
    return groups;
  }, [images, itemsById, search, filter]);

  const missing = useMemo(() => {
    const have = new Set(images.map((i) => i.item_id));
    return items.filter((i) => i.is_active && !have.has(i.id));
  }, [items, images]);

  const totals = {
    total: images.length,
    primary: images.filter((i) => i.is_primary).length,
    items: new Set(images.map((i) => i.item_id)).size,
    missing: missing.length,
  };

  const role = data?.role;
  const canManage = role === "super_admin";

  const handleUpload = async (file: File, isPrimary: boolean) => {
    if (!uploadFor) return toast.error("Select an item");
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) return toast.error("Only JPG, PNG, WEBP");
    if (file.size > 5 * 1024 * 1024) return toast.error("Max 5MB");
    setWorking(true);
    try {
      const url = await uploadFile(uploadFor, file);
      await create({ data: { item_id: uploadFor, image_url: url, is_primary: isPrimary, display_order: 0 } });
      toast.success("Image uploaded");
      setUploadOpen(false);
      setUploadFor("");
      await loadData();
    } catch (e: any) {
      const msg = e?.message ?? "Upload failed";
      toast.error(msg.includes("Bucket not found") ? "Bucket 'menu-item-images' missing — create it in Supabase Storage." : msg);
    } finally {
      setWorking(false);
    }
  };

  const handleReplace = async (file: File) => {
    if (!replaceFor) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) return toast.error("Only JPG, PNG, WEBP");
    if (file.size > 5 * 1024 * 1024) return toast.error("Max 5MB");
    setWorking(true);
    try {
      const url = await uploadFile(replaceFor.item_id, file);
      await replace({ data: { id: replaceFor.id, image_url: url } });
      toast.success("Image replaced");
      setReplaceFor(null);
      await loadData();
    } catch (e: any) {
      toast.error(e?.message ?? "Replace failed");
    } finally {
      setWorking(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDel) return;
    try {
      await remove({ data: { id: confirmDel.id } });
      toast.success("Image deleted");
      setConfirmDel(null);
      await loadData();
    } catch (e: any) {
      toast.error(e?.message ?? "Delete failed");
    }
  };

  const handleSetPrimary = async (img: ImageRow) => {
    try {
      await setPrimary({ data: { id: img.id, item_id: img.item_id } });
      toast.success("Set as primary");
      await loadData();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed");
    }
  };

  const galleryItem = galleryFor ? itemsById.get(galleryFor) : null;
  const galleryImages = galleryFor ? images.filter((i) => i.item_id === galleryFor) : [];

  return (
    <AdminPage>
      <AdminHeader title="Item Images" subtitle="Upload and manage food and product photos" back="/admin/items" />

      <div className="mx-auto max-w-md space-y-4 px-4 py-4 sm:max-w-lg">
        <div className="grid grid-cols-2 gap-2">
          <StatCard label="Total Images" value={totals.total} tone="saffron" />
          <StatCard label="Primary" value={totals.primary} tone="emerald" />
          <StatCard label="Items w/ Images" value={totals.items} tone="maroon" />
          <StatCard label="Missing" value={totals.missing} tone="amber" />
        </div>

        {role && role !== "super_admin" && (
          <div className="rounded-2xl border border-amber-300 bg-amber-50 p-3 text-[11px] text-amber-800">
            Read-only access. Only super_admin can upload, replace or delete images.
          </div>
        )}

        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-maroon-deep/40" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search item name" className="w-full rounded-2xl border border-gold/30 bg-card py-2.5 pl-9 pr-3 text-xs focus:border-saffron focus:outline-none" />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {(["All", "Primary", "Gallery", "Missing", "Recent"] as const).map((f) => (
            <Chip key={f} active={filter === f} onClick={() => setFilter(f)}>{f}</Chip>
          ))}
        </div>

        {isLoading && (
          <div className="grid place-items-center py-10 text-maroon"><Loader2 className="h-6 w-6 animate-spin" /></div>
        )}
        {!!error && (
          <div className="rounded-2xl border border-red-300 bg-red-50 p-4 text-center text-sm text-red-700">
            <AlertCircle className="mx-auto mb-2 h-5 w-5" />
            {error?.message || "Failed to load images"}
            <button onClick={() => loadData()} className="mt-2 rounded-full bg-red-600 px-3 py-1 text-[11px] text-white">Retry</button>
          </div>
        )}

        {filter === "Missing" || missing.length > 0 ? (
          <section className="rounded-2xl border border-red-200 bg-red-50/60 p-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-700" />
              <p className="text-xs font-bold text-red-800">Items Without Images ({missing.length})</p>
            </div>
            <div className="mt-2 space-y-1.5">
              {missing.slice(0, 6).map((it) => (
                <div key={it.id} className="flex items-center justify-between rounded-xl bg-cream/70 px-3 py-2 text-[11px]">
                  <span className="truncate text-maroon">{it.item_name}</span>
                  {canManage && (
                    <button onClick={() => { setUploadFor(it.id); setUploadOpen(true); }} className="rounded-full bg-saffron px-2 py-1 text-[10px] font-bold text-cream">Upload</button>
                  )}
                </div>
              ))}
              {missing.length > 6 && <p className="text-[10px] text-red-700">+{missing.length - 6} more</p>}
            </div>
          </section>
        ) : null}

        {!isLoading && grouped.length === 0 && (
          <div className="rounded-2xl border border-gold/30 bg-card p-8 text-center text-maroon-deep/60">
            <Inbox className="mx-auto mb-2 h-8 w-8" />
            <p className="text-sm">No images yet</p>
          </div>
        )}

        <div className="space-y-3">
          {grouped.map(({ itemId, item, imgs }) => {
            const primary = imgs.find((i) => i.is_primary) ?? imgs[0];
            return (
              <motion.div key={itemId} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="overflow-hidden rounded-3xl border border-gold/25 bg-card shadow-sm">
                <div className="relative h-44 bg-gradient-to-br from-saffron/30 to-gold/20">
                  {primary?.image_url ? (
                    <img src={primary.image_url} alt={item?.item_name ?? ""} className="absolute inset-0 h-full w-full object-cover" />
                  ) : (
                    <div className="absolute inset-0 grid place-items-center text-maroon/40"><ImageIcon className="h-12 w-12" /></div>
                  )}
                  {primary?.is_primary && (
                    <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-saffron px-2 py-1 text-[10px] font-bold text-cream shadow">
                      <Star className="h-2.5 w-2.5" /> Primary
                    </span>
                  )}
                  <span className="absolute right-3 top-3 rounded-full bg-cream/95 px-2 py-1 text-[10px] font-bold text-maroon shadow">{imgs.length} images</span>
                </div>
                <div className="p-3">
                  <h3 className="text-display text-sm text-maroon">{item?.item_name ?? "Unknown item"}</h3>
                  <p className="text-[10px] text-maroon-deep/60">{imgs.length} image{imgs.length === 1 ? "" : "s"}</p>
                  <div className="mt-2 grid grid-cols-2 gap-1.5">
                    <button onClick={() => setGalleryFor(itemId)} className="rounded-lg bg-saffron/15 py-1.5 text-[10px] font-semibold text-saffron-deep">View Gallery</button>
                    {canManage && (
                      <button onClick={() => { setUploadFor(itemId); setUploadOpen(true); }} className="rounded-lg border border-gold/40 py-1.5 text-[10px] font-semibold text-maroon">Upload</button>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {canManage && (
        <button onClick={() => { setUploadFor(""); setUploadOpen(true); }} className="fixed bottom-24 right-4 z-40 inline-flex items-center gap-2 rounded-full bg-gradient-to-br from-saffron to-saffron-deep px-5 py-3 text-sm font-semibold text-cream shadow-xl">
          <Plus className="h-4 w-4" /> Upload
        </button>
      )}

      <AdminBottomNav />

      <AnimatePresence>
        {galleryItem && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setGalleryFor(null)} className="fixed inset-0 z-50 bg-black/40" />
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 28 }} className="fixed inset-x-0 bottom-0 z-50 max-h-[90vh] overflow-y-auto rounded-t-3xl bg-cream p-5">
              <div className="mx-auto mb-3 h-1 w-12 rounded-full bg-gold/40" />
              <div className="flex items-center justify-between">
                <h2 className="text-display text-xl text-maroon">{galleryItem.item_name}</h2>
                <button onClick={() => setGalleryFor(null)} className="grid h-9 w-9 place-items-center rounded-full border border-gold/40"><X className="h-4 w-4" /></button>
              </div>
              {galleryImages.length === 0 ? (
                <p className="mt-4 text-center text-sm text-maroon-deep/60">No images</p>
              ) : (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {galleryImages.map((img) => (
                    <div key={img.id} className="overflow-hidden rounded-2xl border border-gold/25 bg-card">
                      <div className="relative h-32 bg-gradient-to-br from-saffron/20 to-gold/10">
                        <img src={img.image_url} alt="" className="absolute inset-0 h-full w-full object-cover" />
                        {img.is_primary && (
                          <span className="absolute left-1.5 top-1.5 rounded-full bg-saffron px-1.5 py-0.5 text-[9px] font-bold text-cream">Primary</span>
                        )}
                      </div>
                      {canManage && (
                        <div className="grid grid-cols-3 gap-0.5 border-t border-gold/20 p-1.5 text-[9px] font-semibold">
                          {!img.is_primary && (
                            <button onClick={() => handleSetPrimary(img)} className="rounded py-1 text-saffron-deep" title="Set primary">
                              <Star className="mx-auto h-3 w-3" />
                            </button>
                          )}
                          <button onClick={() => { setReplaceFor(img); setTimeout(() => replaceInput.current?.click(), 50); }} className="rounded py-1 text-maroon">
                            <RefreshCcw className="mx-auto h-3 w-3" />
                          </button>
                          <button onClick={() => setConfirmDel(img)} className="rounded py-1 text-red-600">
                            <Trash2 className="mx-auto h-3 w-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          </>
        )}

        {uploadOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => !working && setUploadOpen(false)} className="fixed inset-0 z-50 bg-black/40" />
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 28 }} className="fixed inset-x-0 bottom-0 z-50 max-h-[90vh] overflow-y-auto rounded-t-3xl bg-cream p-5">
              <div className="mx-auto mb-3 h-1 w-12 rounded-full bg-gold/40" />
              <div className="flex items-center justify-between">
                <h2 className="text-display text-xl text-maroon">Upload Image</h2>
                <button onClick={() => !working && setUploadOpen(false)} className="grid h-9 w-9 place-items-center rounded-full border border-gold/40"><X className="h-4 w-4" /></button>
              </div>
              <div className="mt-4 space-y-3">
                <div>
                  <p className="mb-1 text-[10px] font-bold uppercase text-maroon-deep/60">Item</p>
                  <select value={uploadFor} onChange={(e) => setUploadFor(e.target.value)} className="w-full rounded-xl border border-gold/30 bg-card px-3 py-2.5 text-xs">
                    <option value="">Select item…</option>
                    {items.filter((i) => i.is_active).map((i) => (
                      <option key={i.id} value={i.id}>{i.item_name}</option>
                    ))}
                  </select>
                </div>
                <label htmlFor="img-upload" className="grid h-40 cursor-pointer place-items-center rounded-2xl border-2 border-dashed border-saffron/40 bg-saffron/5 text-center">
                  <div>
                    {working ? <Loader2 className="mx-auto h-8 w-8 animate-spin text-saffron-deep" /> : <Upload className="mx-auto h-8 w-8 text-saffron-deep" />}
                    <p className="mt-2 text-xs font-semibold text-maroon">{working ? "Uploading…" : "Tap to choose image"}</p>
                    <p className="text-[10px] text-maroon-deep/60">JPG, PNG, WEBP · max 5MB</p>
                  </div>
                </label>
                <input id="img-upload" ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleUpload(f, false);
                  e.target.value = "";
                }} />
                <p className="text-[10px] text-maroon-deep/60">Tip: set primary by tapping the star in gallery after upload.</p>
              </div>
            </motion.div>
          </>
        )}

        {replaceFor && (
          <input ref={replaceInput} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleReplace(f);
            e.target.value = "";
            if (!f) setReplaceFor(null);
          }} />
        )}

        {confirmDel && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setConfirmDel(null)} className="fixed inset-0 z-50 bg-black/40" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="fixed inset-x-4 top-1/2 z-50 -translate-y-1/2 rounded-3xl bg-cream p-5">
              <h3 className="text-display text-lg text-maroon">Delete image?</h3>
              <p className="mt-1 text-[12px] text-maroon-deep/70">This removes the database record and the file from Storage.</p>
              <div className="mt-4 flex gap-2">
                <button onClick={() => setConfirmDel(null)} className="flex-1 rounded-xl border border-gold/40 py-3 text-sm font-semibold text-maroon">Cancel</button>
                <button onClick={handleDelete} className="flex-1 rounded-xl bg-red-600 py-3 text-sm font-semibold text-white">Delete</button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </AdminPage>
  );
}

export default ImagesAdmin;
