import { useState } from "react";
import api from "../api/axios";
import "./Jobs.css";

function Profile() {
  const stored = JSON.parse(localStorage.getItem("user") || "{}");

  const [fullName, setFullName] = useState(stored.full_name || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [nameLoading, setNameLoading] = useState(false);
  const [passLoading, setPassLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const initials = (name, email) => {
    const src = name || email || "U";
    const parts = src.trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return src.slice(0, 2).toUpperCase();
  };

  const handleNameSave = async (e) => {
    e.preventDefault();
    if (!fullName.trim()) return;
    setNameLoading(true);
    try {
      const res = await api.put("/api/auth/me", { full_name: fullName.trim() });
      const updated = { ...stored, full_name: res.data.full_name };
      localStorage.setItem("user", JSON.stringify(updated));
      showToast("Name updated successfully");
    } catch {
      showToast("Failed to update name", "error");
    } finally {
      setNameLoading(false);
    }
  };

  const handlePasswordSave = async (e) => {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirmPassword) {
      return showToast("Please fill in all password fields", "error");
    }
    if (newPassword !== confirmPassword) {
      return showToast("New passwords do not match", "error");
    }
    if (newPassword.length < 6) {
      return showToast("New password must be at least 6 characters", "error");
    }
    setPassLoading(true);
    try {
      await api.put("/api/auth/me", { current_password: currentPassword, new_password: newPassword });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      showToast("Password changed successfully");
    } catch (err) {
      const msg = err?.response?.data?.detail || "Failed to change password";
      showToast(msg, "error");
    } finally {
      setPassLoading(false);
    }
  };

  const roleLabel = { candidate: "Candidate", hr: "HR Manager", admin: "Administrator" };

  return (
    <div className="admin-page-content">
      {toast && (
        <div style={{
          position: "fixed", bottom: 24, right: 24, zIndex: 9999,
          background: toast.type === "error" ? "#ef4444" : "#22c55e",
          color: "#fff", padding: "12px 20px", borderRadius: 8,
          boxShadow: "0 4px 16px rgba(0,0,0,.2)", fontSize: 14, fontWeight: 500,
          display: "flex", alignItems: "center", gap: 8,
        }}>
          <i className={`fas ${toast.type === "error" ? "fa-circle-xmark" : "fa-circle-check"}`} />
          {toast.message}
        </div>
      )}

      <div className="admin-page-topbar">
        <div>
          <h1 className="admin-page-title">Profile</h1>
          <p className="admin-page-sub">Manage your account settings</p>
        </div>
      </div>

      {/* Avatar + info card */}
      <div className="admin-card" style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div style={{
            width: 72, height: 72, borderRadius: "50%",
            background: "var(--brand, #7c3aed)", color: "#fff",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 26, fontWeight: 700, flexShrink: 0,
          }}>
            {initials(fullName, stored.email)}
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "var(--ink, #111827)" }}>
              {fullName || stored.email}
            </div>
            <div style={{ fontSize: 13, color: "var(--muted, #6b7280)", marginTop: 2 }}>
              {stored.email}
            </div>
            <span style={{
              display: "inline-block", marginTop: 6,
              fontSize: 11, fontWeight: 600, padding: "3px 10px", borderRadius: 20,
              background: "var(--brand-soft, #ede9fe)", color: "var(--brand, #7c3aed)",
            }}>
              {roleLabel[stored.role] || stored.role}
            </span>
          </div>
        </div>
      </div>

      <div className="admin-grid-2" style={{ alignItems: "start" }}>
        {/* Change name */}
        <div className="admin-card">
          <div className="admin-card-header">
            <h3>
              <i className="fa-solid fa-user-pen" style={{ marginRight: 8, color: "var(--brand, #7c3aed)" }} />
              Display Name
            </h3>
          </div>
          <form onSubmit={handleNameSave} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: "var(--ink-2, #374151)", display: "block", marginBottom: 6 }}>
                Email
              </label>
              <input
                type="text"
                value={stored.email}
                disabled
                style={{
                  width: "100%", padding: "10px 14px", borderRadius: 8, fontSize: 14,
                  border: "1.5px solid var(--border, #e5e7eb)", background: "var(--bg, #f9fafb)",
                  color: "var(--muted, #6b7280)", boxSizing: "border-box",
                }}
              />
            </div>
            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: "var(--ink-2, #374151)", display: "block", marginBottom: 6 }}>
                Full Name
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Enter your full name"
                required
                style={{
                  width: "100%", padding: "10px 14px", borderRadius: 8, fontSize: 14,
                  border: "1.5px solid var(--border, #e5e7eb)", background: "#fff",
                  color: "var(--ink, #111827)", boxSizing: "border-box", outline: "none",
                }}
              />
            </div>
            <button
              type="submit"
              disabled={nameLoading}
              style={{
                background: "var(--brand, #7c3aed)", color: "#fff", border: "none",
                padding: "10px 20px", borderRadius: 8, fontSize: 14, fontWeight: 600,
                cursor: nameLoading ? "not-allowed" : "pointer", opacity: nameLoading ? 0.7 : 1,
                display: "flex", alignItems: "center", gap: 8, alignSelf: "flex-start",
              }}
            >
              {nameLoading
                ? <><i className="fa-solid fa-spinner fa-spin" /> Saving...</>
                : <><i className="fa-solid fa-floppy-disk" /> Save Name</>}
            </button>
          </form>
        </div>

        {/* Change password */}
        <div className="admin-card">
          <div className="admin-card-header">
            <h3>
              <i className="fa-solid fa-lock" style={{ marginRight: 8, color: "var(--brand, #7c3aed)" }} />
              Change Password
            </h3>
          </div>
          <form onSubmit={handlePasswordSave} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {[
              { label: "Current Password", value: currentPassword, set: setCurrentPassword },
              { label: "New Password", value: newPassword, set: setNewPassword },
              { label: "Confirm New Password", value: confirmPassword, set: setConfirmPassword },
            ].map(({ label, value, set }) => (
              <div key={label}>
                <label style={{ fontSize: 13, fontWeight: 600, color: "var(--ink-2, #374151)", display: "block", marginBottom: 6 }}>
                  {label}
                </label>
                <input
                  type="password"
                  value={value}
                  onChange={(e) => set(e.target.value)}
                  placeholder="••••••••"
                  style={{
                    width: "100%", padding: "10px 14px", borderRadius: 8, fontSize: 14,
                    border: "1.5px solid var(--border, #e5e7eb)", background: "#fff",
                    color: "var(--ink, #111827)", boxSizing: "border-box", outline: "none",
                  }}
                />
              </div>
            ))}
            <button
              type="submit"
              disabled={passLoading}
              style={{
                background: "var(--brand, #7c3aed)", color: "#fff", border: "none",
                padding: "10px 20px", borderRadius: 8, fontSize: 14, fontWeight: 600,
                cursor: passLoading ? "not-allowed" : "pointer", opacity: passLoading ? 0.7 : 1,
                display: "flex", alignItems: "center", gap: 8, alignSelf: "flex-start",
              }}
            >
              {passLoading
                ? <><i className="fa-solid fa-spinner fa-spin" /> Saving...</>
                : <><i className="fa-solid fa-key" /> Change Password</>}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default Profile;
