"use client";

import { useState, useEffect, useCallback } from "react";
import TopBar from "@/components/TopBar";
import Input from "@/components/ui/Input";
import Button, { Spinner } from "@/components/ui/Button";
import { user, type UserProfile } from "@/lib/api";

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  // Form fields
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [cadreService, setCadreService] = useState("");
  const [designation, setDesignation] = useState("");
  const [headOffice, setHeadOffice] = useState("");
  const [branchOffice, setBranchOffice] = useState("");
  const [country, setCountry] = useState("");
  const [state, setState] = useState("");
  const [district, setDistrict] = useState("");
  const [city, setCity] = useState("");

  const fetchProfile = useCallback(async () => {
    try {
      const res = await user.getProfile();
      const p = res.data;
      setProfile(p);
      setFirstName(p.profile?.first_name || "");
      setLastName(p.profile?.last_name || "");
      setEmployeeId(p.profile?.employee_id || "");
      setCadreService(p.profile?.cadre_service || "");
      setDesignation(p.profile?.designation_rank || "");
      setHeadOffice(p.profile?.head_office_address || "");
      setBranchOffice(p.profile?.branch_office_address || "");
      setCountry(p.profile?.country || "");
      setState(p.profile?.state || "");
      setDistrict(p.profile?.district || "");
      setCity(p.profile?.city || "");
    } catch {
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleSave = async () => {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      await user.updateProfile({
        first_name: firstName || undefined,
        last_name: lastName || undefined,
        employee_id: employeeId || undefined,
        cadre_service: cadreService || undefined,
        designation_rank: designation || undefined,
        head_office_address: headOffice || undefined,
        branch_office_address: branchOffice || undefined,
        country: country || undefined,
        state: state || undefined,
        district: district || undefined,
        city: city || undefined,
      });
      setSuccess("Profile updated successfully");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-dvh">
        <TopBar />
        <main className="max-w-[640px] mx-auto px-6 py-8">
          <div className="space-y-4">
            <div className="h-8 w-40 bg-sutra-line-2 rounded animate-pulse" />
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-11 w-full bg-sutra-line-2 rounded-lg animate-pulse" />
            ))}
          </div>
        </main>
      </div>
    );
  }

  const roleLabel = profile?.role === "judiciary"
    ? "Honourable Judiciary"
    : profile?.role === "legal_practitioner"
      ? "Legal Practitioner"
      : profile?.role === "mediator"
        ? "Mediator"
        : profile?.role || "—";

  return (
    <div className="min-h-dvh">
      <TopBar />
      <main className="max-w-[640px] mx-auto px-6 py-8 pb-21">
        <h1 className="text-[28px] font-bold tracking-tight mb-1">Profile</h1>
        <p className="text-[15px] text-sutra-ink-3 mb-8">
          Manage your personal and professional details
        </p>

        {/* Account info (read-only) */}
        <section className="bg-white border border-sutra-line rounded-2xl p-6 mb-6">
          <h2 className="text-[13px] font-bold uppercase tracking-widest text-sutra-ink-3 mb-4">
            Account
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="block text-[12px] font-semibold text-sutra-ink-3 mb-1">Email</span>
              <span className="text-[15px] text-sutra-ink font-medium">{profile?.email || "—"}</span>
            </div>
            <div>
              <span className="block text-[12px] font-semibold text-sutra-ink-3 mb-1">Role</span>
              <span className="text-[15px] text-sutra-ink font-medium">{roleLabel}</span>
            </div>
            <div>
              <span className="block text-[12px] font-semibold text-sutra-ink-3 mb-1">Status</span>
              <span className={`inline-flex items-center gap-1.5 text-[14px] font-semibold ${
                profile?.account_status === "active" ? "text-green-700" : "text-amber-700"
              }`}>
                <span className={`w-2 h-2 rounded-full ${
                  profile?.account_status === "active" ? "bg-green-500" : "bg-amber-500"
                }`} />
                {profile?.account_status === "active" ? "Active" : profile?.account_status || "—"}
              </span>
            </div>
            <div>
              <span className="block text-[12px] font-semibold text-sutra-ink-3 mb-1">Member since</span>
              <span className="text-[15px] text-sutra-ink font-medium">
                {profile?.created_at
                  ? new Date(profile.created_at).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })
                  : "—"}
              </span>
            </div>
          </div>
        </section>

        {/* Personal details */}
        <section className="bg-white border border-sutra-line rounded-2xl p-6 mb-6">
          <h2 className="text-[13px] font-bold uppercase tracking-widest text-sutra-ink-3 mb-4">
            Personal Details
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <Input label="First Name" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="e.g. Rahul" />
            <Input label="Last Name" value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="e.g. Sharma" />
          </div>
        </section>

        {/* Professional details */}
        <section className="bg-white border border-sutra-line rounded-2xl p-6 mb-6">
          <h2 className="text-[13px] font-bold uppercase tracking-widest text-sutra-ink-3 mb-4">
            Professional Details
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Employee ID" value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} placeholder="e.g. EMP-12345" />
            <Input label="Cadre / Service" value={cadreService} onChange={(e) => setCadreService(e.target.value)} placeholder="e.g. IAS, IPS" />
            <div className="col-span-2">
              <Input label="Designation / Rank" value={designation} onChange={(e) => setDesignation(e.target.value)} placeholder="e.g. District Judge" />
            </div>
          </div>
        </section>

        {/* Address */}
        <section className="bg-white border border-sutra-line rounded-2xl p-6 mb-6">
          <h2 className="text-[13px] font-bold uppercase tracking-widest text-sutra-ink-3 mb-4">
            Address
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Input label="Head Office Address" value={headOffice} onChange={(e) => setHeadOffice(e.target.value)} placeholder="Full address" />
            </div>
            <div className="col-span-2">
              <Input label="Branch Office Address" value={branchOffice} onChange={(e) => setBranchOffice(e.target.value)} placeholder="Full address" />
            </div>
            <Input label="Country" value={country} onChange={(e) => setCountry(e.target.value)} placeholder="e.g. India" />
            <Input label="State" value={state} onChange={(e) => setState(e.target.value)} placeholder="e.g. Delhi" />
            <Input label="District" value={district} onChange={(e) => setDistrict(e.target.value)} placeholder="e.g. New Delhi" />
            <Input label="City" value={city} onChange={(e) => setCity(e.target.value)} placeholder="e.g. New Delhi" />
          </div>
        </section>

        {/* Feedback */}
        {error && <p className="text-[13px] text-red-700 mb-4">{error}</p>}
        {success && <p className="text-[13px] text-green-700 mb-4">{success}</p>}

        {/* Save */}
        <div className="flex justify-end">
          <Button loading={saving} onClick={handleSave}>
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </main>
    </div>
  );
}
