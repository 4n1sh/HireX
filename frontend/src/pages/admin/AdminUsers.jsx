import { useEffect, useState } from "react";
import api from "../../api/axios";
import "../Jobs.css";

function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState("");
  const [updating, setUpdating] = useState(null);
  const [notice, setNotice] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const currentUser = JSON.parse(localStorage.getItem("user") || "{}");

  const fetchUsers = async () => {
    try {
      const res = await api.get("/api/admin/users");
      setUsers(res.data);
    } catch { /* silent */ }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchUsers(); }, []);

  const getErrorMessage = (err, fallback) => err?.response?.data?.detail || fallback;

  const showNotice = (type, message) => {
    setNotice({ type, message });
    setTimeout(() => setNotice(null), 3500);
  };

  const handleRoleChange = async (userId, newRole) => {
    setUpdating(userId + "_role");
    try {
      await api.put(`/api/admin/users/${userId}/role`, { role: newRole });
      setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u)));
    } catch { /* silent */ }
    finally { setUpdating(null); }
  };

  const handleBlacklist = async (userId, currentlyBlacklisted) => {
    setUpdating(userId + "_bl");
    try {
      await api.put(`/api/admin/users/${userId}/blacklist`, { blacklisted: !currentlyBlacklisted });
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, is_blacklisted: !currentlyBlacklisted } : u))
      );
    } catch { /* silent */ }
    finally { setUpdating(null); }
  };

  const handleDelete = async (userId, displayName) => {
    setUpdating(userId + "_del");
    try {
      await api.delete(`/api/admin/users/${userId}`);
      setUsers((prev) => prev.filter((u) => u.id !== userId));
      showNotice("success", `Deleted ${displayName}.`);
      setDeleteTarget(null);
    } catch (err) {
      showNotice("error", getErrorMessage(err, "Failed to delete user."));
    }
    finally { setUpdating(null); }
  };

  const getInitials = (name, email) => {
    const src = name || email || "U";
    const parts = src.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "U";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  };

  const timeAgo = (d) => {
    if (!d) return "";
    const days = Math.floor((Date.now() - new Date(d)) / 86400000);
    if (days === 0) return "Today";
    if (days === 1) return "1d ago";
    if (days < 7) return `${days}d ago`;
    if (days < 30) return `${Math.floor(days / 7)}w ago`;
    return new Date(d).toLocaleDateString();
  };

  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    const matchQ =
      (u.full_name || "").toLowerCase().includes(q) ||
      (u.email || "").toLowerCase().includes(q);
    const matchRole = !filterRole || u.role === filterRole;
    return matchQ && matchRole;
  });

  return (
    <div className="admin-page-content">
      <div className="admin-page-topbar">
        <div>
          <h1 className="admin-page-title">User Management</h1>
          <p className="admin-page-sub">
            Manage all candidates and HR managers on the platform.
          </p>
        </div>
      </div>

      {notice && (
        <div className={`custom-notice ${notice.type}`} role="status" aria-live="polite">
          <i className={`fa-solid ${notice.type === "success" ? "fa-circle-check" : "fa-circle-exclamation"}`} />
          <span>{notice.message}</span>
          <button onClick={() => setNotice(null)} aria-label="Close notification">
            <i className="fa-solid fa-xmark" />
          </button>
        </div>
      )}

      {/* Quick stats */}
      {!loading && (
        <div className="admin-stats-grid" style={{ marginBottom: 20 }}>
          <div className="admin-stat-card-v2">
            <div className="admin-stat-icon blue"><i className="fa-solid fa-users" /></div>
            <div className="admin-stat-num">{users.length}</div>
            <div className="admin-stat-lbl">Total Users</div>
          </div>
          <div className="admin-stat-card-v2">
            <div className="admin-stat-icon green"><i className="fa-solid fa-circle-check" /></div>
            <div className="admin-stat-num">{users.filter((u) => !u.is_blacklisted).length}</div>
            <div className="admin-stat-lbl">Active</div>
          </div>
          <div className="admin-stat-card-v2">
            <div className="admin-stat-icon orange"><i className="fa-solid fa-ban" /></div>
            <div className="admin-stat-num">{users.filter((u) => u.is_blacklisted).length}</div>
            <div className="admin-stat-lbl">Blacklisted</div>
          </div>
          <div className="admin-stat-card-v2">
            <div className="admin-stat-icon purple"><i className="fa-solid fa-user-tie" /></div>
            <div className="admin-stat-num">{users.filter((u) => u.role === "hr").length}</div>
            <div className="admin-stat-lbl">HR Managers</div>
          </div>
        </div>
      )}

      {/* Filter bar */}
      <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 20, flexWrap: "wrap" }}>
        <div className="jobs-search" style={{ flex: 1, maxWidth: 300 }}>
          <i className="fa-solid fa-magnifying-glass" />
          <input
            placeholder="Search by name or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="filter-select"
          value={filterRole}
          onChange={(e) => setFilterRole(e.target.value)}
        >
          <option value="">All Roles</option>
          <option value="candidate">Candidates</option>
          <option value="hr">HR Managers</option>
          <option value="admin">Admins</option>
        </select>
        <span style={{ fontSize: 13, color: "var(--muted)", marginLeft: "auto" }}>
          {filtered.length} user{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* List */}
      {loading ? (
        <p style={{ textAlign: "center", color: "var(--muted)", padding: 40 }}>
          <i className="fa-solid fa-spinner fa-spin" style={{ marginRight: 8 }} />
          Loading users…
        </p>
      ) : filtered.length === 0 ? (
        <div className="jobs-empty">
          <i className="fa-solid fa-users" />
          <p>No users found</p>
        </div>
      ) : (
        <div className="users-list">
          {filtered.map((u) => {
            const isSelf = u.id === currentUser.id;
            const busy = updating !== null;
            return (
              <div key={u.id} className={`user-row${u.is_blacklisted ? " blacklisted" : ""}`}>
                <div className="user-avatar">{getInitials(u.full_name, u.email)}</div>

                <div className="user-info">
                  <strong>{u.full_name || "No name"}</strong>
                  <span>{u.email}</span>
                </div>

                <span className={`user-status-badge ${u.is_blacklisted ? "blacklisted" : "active"}`}>
                  {u.is_blacklisted ? "Blacklisted" : "Active"}
                </span>

                <select
                  className="user-role-select"
                  value={u.role}
                  onChange={(e) => handleRoleChange(u.id, e.target.value)}
                  disabled={isSelf || busy}
                >
                  <option value="candidate">Candidate</option>
                  <option value="hr">HR</option>
                  <option value="admin">Admin</option>
                </select>

                <span className="user-date">{timeAgo(u.created_at)}</span>

                <div className="user-actions">
                  {!isSelf && (
                    <>
                      <button
                        className={`user-action-btn warn${u.is_blacklisted ? " active-warn" : ""}`}
                        onClick={() => handleBlacklist(u.id, u.is_blacklisted)}
                        disabled={busy}
                        title={u.is_blacklisted ? "Remove blacklist" : "Blacklist user"}
                      >
                        <i className={`fa-solid ${u.is_blacklisted ? "fa-lock-open" : "fa-ban"}`} />
                      </button>
                      <button
                        className="user-action-btn danger"
                        onClick={() => setDeleteTarget({ id: u.id, name: u.full_name || u.email })}
                        disabled={busy}
                        title="Delete user"
                      >
                        <i className="fa-solid fa-trash" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {deleteTarget && (
        <div className="custom-modal-backdrop" role="presentation" onClick={() => updating ? null : setDeleteTarget(null)}>
          <div className="custom-modal" role="dialog" aria-modal="true" aria-labelledby="delete-user-title" onClick={(e) => e.stopPropagation()}>
            <div className="custom-modal-icon danger">
              <i className="fa-solid fa-triangle-exclamation" />
            </div>
            <h3 id="delete-user-title">Delete user account?</h3>
            <p>
              This will permanently remove <strong>{deleteTarget.name}</strong> and cannot be undone.
            </p>
            <div className="custom-modal-actions">
              <button className="btn-outline" onClick={() => setDeleteTarget(null)} disabled={Boolean(updating)}>
                Cancel
              </button>
              <button
                className="btn-danger"
                onClick={() => handleDelete(deleteTarget.id, deleteTarget.name)}
                disabled={Boolean(updating)}
              >
                <i className={`fa-solid ${updating ? "fa-spinner fa-spin" : "fa-trash"}`} />
                {updating ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminUsers;
