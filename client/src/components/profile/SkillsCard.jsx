import React, { useEffect, useState } from "react";
import TagSelect from "./TagSelect.jsx";
import userApi from "../../services/userApi.js";

const PROFICIENCIES = [
  { value: "", label: "Level" },
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
  { value: "expert", label: "Expert" },
];

function SkillsCard() {
  const [master, setMaster] = useState([]);
  const [mine, setMine] = useState([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    Promise.all([userApi.get("/meta/skills"), userApi.get("/me/skills")]).then(([m, mn]) => {
      setMaster(m.data.skills);
      setMine(mn.data.skills);
    });
  }, []);

  const addSkill = async (payload) => {
    setBusy(true);
    try {
      const { data } = await userApi.post("/me/skills", payload);
      setMine((s) => [...s, data.skill]);
    } finally {
      setBusy(false);
    }
  };

  const removeSkill = async (item) => {
    setBusy(true);
    try {
      await userApi.delete(`/me/skills/${item.id}`);
      setMine((s) => s.filter((x) => x.id !== item.id));
    } finally {
      setBusy(false);
    }
  };

  const setProficiency = async (item, proficiency) => {
    setMine((s) => s.map((x) => (x.id === item.id ? { ...x, proficiency } : x)));
    await userApi.patch(`/me/skills/${item.id}`, { proficiency });
  };

  return (
    <div className="card profile-card">
      <div className="profile-card-head">
        <h3>Skills</h3>
      </div>
      <TagSelect
        options={master}
        selected={mine}
        busy={busy}
        placeholder="Search skills — JavaScript, Communication…"
        onSelect={(option) => addSkill({ skillId: option.id })}
        onAddCustom={(name) => addSkill({ customName: name })}
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
    </div>
  );
}

export default SkillsCard;
