// /api/projects — daftar / buat project, buat undangan, tebus undangan
// GET                                → daftar project milik user (bootstrap otomatis)
// POST { name }                      → buat project baru milik sendiri
// POST { action:"invite" }           → buat link undangan utk project (header X-Project-Id)
// POST { action:"redeem", token }    → masuk project lewat link undangan
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { supabase, requireUser, listProjects, isMember, projectFrom, inviteToken, requireProject } from "razeo-shared";

// default nama event CTA (harus sama dengan DEFAULT_EV di App.tsx)
const DEFAULT_CTAS = ["click_cta_article", "click_cta_ke_produk", "purchase"];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const user = await requireUser(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  try {
    if (req.method === "GET") {
      const projects = await listProjects(user.uid);
      return res.status(200).json({ projects });
    }

    if (req.method === "POST") {
      const body = req.body || {};
      const action = String(body.action || "").trim();

      // --- tebus link undangan (masuk project sebagai anggota) ---
      if (action === "redeem") {
        const token = String(body.token || "").trim();
        if (!token) return res.status(400).json({ error: "Token undangan kosong" });
        const { data: inv, error } = await supabase
          .from("invitations")
          .select("id, project_id, expires_at, revoked_at, projects(name)")
          .eq("token", token)
          .maybeSingle();
        if (error) throw error;
        if (!inv) return res.status(404).json({ error: "Link undangan tidak ditemukan" });
        const rows: any = Array.isArray((inv as any).projects) ? (inv as any).projects[0] : (inv as any).projects;
        if ((inv as any).revoked_at) return res.status(410).json({ error: "Undangan sudah dibatalkan" });
        if (new Date((inv as any).expires_at) < new Date()) {
          return res.status(410).json({ error: "Undangan sudah kedaluwarsa" });
        }
        const { data: existing } = await supabase
          .from("project_members")
          .select("project_id")
          .eq("project_id", (inv as any).project_id)
          .eq("uid", user.uid)
          .maybeSingle();
        if (!existing) {
          const { error: e2 } = await supabase
            .from("project_members")
            .insert({ project_id: (inv as any).project_id, uid: user.uid, role: "member" });
          if (e2) throw e2;
        }
        return res.status(200).json({
          project_id: (inv as any).project_id,
          name: rows?.name || null,
          joined: !existing,
        });
      }

      // --- buat undangan utk project aktif ---
      if (action === "invite") {
        const projectId = projectFrom(req);
        const role = await isMember(user.uid, projectId);
        if (!role) return res.status(404).json({ error: "Bukan anggota project ini" });
        if (role !== "owner") {
          return res.status(403).json({ error: "Hanya pemilik project yang bisa mengundang" });
        }
        const { data, error } = await supabase
          .from("invitations")
          .insert({ project_id: projectId, token: inviteToken(), created_by: user.uid })
          .select("id, token, expires_at, created_at")
          .single();
        if (error) throw error;
        return res.status(201).json({ invitation: data });
      }

      // --- hapus project (HANYA pemilik project) ---
      if (action === "delete") {
        const info = await requireProject(user.uid, req);
        if (!info) return res.status(404).json({ error: "Bukan anggota project ini" });
        if (info.role !== "owner") return res.status(403).json({ error: "Hanya pemilik project yang boleh menghapus" });
        const { error } = await supabase
          .from("projects")
          .delete()
          .eq("id", info.projectId)
          .eq("owner_uid", user.uid);
        if (error) {
          console.error("delete project error:", error.message);
          return res.status(409).json({ error: "Gagal hapus project: " + error.message });
        }
        return res.status(200).json({ deleted: true, id: info.projectId });
      }

      // --- tab KONTEN: daftar konten project (siapa pun anggota boleh baca) ---
      if (action === "content-list") {
        const info = await requireProject(user.uid, req);
        if (!info) return res.status(404).json({ error: "Bukan anggota project ini" });
        const { data, error } = await supabase
          .from("content_items")
          .select("*")
          .eq("project_id", info.projectId)
          .order("created_at", { ascending: false });
        if (error) throw error;
        return res.status(200).json({ items: data || [] });
      }

      // --- tab KONTEN: tambah baris ---
      if (action === "content-add") {
        const info = await requireProject(user.uid, req);
        if (!info) return res.status(404).json({ error: "Bukan anggota project ini" });
        const row = {
          project_id: info.projectId,
          uid: user.uid,
          kategori: body.kategori ? String(body.kategori).trim().slice(0, 80) : null,
          meta_deskripsi: body.meta_deskripsi ? String(body.meta_deskripsi).trim().slice(0, 320) : null,
          target_keyword: body.target_keyword ? String(body.target_keyword).trim().slice(0, 200) : null,
          judul: String(body.judul || "").trim().slice(0, 300),
          tanggal_publikasi: body.tanggal_publikasi ? String(body.tanggal_publikasi).slice(0, 10) : null,
          link_artikel: body.link_artikel ? String(body.link_artikel).trim().slice(0, 2048) : null,
          internal_link: body.internal_link ? String(body.internal_link).trim().slice(0, 8000) : null,
          isi_artikel: body.isi_artikel ? String(body.isi_artikel).trim() : null,
          peran: body.peran ? String(body.peran).trim().slice(0, 80) : null,
          prioritas: ["rendah", "sedang", "tinggi"].includes(String(body.prioritas)) ? String(body.prioritas) : "sedang",
        };
        if (!row.judul) return res.status(400).json({ error: "Judul wajib diisi" });
        const { data, error } = await supabase.from("content_items").insert(row).select().single();
        if (error) {
          if (String(error.message).includes("relation") || error.code === "42P01")
            return res.status(500).json({ error: "Tabel content_items belum ada — jalankan migrasi SQL 0004 di Supabase" });
          if (error.code === "42703" && String(error.message).includes("isi_artikel"))
            return res.status(500).json({ error: "Kolom isi_artikel belum ada — jalankan migrasi SQL 0012 di Supabase" });
          if (error.code === "42703" || String(error.message).includes("internal_link"))
            return res.status(500).json({ error: "Kolom internal_link belum ada — jalankan migrasi SQL 0008 di Supabase" });
          throw error;
        }
        return res.status(201).json({ item: data });
      }

      // --- tab KONTEN: ubah baris ---
      if (action === "content-update") {
        const info = await requireProject(user.uid, req);
        if (!info) return res.status(404).json({ error: "Bukan anggota project ini" });
        const id = String(body.id || "");
        if (!id) return res.status(400).json({ error: "id wajib diisi" });
        const patchRow: any = { updated_at: new Date().toISOString() };
        if (body.kategori !== undefined) patchRow.kategori = body.kategori ? String(body.kategori).trim() : null;
        if (body.meta_deskripsi !== undefined) patchRow.meta_deskripsi = body.meta_deskripsi ? String(body.meta_deskripsi).trim() : null;
        if (body.target_keyword !== undefined) patchRow.target_keyword = body.target_keyword ? String(body.target_keyword).trim() : null;
        if (body.judul !== undefined) patchRow.judul = String(body.judul || "").trim();
        if (body.tanggal_publikasi !== undefined) patchRow.tanggal_publikasi = body.tanggal_publikasi || null;
        if (body.link_artikel !== undefined) patchRow.link_artikel = body.link_artikel || null;
        if (body.internal_link !== undefined) patchRow.internal_link = body.internal_link ? String(body.internal_link).trim() : null;
        if (body.isi_artikel !== undefined) patchRow.isi_artikel = body.isi_artikel ? String(body.isi_artikel).trim().slice(0, 600000) : null;
        if (body.peran !== undefined) patchRow.peran = body.peran || null;
        if (body.prioritas !== undefined) patchRow.prioritas = ["rendah", "sedang", "tinggi"].includes(String(body.prioritas)) ? String(body.prioritas) : "sedang";
        if (patchRow.judul === "") return res.status(400).json({ error: "Judul tidak boleh kosong" });
        const { data, error } = await supabase
          .from("content_items")
          .update(patchRow)
          .eq("id", id)
          .eq("project_id", info.projectId) // batasi ke project ini saja
          .select()
          .single();
        if (error) throw error;
        return res.status(200).json({ item: data });
      }

      // --- tab KONTEN: hapus baris ---
      if (action === "content-delete") {
        const info = await requireProject(user.uid, req);
        if (!info) return res.status(404).json({ error: "Bukan anggota project ini" });
        const id = String(body.id || "");
        if (!id) return res.status(400).json({ error: "id wajib diisi" });
        const { error, count } = await supabase
          .from("content_items")
          .delete({ count: "exact" })
          .eq("id", id)
          .eq("project_id", info.projectId);
        if (error) throw error;
        if (!count) return res.status(404).json({ error: "Baris tidak ditemukan" });
        return res.status(200).json({ deleted: true });
      }

      // --- tab TASK: daftar tugas project (siapa pun anggota boleh baca) ---
      if (action === "task-list") {
        const info = await requireProject(user.uid, req);
        if (!info) return res.status(404).json({ error: "Bukan anggota project ini" });
        const { data, error } = await supabase
          .from("tasks")
          .select("*")
          .eq("project_id", info.projectId)
          .order("created_at", { ascending: false });
        if (error) {
          if (String(error.message).includes("relation") || error.code === "42P01")
            return res.status(500).json({ error: "Tabel tasks belum ada — jalankan migrasi SQL 0009 di Supabase" });
          throw error;
        }
        return res.status(200).json({ items: data || [] });
      }

      // --- tab TASK: tambah tugas ---
      if (action === "task-add") {
        const info = await requireProject(user.uid, req);
        if (!info) return res.status(404).json({ error: "Bukan anggota project ini" });
        const row = {
          project_id: info.projectId,
          uid: user.uid,
          nama_tugas: String(body.nama_tugas || "").trim().slice(0, 500),
          prioritas: ["rendah", "sedang", "tinggi"].includes(String(body.prioritas)) ? String(body.prioritas) : "sedang",
          status: ["rencana", "proses", "selesai"].includes(String(body.status)) ? String(body.status) : "rencana",
        };
        if (!row.nama_tugas) return res.status(400).json({ error: "Nama tugas wajib diisi" });
        const { data, error } = await supabase.from("tasks").insert(row).select().single();
        if (error) {
          if (String(error.message).includes("relation") || error.code === "42P01")
            return res.status(500).json({ error: "Tabel tasks belum ada — jalankan migrasi SQL 0009 di Supabase" });
          throw error;
        }
        return res.status(201).json({ item: data });
      }

      // --- tab TASK: ubah tugas (termasuk ubah cepat prioritas/status dari tabel) ---
      if (action === "task-update") {
        const info = await requireProject(user.uid, req);
        if (!info) return res.status(404).json({ error: "Bukan anggota project ini" });
        const id = String(body.id || "");
        if (!id) return res.status(400).json({ error: "id wajib diisi" });
        const patchRow: any = { updated_at: new Date().toISOString() };
        if (body.nama_tugas !== undefined) patchRow.nama_tugas = String(body.nama_tugas || "").trim().slice(0, 500);
        if (body.prioritas !== undefined) patchRow.prioritas = ["rendah", "sedang", "tinggi"].includes(String(body.prioritas)) ? String(body.prioritas) : "sedang";
        if (body.status !== undefined) patchRow.status = ["rencana", "proses", "selesai"].includes(String(body.status)) ? String(body.status) : "rencana";
        if (patchRow.nama_tugas === "") return res.status(400).json({ error: "Nama tugas tidak boleh kosong" });
        const { data, error } = await supabase
          .from("tasks")
          .update(patchRow)
          .eq("id", id)
          .eq("project_id", info.projectId) // batasi ke project ini saja
          .select()
          .single();
        if (error) throw error;
        return res.status(200).json({ item: data });
      }

      // --- tab TASK: hapus tugas ---
      if (action === "task-delete") {
        const info = await requireProject(user.uid, req);
        if (!info) return res.status(404).json({ error: "Bukan anggota project ini" });
        const id = String(body.id || "");
        if (!id) return res.status(400).json({ error: "id wajib diisi" });
        const { error, count } = await supabase
          .from("tasks")
          .delete({ count: "exact" })
          .eq("id", id)
          .eq("project_id", info.projectId);
        if (error) throw error;
        if (!count) return res.status(404).json({ error: "Baris tidak ditemukan" });
        return res.status(200).json({ deleted: true });
      }

      // --- tab KONTEN > sub-tab Produk: daftar produk project ---
      if (action === "product-list") {
        const info = await requireProject(user.uid, req);
        if (!info) return res.status(404).json({ error: "Bukan anggota project ini" });
        const { data, error } = await supabase
          .from("products")
          .select("*")
          .eq("project_id", info.projectId)
          .order("created_at", { ascending: false });
        if (error) {
          if (String(error.message).includes("relation") || error.code === "42P01")
            return res.status(500).json({ error: "Tabel products belum ada — jalankan migrasi SQL 0010 di Supabase" });
          throw error;
        }
        return res.status(200).json({ items: data || [] });
      }

      // --- tab KONTEN > sub-tab Produk: tambah ---
      if (action === "product-add") {
        const info = await requireProject(user.uid, req);
        if (!info) return res.status(404).json({ error: "Bukan anggota project ini" });
        const hargaRaw = body.harga;
        const row = {
          project_id: info.projectId,
          uid: user.uid,
          kategori: body.kategori ? String(body.kategori).trim().slice(0, 120) : null,
          nama_produk: String(body.nama_produk || "").trim().slice(0, 300),
          judul_produk: body.judul_produk ? String(body.judul_produk).trim().slice(0, 500) : null,
          link_artikel: body.link_artikel ? String(body.link_artikel).trim().slice(0, 2048) : null,
          link_shopee: body.link_shopee ? String(body.link_shopee).trim().slice(0, 2048) : null,
          harga: hargaRaw === null || hargaRaw === undefined || String(hargaRaw).trim() === "" ? null : Number(hargaRaw),
          tanggal_publikasi: body.tanggal_publikasi ? String(body.tanggal_publikasi).slice(0, 10) : null,
        };
        if (!row.nama_produk) return res.status(400).json({ error: "Nama produk wajib diisi" });
        if (row.harga != null && !Number.isFinite(row.harga)) return res.status(400).json({ error: "Harga harus angka" });
        const { data, error } = await supabase.from("products").insert(row).select().single();
        if (error) {
          if (String(error.message).includes("relation") || error.code === "42P01")
            return res.status(500).json({ error: "Tabel products belum ada — jalankan migrasi SQL 0010 di Supabase" });
          throw error;
        }
        return res.status(201).json({ item: data });
      }

      // --- tab KONTEN > sub-tab Produk: ubah ---
      if (action === "product-update") {
        const info = await requireProject(user.uid, req);
        if (!info) return res.status(404).json({ error: "Bukan anggota project ini" });
        const id = String(body.id || "");
        if (!id) return res.status(400).json({ error: "id wajib diisi" });
        const patchRow: any = { updated_at: new Date().toISOString() };
        if (body.kategori !== undefined) patchRow.kategori = body.kategori ? String(body.kategori).trim() : null;
        if (body.nama_produk !== undefined) patchRow.nama_produk = String(body.nama_produk || "").trim().slice(0, 300);
        if (body.judul_produk !== undefined) patchRow.judul_produk = body.judul_produk ? String(body.judul_produk).trim() : null;
        if (body.link_artikel !== undefined) patchRow.link_artikel = body.link_artikel ? String(body.link_artikel).trim() : null;
        if (body.link_shopee !== undefined) patchRow.link_shopee = body.link_shopee ? String(body.link_shopee).trim() : null;
        if (body.harga !== undefined) {
          if (body.harga === null || String(body.harga).trim() === "") patchRow.harga = null;
          else {
            patchRow.harga = Number(body.harga);
            if (!Number.isFinite(patchRow.harga)) return res.status(400).json({ error: "Harga harus angka" });
          }
        }
        if (body.tanggal_publikasi !== undefined) patchRow.tanggal_publikasi = body.tanggal_publikasi || null;
        if (patchRow.nama_produk === "") return res.status(400).json({ error: "Nama produk tidak boleh kosong" });
        const { data, error } = await supabase
          .from("products")
          .update(patchRow)
          .eq("id", id)
          .eq("project_id", info.projectId) // batasi ke project ini saja
          .select()
          .single();
        if (error) throw error;
        return res.status(200).json({ item: data });
      }

      // --- tab KONTEN > sub-tab Produk: hapus ---
      if (action === "product-delete") {
        const info = await requireProject(user.uid, req);
        if (!info) return res.status(404).json({ error: "Bukan anggota project ini" });
        const id = String(body.id || "");
        if (!id) return res.status(400).json({ error: "id wajib diisi" });
        const { error, count } = await supabase
          .from("products")
          .delete({ count: "exact" })
          .eq("id", id)
          .eq("project_id", info.projectId);
        if (error) throw error;
        if (!count) return res.status(404).json({ error: "Baris tidak ditemukan" });
        return res.status(200).json({ deleted: true });
      }

      // --- tab KONTEN > sub-tab Bundle: daftar (siapa pun anggota boleh baca) ---
      if (action === "bundle-list") {
        const info = await requireProject(user.uid, req);
        if (!info) return res.status(404).json({ error: "Bukan anggota project ini" });
        const { data, error } = await supabase
          .from("bundles")
          .select("*")
          .eq("project_id", info.projectId)
          .order("created_at", { ascending: false });
        if (error) {
          if (String(error.message).includes("relation") || error.code === "42P01")
            return res.status(500).json({ error: "Tabel bundles belum ada — jalankan migrasi SQL 0011 di Supabase" });
          throw error;
        }
        return res.status(200).json({ items: data || [] });
      }

      // --- tab KONTEN > sub-tab Bundle: tambah ---
      if (action === "bundle-add") {
        const info = await requireProject(user.uid, req);
        if (!info) return res.status(404).json({ error: "Bukan anggota project ini" });
        const row = {
          project_id: info.projectId,
          uid: user.uid,
          url_bundle: String(body.url_bundle || "").trim().slice(0, 2048),
          nama_bundle: String(body.nama_bundle || "").trim().slice(0, 300),
        };
        if (!row.url_bundle) return res.status(400).json({ error: "Url bundle wajib diisi" });
        if (!row.nama_bundle) return res.status(400).json({ error: "Nama bundle wajib diisi" });
        const { data, error } = await supabase.from("bundles").insert(row).select().single();
        if (error) {
          if (String(error.message).includes("relation") || error.code === "42P01")
            return res.status(500).json({ error: "Tabel bundles belum ada — jalankan migrasi SQL 0011 di Supabase" });
          throw error;
        }
        return res.status(201).json({ item: data });
      }

      // --- tab KONTEN > sub-tab Bundle: ubah ---
      if (action === "bundle-update") {
        const info = await requireProject(user.uid, req);
        if (!info) return res.status(404).json({ error: "Bukan anggota project ini" });
        const id = String(body.id || "");
        if (!id) return res.status(400).json({ error: "id wajib diisi" });
        const patchRow: any = { updated_at: new Date().toISOString() };
        if (body.url_bundle !== undefined) patchRow.url_bundle = String(body.url_bundle || "").trim().slice(0, 2048);
        if (body.nama_bundle !== undefined) patchRow.nama_bundle = String(body.nama_bundle || "").trim().slice(0, 300);
        if (!patchRow.url_bundle) return res.status(400).json({ error: "Url bundle tidak boleh kosong" });
        if (patchRow.nama_bundle === "") return res.status(400).json({ error: "Nama bundle tidak boleh kosong" });
        const { data, error } = await supabase
          .from("bundles")
          .update(patchRow)
          .eq("id", id)
          .eq("project_id", info.projectId) // batasi ke project ini saja
          .select()
          .single();
        if (error) throw error;
        return res.status(200).json({ item: data });
      }

      // --- tab KONTEN > sub-tab Bundle: hapus ---
      if (action === "bundle-delete") {
        const info = await requireProject(user.uid, req);
        if (!info) return res.status(404).json({ error: "Bukan anggota project ini" });
        const id = String(body.id || "");
        if (!id) return res.status(400).json({ error: "id wajib diisi" });
        const { error, count } = await supabase
          .from("bundles")
          .delete({ count: "exact" })
          .eq("id", id)
          .eq("project_id", info.projectId);
        if (error) throw error;
        if (!count) return res.status(404).json({ error: "Baris tidak ditemukan" });
        return res.status(200).json({ deleted: true });
      }

      // --- nama event scroll & CTA project (baca) ---
      if (action === "events-get") {
        const info = await requireProject(user.uid, req);
        if (!info) return res.status(404).json({ error: "Bukan anggota project ini" });
        const { data, error } = await supabase
          .from("project_events")
          .select("scroll25, scroll50, scroll75, ctas, branded_keywords, updated_at")
          .eq("project_id", info.projectId)
          .maybeSingle();
        if (error) {
          if (String(error.message).includes("schema cache") || error.code === "42P01" || error.code === "PGRST205")
            return res.status(200).json({ events: null, needsMigration: "jalankan migrasi SQL 0007 di Supabase" });
          throw error;
        }
        return res.status(200).json({ events: data || null });
      }

      // --- nama event scroll & CTA project (simpan, HANYA pemilik project) ---
      if (action === "events-save") {
        const info = await requireProject(user.uid, req);
        if (!info) return res.status(404).json({ error: "Bukan anggota project ini" });
        if (info.role !== "owner") return res.status(403).json({ error: "Hanya pemilik project yang boleh mengubah nama event" });
        const clean = (v: any, fb: string, max = 80) => {
          const s = typeof v === "string" ? v.trim().slice(0, max) : "";
          return s || fb;
        };
        const ctas: string[] = Array.isArray(body.ctas) && body.ctas.length
          ? (body.ctas as any[]).map((x) => (typeof x === "string" ? x.trim() : "").slice(0, 128)).filter(Boolean).slice(0, 20)
          : DEFAULT_CTAS;
        const row = {
          project_id: info.projectId,
          scroll25: clean(body.scroll25, "scroll_25"),
          scroll50: clean(body.scroll50, "scroll_50"),
          scroll75: clean(body.scroll75, "scroll_75"),
          ctas,
          branded_keywords: Array.isArray(body.branded_keywords)
            ? (body.branded_keywords as any[]).map((x) => (typeof x === 'string' ? x.trim() : '').slice(0, 160)).filter(Boolean).slice(0, 50)
            : [],
        };
        const { data, error } = await supabase
          .from("project_events")
          .upsert(row, { onConflict: "project_id" })
          .select("scroll25, scroll50, scroll75, ctas, branded_keywords, updated_at")
          .single();
        if (error) {
          if (String(error.message).includes("relation") || error.code === "42P01")
            return res.status(500).json({ error: "Tabel project_events belum ada — jalankan migrasi SQL 0007 di Supabase" });
          if (error.code === "42703") return res.status(500).json({ error: "Kolom baru project_events belum ada — jalankan migrasi SQL 0012 di Supabase" });
          throw error;
        }
        return res.status(200).json({ events: data });
      }

      // --- ganti nama project (HANYA pemilik project) ---
      if (action === "rename") {
        const info = await requireProject(user.uid, req);
        if (!info) return res.status(404).json({ error: "Bukan anggota project ini" });
        if (info.role !== "owner") return res.status(403).json({ error: "Hanya pemilik project yang boleh mengganti nama" });
        const name = String(body.name || "").trim().slice(0, 120);
        if (!name) return res.status(400).json({ error: "Nama project wajib diisi" });
        const { data, error } = await supabase
          .from("projects")
          .update({ name })
          .eq("id", info.projectId)
          .select("id, name")
          .single();
        if (error) throw error;
        return res.status(200).json({ project: data });
      }

      // --- info project aktif + koneksi GSC/GA4 (siapa pun anggota boleh baca) ---
      if (action === "connection-get") {
        const info = await requireProject(user.uid, req);
        if (!info) return res.status(404).json({ error: "Bukan anggota project ini" });
        return res.status(200).json({
          project: info.project,
          role: info.role,
          connection: info.connection,
        });
      }

      // --- simpan/connect properti GSC & GA4 (HANYA pemilik project) ---
      if (action === "connection-save") {
        const info = await requireProject(user.uid, req);
        if (!info) return res.status(404).json({ error: "Bukan anggota project ini" });
        if (info.role !== "owner") {
          return res.status(403).json({ error: "Hanya pemilik project yang boleh connect data" });
        }
        const gsc = body.gsc_site === undefined ? undefined : (body.gsc_site ? String(body.gsc_site).slice(0, 2048) : null);
        const ga4 = body.ga4_property === undefined ? undefined : (body.ga4_property ? String(body.ga4_property).slice(0, 128) : null);
        const patch: any = { owner_uid: user.uid, updated_at: new Date().toISOString() };
        if (gsc !== undefined) patch.gsc_site = gsc;
        if (ga4 !== undefined) patch.ga4_property = ga4;
        if (gsc !== null || ga4 !== null) patch.connected_at = new Date().toISOString();
        const { data, error } = await supabase
          .from("project_connections")
          .upsert({ project_id: info.projectId, ...patch }, { onConflict: "project_id" })
          .select()
          .single();
        if (error) throw error;
        return res.status(200).json({ connection: data });
      }

      // --- buat project baru ---
      const { name } = body;
      if (!name || !String(name).trim()) {
        return res.status(400).json({ error: "Nama project wajib diisi" });
      }
      const { data: proj, error } = await supabase
        .from("projects")
        .insert({ name: String(name).trim().slice(0, 120), owner_uid: user.uid })
        .select()
        .single();
      if (error) throw error;
      const { error: e2 } = await supabase
        .from("project_members")
        .insert({ project_id: proj.id, uid: user.uid, role: "owner" });
      if (e2) throw e2;
      return res.status(201).json({ id: proj.id, name: proj.name, role: "owner" });
    }

    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  } catch (error: any) {
    console.error("projects error:", error.message);
    return res.status(500).json({ error: error.message });
  }
}
