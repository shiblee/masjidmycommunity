import React, { useEffect, useState } from "react";
import TagSelect from "./TagSelect.jsx";
import userApi from "../../services/userApi.js";

function HobbiesCard() {
  const [master, setMaster] = useState([]);
  const [mine, setMine] = useState([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    Promise.all([userApi.get("/meta/hobbies"), userApi.get("/me/hobbies")]).then(([m, mn]) => {
      setMaster(m.data.hobbies);
      setMine(mn.data.hobbies);
    });
  }, []);

  const addHobby = async (payload) => {
    setBusy(true);
    try {
      const { data } = await userApi.post("/me/hobbies", payload);
      setMine((h) => [...h, data.hobby]);
    } finally {
      setBusy(false);
    }
  };

  const removeHobby = async (item) => {
    setBusy(true);
    try {
      await userApi.delete(`/me/hobbies/${item.id}`);
      setMine((h) => h.filter((x) => x.id !== item.id));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card profile-card">
      <div className="profile-card-head">
        <h3>Hobbies &amp; Interests</h3>
      </div>
      <TagSelect
        options={master}
        selected={mine}
        busy={busy}
        placeholder="Search hobbies — Reading, Travel, Cricket…"
        onSelect={(option) => addHobby({ hobbyId: option.id })}
        onAddCustom={(name) => addHobby({ customName: name })}
        onRemove={removeHobby}
      />
    </div>
  );
}

export default HobbiesCard;
