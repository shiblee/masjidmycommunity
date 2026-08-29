import React, { useEffect, useState } from "react";
import userApi from "../../services/userApi.js";

const CHECKS = [
  { key: "photo", label: "Profile photo", test: (user) => !!user.profilePhoto },
  { key: "personal", label: "Personal details", test: (user) => !!(user.gender || user.maritalStatus || user.dateOfBirth || user.locationLabel) },
  { key: "workExperience", label: "Work experience", test: (user, counts) => counts.workExperience > 0 },
  { key: "education", label: "Education", test: (user, counts) => counts.education > 0 },
  { key: "hobbies", label: "Hobbies", test: (user, counts) => counts.hobbies > 0 },
  { key: "skills", label: "Skills", test: (user, counts) => counts.skills > 0 },
];

function ProfileCompletion({ user }) {
  const [counts, setCounts] = useState(null);

  useEffect(() => {
    Promise.all([
      userApi.get("/me/work-experience"),
      userApi.get("/me/education"),
      userApi.get("/me/hobbies"),
      userApi.get("/me/skills"),
    ]).then(([w, e, h, s]) => {
      setCounts({
        workExperience: w.data.workExperience.length,
        education: e.data.education.length,
        hobbies: h.data.hobbies.length,
        skills: s.data.skills.length,
      });
    });
  }, [user]);

  if (!counts) return null;

  const done = CHECKS.filter((c) => c.test(user, counts));
  const percent = Math.round((done.length / CHECKS.length) * 100);

  return (
    <div className="profile-completion">
      <div className="profile-completion-head">
        <span>Profile Completion</span>
        <strong>{percent}%</strong>
      </div>
      <div className="profile-completion-bar">
        <div className="profile-completion-fill" style={{ width: `${percent}%` }} />
      </div>
      {percent < 100 && <p>Complete your profile to help the community know more about you.</p>}
    </div>
  );
}

export default ProfileCompletion;
