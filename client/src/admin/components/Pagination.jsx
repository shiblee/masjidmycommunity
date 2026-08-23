import React from "react";

function Pagination({ page, totalPages, totalItems, pageSize, onChange }) {
  if (totalPages <= 1) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, totalItems);

  const pages = [];
  for (let i = 1; i <= totalPages; i++) pages.push(i);

  return (
    <div className="amx-pagination">
      <span>
        Showing {from}–{to} of {totalItems}
      </span>
      <div className="amx-page-btns">
        <button disabled={page === 1} onClick={() => onChange(page - 1)} aria-label="Previous page">
          ‹
        </button>
        {pages.map((p) => (
          <button key={p} className={p === page ? "active" : ""} onClick={() => onChange(p)}>
            {p}
          </button>
        ))}
        <button disabled={page === totalPages} onClick={() => onChange(page + 1)} aria-label="Next page">
          ›
        </button>
      </div>
    </div>
  );
}

export default Pagination;
