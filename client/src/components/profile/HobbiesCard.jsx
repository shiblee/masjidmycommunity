import React, { useEffect, useState } from "react";
import TagSelect from "./TagSelect.jsx";
import userApi from "../../services/userApi.js";
import adminApi from "../../admin/services/adminApi.js";

function editConfig(mode, targetUserId) {
  return mode === "admin" ? { client: adminApi, base: `/users/${targetUserId}` } : { client: userApi, base: "/me" };
}

function HobbiesCard({ mode = "self", targetUserId, entries: viewEntries }) {
  const editable = mode !== "view";
  const { client, base } = editConfig(mode, targetUserId);

  const [master, setMaster] = useState([]);
  const [mine, setMine] = useState(mode === "view" ? viewEntries || [] : []);
  const [loading, setLoading] = useState(mode !== "view");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (mode === "view") {
      setMine(viewEntries || []);
      return;
    }
    setLoading(true);
    Promise.all([client.get(`${mode === "admin" ? "/hobbies" : "/meta/hobbies"}`), client.get(`${base}/hobbies`)])
      .then(([m, mn]) => {
        setMaster(m.data.hobbies);
        setMine(mn.data.hobbies);
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, targetUserId]);

  const addHobby = async (payload) => {
    setBusy(true);
    try {
      const { data } = await client.post(`${base}/hobbies`, payload);
      setMine((h) => [...h, data.hobby]);
    } finally {
      setBusy(false);
    }
  };

  const removeHobby = async (item) => {
    setBusy(true);
    try {
      await client.delete(`${base}/hobbies/${item.id}`);
      setMine((h) => h.filter((x) => x.id !== item.id));
    } finally {
      setBusy(false);
    }
  };

  if (!editable && !loading && mine.length === 0) return null;

  return (
    <div className="card profile-card">
      <div className="profile-card-head">
        <h3>Hobbies &amp; Interests</h3>
      </div>
      {editable ? (
        <TagSelect
          options={master}
          selected={mine}
          busy={busy}
          placeholder="Search hobbies — Reading, Travel, Cricket…"
          onSelect={(option) => addHobby({ hobbyId: option.id })}
          allowCustom={false}
          onRemove={removeHobby}
        />
      ) : (
        <div className="profile-chip-row">
          {mine.map((item) => (
            <span className="filter-chip active profile-chip" key={item.id}>{item.name}</span>
          ))}
        </div>
      )}
    </div>
  );
}

export default HobbiesCard;
