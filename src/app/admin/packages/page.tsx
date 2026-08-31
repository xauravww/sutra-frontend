"use client";

import { useEffect, useState, useCallback } from "react";
import { admin, type AdminPlan } from "@/lib/api";
import { useNotify } from "@/components/ui/Notify";
import { PageHeader, EmptyState, ErrorState } from "@/components/admin/ui";

interface PlanFeatures {
  tag?: string;
  grade_text?: string;
  grade_level?: string;
  original_price_yearly?: number | string;
  discount_text?: string;
  per_unit?: string;
  description?: string;
  list_items?: string[];
}

interface PlanForm {
  name: string;
  price_monthly: string;
  price_quarterly: string;
  price_half_yearly: string;
  price_yearly: string;
  is_popular: boolean;
  features: PlanFeatures;
}

const EMPTY_FORM: PlanForm = {
  name: "",
  price_monthly: "",
  price_quarterly: "",
  price_half_yearly: "",
  price_yearly: "",
  is_popular: false,
  features: {
    tag: "",
    grade_text: "",
    grade_level: "",
    original_price_yearly: "",
    discount_text: "",
    per_unit: "",
    description: "",
    list_items: [],
  } as PlanFeatures,
};

const fmtMoney = (n: number | null | undefined) =>
  n == null ? "—" : "₹" + Number(n).toLocaleString("en-IN");

