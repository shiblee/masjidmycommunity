import React, { useEffect, useState } from "react";
import Icon from "../components/Icons.jsx";
import Pagination from "../components/Pagination.jsx";
import adminApi from "../services/adminApi.js";
import { API_ORIGIN } from "../../config.js";
import { formatDateTime } from "../../utils/formatDateTime.js";

// Read-only by design -- a deleted Reel is the author's own retraction
// (see deleteReel in publicCommunityController.js), not a moderation queue
// item, so there's no restore/publish action here, just a record of what
// was removed, by whom, and why.
function DeletedReels() {
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ reels: [], total: 0, pageSize: 20 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    setError("");
    adminApi
      .get("/community/deleted-reels", { params: { page } })
      .then(({ data }) => setData(data))
      .catch((err) => setError(err.response?.data?.message || "Couldn't load deleted Reels."))
      .finally(() => setLoading(false));
  }, [page]);

  const totalPages = Math.max(1, Math.ceil(data.total / data.pageSize));

  return (
    <>
      <div className="amx-page-head">
        <div>
          <span className="amx-crumb">Community</span>
          <h1>Deleted Reels</h1>
          <p>Reels users have deleted from their own account, with the reason they gave</p>
        </div>
      </div>

      <div className="amx-card amx-panel">
        {error && (
          <div className="amx-form-error" style={{ marginBottom: 16 }}>
            <Icon name="info" size={17} />
            {error}
          </div>
        )}

        {loading ? (
          <div className="amx-empty">
            <Icon name="camera" />
            <strong>Loading…</strong>
          </div>
        ) : data.reels.length === 0 ? (
          <div className="amx-empty">
            <Icon name="camera" />
            <strong>No deleted Reels</strong>
            <span>Nothing here yet — Reels a user deletes from their account will show up in this list.</span>
          </div>
        ) : (
          <div className="amx-table-wrap">
            <table className="amx-table">
              <thead>
                <tr>
                  <th></th>
                  <th>Caption</th>
                  <th>Author</th>
                  <th>Reason</th>
                  <th>Comment</th>
                  <th>Deleted</th>
                </tr>
              </thead>
              <tbody>
                {data.reels.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <div style={{ width: 48, height: 64, borderRadius: 8, overflow: "hidden", background: "#000", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        {r.mediaVideoPosterUrl ? (
                          <img src={`${API_ORIGIN}${r.mediaVideoPosterUrl}`} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        ) : (
                          <Icon name="camera" size={16} />
                        )}
                      </div>
                    </td>
                    <td style={{ maxWidth: 260 }}>{r.body || <span className="amx-panel-sub">No caption</span>}</td>
                    <td>
                      {r.author ? (
                        <>
                          <div>{r.author.fullName} <span className="amx-cell-sub">#{r.author.id}</span></div>
                          <div className="amx-cell-sub">@{r.author.username}</div>
                        </>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td><strong>{r.deletionReason}</strong></td>
                    <td className="amx-panel-sub" style={{ maxWidth: 240 }}>{r.deletionComment || "—"}</td>
                    <td>{formatDateTime(r.deletedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <Pagination page={page} totalPages={totalPages} totalItems={data.total} pageSize={data.pageSize} onChange={setPage} />
      </div>
    </>
  );
}

export default DeletedReels;
