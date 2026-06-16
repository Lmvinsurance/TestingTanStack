# Admin Dashboard — Modules CRUD & Bulk Upload

Build an admin-only dashboard area with single-record forms and bulk upload (CSV + XLSX) for the requested modules. Reuses the existing `admin_users` gate.

## Modules in scope

| # | Module | Single form | Bulk upload | Key dropdowns |
|---|--------|-------------|-------------|---------------|
| 1 | Outlets | ✅ | ✅ | — |
| 2 | Cuisine types | ✅ | ✅ | — |
| 3 | Dietary types | ✅ | ✅ | — |
| 4 | Menu categories | ✅ | ✅ | outlet |
| 5 | Menu subcategories | ✅ | ✅ | category |
| 6 | Menu items | ✅ | ✅ | category, subcategory, cuisine, dietary |
| 7 | Item variants | ✅ | ✅ | menu item |
| 8 | Addons | ✅ | ✅ | — |
| 9 | Item ↔ Addon mapping | ✅ | ✅ | item, addon |

Each module page supports: **Create**, **Edit** (inline row action), **Delete (soft where supported)**, **Bulk Upload**, **Download Template**.

## UX layout

```text
/admin                       → existing (login)
/admin/dashboard             → tiles linking to each module
/admin/dashboard/outlets
/admin/dashboard/cuisines
/admin/dashboard/dietary
/admin/dashboard/menu-categories
/admin/dashboard/menu-subcategories
/admin/dashboard/menu-items
/admin/dashboard/item-variants
/admin/dashboard/addons
/admin/dashboard/item-addons
```

Each module page:
- Header with "Add New" + "Download CSV Template" + "Download XLSX Template" + "Bulk Upload" buttons
- Data table (paginated, search) of existing rows with Edit / Delete
- Dialog form for create/edit with zod validation and dropdowns populated from related tables
- Bulk upload dialog: file picker → preview parsed rows → "Insert N rows" → toast of success/failure counts

## Technical approach

- **Auth**: existing admin_users login. Gate routes by checking `is_active_admin(auth.uid())` inside server fns; protected pages live under `_authenticated/admin/dashboard/*`.
- **Data layer**: TanStack Query + `createServerFn` with `requireSupabaseAuth`. Each module gets `list/create/update/delete/bulkInsert` server fns in `src/lib/admin/<module>.functions.ts`.
- **Forms**: react-hook-form + zod, shadcn Dialog + Form components. Dropdowns are async-loaded selects fed by sibling list fns.
- **CSV parsing**: `papaparse` (client-side). **XLSX**: `xlsx` (SheetJS) for template generation + parsing.
- **Templates**: generated on-the-fly per module with header row + 1 example row + (XLSX) a hidden "Reference" sheet listing valid IDs for FK columns.
- **Bulk insert**: validated row-by-row with zod on client, then sent in chunks of 500 to a `bulkInsert` server fn that uses `supabaseAdmin` (admin role already verified).
- **Stack**: no schema migrations needed — all tables already exist with proper RLS.

## Files to add

```text
src/routes/_authenticated/admin/dashboard.tsx          (layout w/ sidebar nav)
src/routes/_authenticated/admin/dashboard.index.tsx    (tile grid)
src/routes/_authenticated/admin/dashboard.$module.tsx  (single dynamic page, switches per module)
src/lib/admin/registry.ts                              (module config: schema, columns, template, fns)
src/lib/admin/<module>.functions.ts                    (9 files — server fns per table)
src/components/admin/ModulePage.tsx                    (reusable table + dialogs)
src/components/admin/RecordForm.tsx                    (reusable zod form)
src/components/admin/BulkUploadDialog.tsx              (CSV/XLSX parser + preview)
src/lib/admin/templates.ts                             (CSV/XLSX generators)
src/lib/admin/auth-admin.ts                            (middleware: requireSupabaseAuth + is_active_admin check)
```

## Out of scope (ask if you want them)

- Orders / payments / invoices management UI
- Image upload for menu items (uses URL field for now)
- Outlet variant pricing module
- Audit log viewer

After approval I'll ship modules 1–3 (Outlets, Cuisines, Dietary) first as a vertical slice, then 4–7 (menu hierarchy), then 8–9 (addons). Confirm and I'll proceed end-to-end in one go.