export default function AdminPackagesPage() {
  const { toast, confirm } = useNotify();

  const [plans, setPlans] = useState<AdminPlan[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AdminPlan | null>(null);
  const [form, setForm] = useState<PlanForm>(EMPTY_FORM);
  const [listItemsText, setListItemsText] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchPlans = useCallback(() => {
    setLoading(true);
    setLoadError("");
    admin
      .listPlans({ limit: 100 })
      .then((r) => {
        setPlans(r.data.data);
        setTotal(r.data.total);
      })
      .catch((e) => {
        setPlans([]);
        setLoadError(e instanceof Error ? e.message : "Failed to load packages");
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  const featuresOf = (p: AdminPlan): PlanFeatures => (p.features ?? {}) as PlanFeatures;

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setListItemsText("");
    setModalOpen(true);
  };

  const openEdit = (p: AdminPlan) => {
    const f = featuresOf(p);
    setEditing(p);
    setForm({
      name: p.name,
      price_monthly: p.price_monthly != null ? String(p.price_monthly) : "",
      price_quarterly: p.price_quarterly != null ? String(p.price_quarterly) : "",
      price_half_yearly: p.price_half_yearly != null ? String(p.price_half_yearly) : "",
      price_yearly: p.price_yearly != null ? String(p.price_yearly) : "",
      is_popular: Boolean(p.is_popular),
      features: {
        tag: f.tag ?? "",
        grade_text: f.grade_text ?? "",
        grade_level: f.grade_level ?? "",
        original_price_yearly: f.original_price_yearly != null ? String(f.original_price_yearly) : "",
        discount_text: f.discount_text ?? "",
        per_unit: f.per_unit ?? "",
        description: f.description ?? "",
      },
    });
    setListItemsText((f.list_items ?? []).join("\n"));
    setModalOpen(true);
  };

  const buildPayload = () => {
    const num = (v: string | number | undefined) =>
      v == null || String(v).trim() === "" ? null : parseFloat(String(v));
    const listItems = listItemsText
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    return {
      name: form.name,
      price_monthly: num(form.price_monthly) ?? 0,
      price_quarterly: num(form.price_quarterly),
      price_half_yearly: num(form.price_half_yearly),
      price_yearly: num(form.price_yearly),
      is_popular: form.is_popular,
      features: {
        tag: form.features.tag || undefined,
        grade_text: form.features.grade_text || undefined,
        grade_level: form.features.grade_level || undefined,
        original_price_yearly: num(form.features.original_price_yearly) ?? undefined,
        discount_text: form.features.discount_text || undefined,
        per_unit: form.features.per_unit || undefined,
        description: form.features.description || undefined,
        list_items: listItems,
      },
    };
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      if (editing) {
        await admin.updatePlan(editing.id, buildPayload());
        toast("Package updated", "success");
      } else {
        await admin.createPlan(buildPayload());
        toast("Package created", "success");
      }
      setModalOpen(false);
      fetchPlans();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Save failed", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (p: AdminPlan) => {
    const ok = await confirm({
      title: "Delete package",
      message: `Delete "${p.name}"? Existing subscriptions on this plan may be affected.`,
      confirmLabel: "Delete",
      tone: "danger",
    });
    if (!ok) return;
    try {
      await admin.deletePlan(p.id);
      toast("Package deleted", "success");
      fetchPlans();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Delete failed", "error");
    }
  };

  const setF = (patch: Partial<PlanForm>) => setForm((prev) => ({ ...prev, ...patch }));
  const setFeat = (key: keyof PlanFeatures, value: string) =>
    setForm((prev) => ({ ...prev, features: { ...prev.features, [key]: value } }));

  return (
    <div>
      <PageHeader
        title="Packages"
        subtitle={`${total.toLocaleString()} active plans`}
        actions={
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-1.5 bg-navy text-white rounded-xl text-[14px] font-semibold px-4 py-2.5 hover:bg-navy-dark transition-colors"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-4 h-4">
              <path d="M12 5v14M5 12h14" />
            </svg>
            New Package
          </button>
        }
      />

      <div className="bg-amber-bg border border-amber-ink/20 rounded-xl px-4 py-3 mb-6 flex items-start gap-3">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-amber-ink flex-none mt-0.5">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 8h.01" />
          <path d="M12 12v4" />
        </svg>
        <div>
          <p className="text-[13.5px] font-semibold text-amber-ink">Packages are not enabled right now</p>
          <p className="text-[12.5px] text-amber-ink/90 mt-0.5">
            This section is inactive in the current build. Data below may be legacy or empty — do not use it to make decisions.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white border border-sutra-line rounded-xl p-5 h-44 animate-pulse" />
          ))}
        </div>
      ) : loadError ? (
        <ErrorState title="Couldn't load packages" message={loadError} onRetry={fetchPlans} />
      ) : plans.length === 0 ? (
        <EmptyState title="No packages yet" description="Create your first plan to get started." />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {plans.map((p) => {
            const f = featuresOf(p);
            return (
              <div
                key={p.id}
                className={`bg-white border rounded-xl overflow-hidden flex flex-col ${p.is_popular ? "border-navy" : "border-sutra-line"}`}
              >
                <div className={`p-5 ${p.is_popular ? "bg-navy text-white" : ""}`}>
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-[16px] font-bold">{p.name}</h3>
                    {p.is_popular && (
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-white/20 text-white px-2 py-0.5 rounded-full">
                        Popular
                      </span>
                    )}
                  </div>
                  <p className={`text-[13px] mt-0.5 ${p.is_popular ? "text-white/70" : "text-sutra-ink-3"}`}>{f.tag || f.grade_text || ""}</p>
                </div>
                <div className="p-5 flex-1 flex flex-col">
                  <p className="text-[24px] font-bold tracking-tight text-sutra-ink">
                    {fmtMoney(p.price_yearly ?? p.price_monthly)}
                    <span className="text-[12px] font-medium text-sutra-ink-3">
                      {p.price_yearly ? "/year" : f.per_unit ? `/${f.per_unit}` : "/month"}
                    </span>
                  </p>
                  {p.price_yearly != null && (
                    <p className="text-[12px] text-sutra-ink-3 mt-0.5">Monthly: {fmtMoney(p.price_monthly)}</p>
                  )}
                  {f.description && <p className="text-[12.5px] text-sutra-ink-2 italic mt-2">{f.description}</p>}
                  {(f.list_items ?? []).length > 0 && (
                    <ul className="mt-3 space-y-1.5">
                      {(f.list_items ?? []).map((item, i) => (
                        <li key={i} className="flex items-start gap-2 text-[12.5px] text-sutra-ink-2">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-3.5 h-3.5 mt-0.5 text-green-dot flex-none">
                            <path d="M20 6 9 17l-5-5" />
                          </svg>
                          {item}
                        </li>
                      ))}
                    </ul>
                  )}
                  <div className="mt-4 pt-3 border-t border-sutra-line-2 text-[12px] text-sutra-ink-3 flex items-center justify-between">
                    <span>
                      <b className="text-navy font-bold">{p.active_subscriptions ?? 0}</b> active subs
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => openEdit(p)}
                        className="h-8 px-3 rounded-lg border border-sutra-line bg-white text-[12px] font-semibold text-sutra-ink-2 hover:bg-tint transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(p)}
                        className="h-8 px-3 rounded-lg border border-sutra-line bg-white text-[12px] font-semibold text-sutra-ink-2 hover:bg-red-50 hover:text-red-700 hover:border-red-300 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setModalOpen(false)} />
          <div className="relative w-full max-w-2xl bg-white rounded-xl p-5 max-h-[90vh] overflow-y-auto">
            <h3 className="text-[15px] font-bold text-sutra-ink mb-4">
              {editing ? `Edit ${editing.name}` : "New Package"}
            </h3>
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-[13px] font-semibold text-sutra-ink-2 mb-1.5">Plan name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setF({ name: e.target.value })}
                  className="w-full h-11 rounded-lg border border-sutra-line bg-white px-3.5 text-[14px] text-sutra-ink outline-none focus:border-navy"
                />
              </div>
              {(["price_monthly", "price_quarterly", "price_half_yearly", "price_yearly"] as const).map((key) => (
                <div key={key}>
                  <label className="block text-[13px] font-semibold text-sutra-ink-2 mb-1.5 capitalize">
                    {key.replace(/_/g, " ")}
                  </label>
                  <input
                    type="number"
                    value={form[key]}
                    onChange={(e) => setF({ [key]: e.target.value } as Partial<PlanForm>)}
                    placeholder="0"
                    className="w-full h-11 rounded-lg border border-sutra-line bg-white px-3.5 text-[14px] text-sutra-ink outline-none focus:border-navy"
                  />
                </div>
              ))}
              <div className="sm:col-span-2">
                <label className="block text-[13px] font-semibold text-sutra-ink-2 mb-1.5">Tag / subtitle</label>
                <input
                  type="text"
                  value={form.features.tag ?? ""}
                  onChange={(e) => setFeat("tag", e.target.value)}
                  className="w-full h-11 rounded-lg border border-sutra-line bg-white px-3.5 text-[14px] text-sutra-ink outline-none focus:border-navy"
                />
              </div>
              <div>
                <label className="block text-[13px] font-semibold text-sutra-ink-2 mb-1.5">Grade level</label>
                <input
                  type="text"
                  value={form.features.grade_level ?? ""}
                  onChange={(e) => setFeat("grade_level", e.target.value)}
                  className="w-full h-11 rounded-lg border border-sutra-line bg-white px-3.5 text-[14px] text-sutra-ink outline-none focus:border-navy"
                />
              </div>
              <div>
                <label className="block text-[13px] font-semibold text-sutra-ink-2 mb-1.5">Per unit (e.g. /case)</label>
                <input
                  type="text"
                  value={form.features.per_unit ?? ""}
                  onChange={(e) => setFeat("per_unit", e.target.value)}
                  className="w-full h-11 rounded-lg border border-sutra-line bg-white px-3.5 text-[14px] text-sutra-ink outline-none focus:border-navy"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-[13px] font-semibold text-sutra-ink-2 mb-1.5">Description</label>
                <input
                  type="text"
                  value={form.features.description ?? ""}
                  onChange={(e) => setFeat("description", e.target.value)}
                  className="w-full h-11 rounded-lg border border-sutra-line bg-white px-3.5 text-[14px] text-sutra-ink outline-none focus:border-navy"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-[13px] font-semibold text-sutra-ink-2 mb-1.5">
                  Feature list <span className="text-sutra-ink-3 font-normal">(one per line)</span>
                </label>
                <textarea
                  value={listItemsText}
                  onChange={(e) => setListItemsText(e.target.value)}
                  rows={4}
                  placeholder={"Unlimited case uploads\nPriority AI analysis"}
                  className="w-full rounded-lg border border-sutra-line bg-white px-3.5 py-2.5 text-[14px] text-sutra-ink outline-none focus:border-navy resize-y"
                />
              </div>
              <label className="flex items-center gap-2 text-[13.5px] font-semibold text-sutra-ink-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.is_popular}
                  onChange={(e) => setF({ is_popular: e.target.checked })}
                  className="w-4 h-4 accent-[#1E4E79]"
                />
                Mark as popular
              </label>
            </div>
            <div className="flex gap-3 mt-5">
              <button
                onClick={handleSave}
                disabled={saving || !form.name.trim()}
                className="inline-flex items-center bg-navy text-white rounded-xl text-[14px] font-semibold px-5 h-11 hover:bg-navy-dark transition-colors disabled:opacity-50"
              >
                {saving ? "Saving..." : editing ? "Update" : "Create"}
              </button>
              <button
                onClick={() => setModalOpen(false)}
                className="inline-flex items-center rounded-xl border border-sutra-line bg-white px-5 h-11 text-[14px] font-semibold text-sutra-ink-2 hover:bg-tint transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
