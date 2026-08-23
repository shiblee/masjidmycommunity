import React, { useEffect } from "react";
import { Icon } from "../components/Icons.jsx";
import Flow from "../components/Flow.jsx";

const philosophyFlow = [
  { icon: "mosque", label: "Empower the Masjid" },
  { icon: "people", label: "Strengthen the Community" },
  { icon: "globe", label: "Create Global Impact" },
];

const mission = [
  "Connect masjids with communities and supporters.",
  "Enable transparent fundraising for meaningful projects.",
  "Support masjid development and modernization.",
  "Encourage community participation.",
  "Promote education, welfare, sustainability and social development.",
  "Create visibility around the real impact of masjid-based initiatives.",
  "Build a connected global ecosystem of empowered masjids and communities.",
];

const historicalRoles = [
  { icon: "mosque", title: "Worship & Spiritual Development", desc: "The masjid's first and central purpose — a house of prayer and remembrance." },
  { icon: "book", title: "Learning & Education", desc: "Historically, masjids housed lessons, libraries and centers of Islamic scholarship." },
  { icon: "people", title: "Community Gathering", desc: "A place where neighbors, families and travelers came together as one body." },
  { icon: "heart", title: "Social Support", desc: "A source of care for those in need — food, shelter and comfort for the community." },
  { icon: "compass", title: "Guidance", desc: "Where communities turned for direction, counsel and shared wisdom." },
  { icon: "bulb", title: "Knowledge Sharing", desc: "An open space for teaching, discussion and the exchange of ideas." },
  { icon: "heart", title: "Charity & Welfare", desc: "A hub for organizing zakat, sadaqah and support for the vulnerable." },
  { icon: "link", title: "Community Cooperation", desc: "A meeting point for collective decisions and shared responsibility." },
];

const references = [
  {
    type: "Hadith",
    arabic: "مَنْ بَنَى مَسْجِدًا لِلَّهِ بَنَى اللَّهُ لَهُ بَيْتًا فِي الْجَنَّةِ",
    translation: "Whoever builds a masjid for the sake of Allah, Allah will build for him a house in Paradise.",
    source: "Sahih Muslim 533 · also narrated in Sahih al-Bukhari 450",
  },
  {
    type: "Qur'an",
    arabic: "مَّثَلُ الَّذِينَ يُنفِقُونَ أَمْوَالَهُمْ فِي سَبِيلِ اللَّهِ كَمَثَلِ حَبَّةٍ أَنبَتَتْ سَبْعَ سَنَابِلَ فِي كُلِّ سُنبُلَةٍ مِّائَةُ حَبَّةٍ",
    translation: "The example of those who spend their wealth in the way of Allah is like a seed which grows seven spikes; in each spike is a hundred grains. And Allah multiplies for whom He wills.",
    source: "Qur'an, Surah Al-Baqarah 2:261",
  },
  {
    type: "Qur'an",
    arabic: "وَاعْتَصِمُوا بِحَبْلِ اللَّهِ جَمِيعًا وَلَا تَفَرَّقُوا",
    translation: "And hold firmly to the rope of Allah, all together, and do not become divided.",
    source: "Qur'an, Surah Ali 'Imran 3:103",
  },
];

const movementFlow = [
  { icon: "mosque", label: "One Empowered Masjid" },
  { icon: "people", label: "Strengthens Families & Community" },
  { icon: "bulb", label: "Creates Opportunities" },
  { icon: "globe", label: "Inspires Other Communities" },
  { icon: "link", label: "A Connected World" },
];

const values = [
  { icon: "shieldCheck", title: "Trust", desc: "Building confidence through responsible systems and verified information." },
  { icon: "chartUp", title: "Transparency", desc: "Helping supporters understand how campaigns and projects progress." },
  { icon: "people", title: "Community", desc: "Encouraging collective participation and shared responsibility." },
  { icon: "bulb", title: "Empowerment", desc: "Providing masjids and communities with opportunities and resources to grow." },
  { icon: "globe", title: "Impact", desc: "Focusing on meaningful, measurable and visible outcomes." },
  { icon: "link", title: "Unity", desc: "Connecting people, masjids and communities around shared positive goals." },
];

