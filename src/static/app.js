document.addEventListener("DOMContentLoaded", () => {
  // Helper to create an element with classes and text
  function el(tag, opts = {}) {
    const e = document.createElement(tag);
    if (opts.classes) e.className = opts.classes;
    if (opts.text) e.textContent = opts.text;
    if (opts.html) e.innerHTML = opts.html;
    return e;
  }

  // Small on-page debug indicator (useful when console output isn't visible)
  const _debugEl = document.createElement("div");
  _debugEl.id = "debug-log";
  _debugEl.style.cssText =
    "position:fixed;bottom:8px;right:8px;background:#ffffffcc;border:1px solid #ddd;padding:6px 8px;border-radius:6px;z-index:9999;font-size:12px;color:#111";
  _debugEl.textContent = "app.js initialized";
  document.body.appendChild(_debugEl);
  function dbg(...args) {
    try { console.log(...args); } catch (e) { /* swallow */ }
    try { _debugEl.textContent = args.map(a => (typeof a === "string" ? a : JSON.stringify(a))).join(" "); } catch (e) { _debugEl.textContent = String(args[0]); }
  }

  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const form = document.getElementById("signup-form");
  const message = document.getElementById("message");

  function showMessage(type, text) {
    message.className = ""; // reset
    message.classList.add("message");
    message.classList.add(type);
    message.textContent = text;
    message.classList.remove("hidden");
    // hide after a while
    setTimeout(() => message.classList.add("hidden"), 4000);
  }

  function renderActivities(activities) {
    activitiesList.innerHTML = ""; // clear
    activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';

    Object.entries(activities).forEach(([name, info]) => {
      // Card
      const card = el("div", { classes: "activity-card" });

      const title = el("h4", { text: "title", classes: "activity-title" });
      card.appendChild(title);

      if (info.description) {
        const desc = el("p", { classes: "activity-meta", text: info.description });
        card.appendChild(desc);
      }
      if (info.schedule) {
        const sched = el("p", { classes: "activity-meta", text: `Schedule: ${info.schedule}` });
        card.appendChild(sched);
      }

      // Participants section (defensive: ensure participants is an array)
      // Normalize participants into an array (support arrays, plain objects, or missing)
      const rawParticipants = info && info.participants;
      const participants = Array.isArray(rawParticipants)
        ? rawParticipants
        : rawParticipants && typeof rawParticipants === "object"
        ? Object.values(rawParticipants)
        : [];

      const participantsSection = el("div", { classes: "participants-section" });
      const participantsTitle = el("div", { classes: "participants-title", text: `Participants (${participants.length})` });
      participantsSection.appendChild(participantsTitle);

      const ul = el("ul", { classes: "participants-list" });
      if (participants.length === 0) {
        const li = el("li", { text: "No participants yet" });
        li.classList.add("no-participant");
        ul.appendChild(li);
      } else {
        participants.forEach((p) => {
          const li = el("li", { text: String(p) });
          ul.appendChild(li);
        });
      }
      participantsSection.appendChild(ul);
      card.appendChild(participantsSection);

      activitiesList.appendChild(card);

      // Populate select
      const opt = document.createElement("option");
      opt.value = name;
      opt.textContent = name;
      activitySelect.appendChild(opt);
    });
  }

  async function loadActivities() {
    dbg("Loading activities...");
    activitiesList.innerHTML = "<p>Loading activities...</p>";
    try {
      const res = await fetch("/activities");
      if (!res.ok) throw new Error("Failed to load activities");
      const data = await res.json();
      dbg("Activities data:", data); // small debug to help if something is missing (also shown on-page)
      renderActivities(data);
    } catch (err) {
      activitiesList.innerHTML = `<p class="error">Unable to load activities. ${err.message}</p>`;
      dbg("Failed to load activities:", err.message);
    }
  }

  form.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const emailInput = document.getElementById("email");
    const selected = activitySelect.value;
    const email = emailInput.value.trim();
    if (!selected || !email) {
      showMessage("error", "Please provide an email and select an activity.");
      return;
    }

    try {
      const url = `/activities/${encodeURIComponent(selected)}/signup?email=${encodeURIComponent(email)}`;
      const res = await fetch(url, { method: "POST" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `Signup failed (${res.status})`);
      }
      const result = await res.json().catch(() => ({}));
      showMessage("success", result.message || "Signed up successfully");

      // Refresh activities locally: reload from server for authoritative participants list
      await loadActivities();
      // reset email input
      emailInput.value = "";
    } catch (err) {
      showMessage("error", err.message || "Signup failed");
    }
  });

  // Initial load
  loadActivities();
});
