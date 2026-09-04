import React, { useEffect, useState } from "react";
import TagSelect from "./TagSelect.jsx";
import userApi from "../../services/userApi.js";
import adminApi from "../../admin/services/adminApi.js";

const PROFICIENCIES = [
  { value: "", label: "Level" },
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
  { value: "expert", label: "Expert" },
];
const PROFICIENCY_LABEL = Object.fromEntries(PROFICIENCIES.map((p) => [p.value, p.label]));

function editConfig(mode, targetUserId) {
  return mode === "admin" ? { client: adminApi, base: `/users/${targetUserId}` } : { client: userApi, base: "/me" };
}

function SkillsCard({ mode = "self", targetUserId, entries: viewEntries }) {
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
    Promise.all([client.get(`${mode === "admin" ? "/skills" : "/meta/skills"}`), client.get(`${base}/skills`)])
      .then(([m, mn]) => {
        setMaster(m.data.skills);
        setMine(mn.data.skills);
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, targetUserId]);

  const addSkill = async (payload) => {
    setBusy(true);
    try {
      const { data } = await client.post(`${base}/skills`, payload);
      setMine((s) => [...s, data.skill]);
    } finally {
      setBusy(false);
    }
  };

  const removeSkill = async (item) => {
    setBusy(true);
    try {
      await client.delete(`${base}/skills/${item.id}`);
      setMine((s) => s.filter((x) => x.id !== item.id));
    } finally {
      setBusy(false);
    }
  };

  const setProficiency = async (item, proficiency) => {
    setMine((s) => s.map((x) => (x.id === item.id ? { ...x, proficiency } : x)));
    await client.patch(`${base}/skills/${item.id}`, { proficiency });
  };

  if (!editable && !loading && mine.length === 0) return null;

  return (
    <div className="card profile-card">
      <div className="profile-card-head">
        <h3>Skills</h3>
      </div>
      {editable ? (
        <TagSelect
          options={master}
          selected={mine}
          busy={busy}
          placeholder="Search skills — JavaScript, Communication…"
          onSelect={(option) => addSkill({ skillId: option.id })}
          allowCustom={false}
          onRemove={removeSkill}
          renderChipExtra={(item) => (
            <select
              className="profile-chip-select"
              value={item.proficiency || ""}
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => setProficiency(item, e.target.value || null)}
            >
              {PROFICIENCIES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          )}
        />
      ) : (
        <div className="profile-chip-row">
          {mine.map((item) => (
            <span className="filter-chip active profile-chip" key={item.id}>
              {item.name}
              {item.proficiency && <em>{PROFICIENCY_LABEL[item.proficiency]}</em>}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export default SkillsCard;