function AboutUs() {
  useEffect(() => {
    const els = document.querySelectorAll(".reveal");
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("in");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0, rootMargin: "0px 0px 100px 0px" }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <main className="au-page">
      <section className="au-hero on-ink">
        <div className="wrap">
          <span className="eyebrow">About Us</span>
          <h1>The masjid is more than a place of worship.</h1>
          <p>
            It has historically been a center of faith, learning, community, guidance and social development. Masjid
            My Community exists to reconnect the masjid with that wider role — helping it become a stronger center
            for the people it serves.
          </p>
        </div>
      </section>

      <section className="py">
        <div className="wrap">
          <div className="hw-flow-wrap reveal">
            <Flow nodes={philosophyFlow} />
          </div>
        </div>
      </section>

      <section className="py cat-strip">
        <div className="wrap split au-split">
          <div className="why-card why-card-donor reveal">
            <div className="why-icon-badge">
              <Icon name="compass" size={25} />
            </div>
            <span className="eyebrow">Our vision</span>
            <p className="au-vision-text">
              To empower masjids across the world and strengthen the communities connected to them — creating a
              global ecosystem where masjids are supported with the resources, technology, transparency and
              community participation needed to maximize their positive impact.
            </p>
          </div>
          <div className="why-card why-card-masjid reveal">
            <div className="why-icon-badge">
              <Icon name="flag" size={25} />
            </div>
            <span className="eyebrow">Our mission</span>
            <ul className="au-mission-list">
              {mission.map((m) => (
                <li key={m}>
                  <span className="au-mission-check">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                  </span>
                  <span>{m}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="py">
        <div className="wrap">
          <div className="section-head reveal">
            <span className="eyebrow">Rediscovering the role of the masjid</span>
            <h2>What the masjid has always meant to its community</h2>
            <p>
              Historically, masjids have played a role far beyond congregational worship. Masjid My Community aims
              to support and strengthen these roles in a modern context.
            </p>
          </div>
          <div className="au-roles-grid reveal">
            {historicalRoles.map((r) => (
              <div className="au-role-item" key={r.title}>
                <div className="au-role-icon">
                  <Icon name={r.icon} size={22} />
                </div>
                <div>
                  <div className="au-role-title">{r.title}</div>
                  <div className="au-role-desc">{r.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py au-refs-section">
        <div className="wrap">
          <div className="section-head center reveal" style={{ margin: "0 auto" }}>
            <span className="eyebrow">Islamic inspiration</span>
            <h2>Rooted in guidance from the Qur'an and Sunnah</h2>
            <p>
              A few carefully sourced references that inspire this work — presented with their Arabic text,
              translation of the meaning, and reference.
            </p>
          </div>
          <div className="au-refs-grid reveal">
            {references.map((r, i) => (
              <div className="au-ref-card" key={i}>
                <span className="au-ref-type">{r.type}</span>
                <p className="au-ref-arabic">{r.arabic}</p>
                <p className="au-ref-translation">“{r.translation}”</p>
                <span className="au-ref-source mono">{r.source}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py cat-strip">
        <div className="wrap">
          <div className="section-head on-ink center reveal" style={{ margin: "0 auto" }}>
            <span className="eyebrow">The global movement</span>
            <h2>One Masjid. One Community. A Connected World.</h2>
          </div>
          <div className="hw-flow-wrap reveal">
            <Flow nodes={movementFlow} onInk />
          </div>
        </div>
      </section>

      <section className="py">
        <div className="wrap">
          <div className="section-head center reveal" style={{ margin: "0 auto" }}>
            <span className="eyebrow">Our values</span>
            <h2>What guides everything we build</h2>
          </div>
          <div className="au-values-grid reveal">
            {values.map((v) => (
              <div className="au-value-item" key={v.title}>
                <div className="au-value-icon">
                  <Icon name={v.icon} size={24} />
                </div>
                <div className="au-value-title">{v.title}</div>
                <div className="au-value-desc">{v.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="final-cta">
        <div className="wrap">
          <span className="eyebrow">The core message</span>
          <h2>Empower the Masjid. Strengthen the Community. Create Lasting Impact.</h2>
          <div className="ctas">
            <a href="/#register" className="btn btn-gold">
              Register Your Masjid <span className="btn-arrow">→</span>
            </a>
            <a href="/our-impact" className="btn btn-outline-paper">
              See Our Impact <span className="btn-arrow">→</span>
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}

export default AboutUs;
