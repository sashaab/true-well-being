const STORAGE_KEYS = {
  items: "twb.items",
  history: "twb.history",
  todaysState: "twb.todaysState",
};

const defaultItems = [
  "Сон 7+ часов",
  "Выпил(а) достаточно воды",
  "Физическая активность",
  "Полезное питание",
  "Дыхательная практика / медитация",
];

const state = {
  items: loadJSON(STORAGE_KEYS.items, defaultItems),
  history: loadJSON(STORAGE_KEYS.history, []),
  todaysState: loadJSON(STORAGE_KEYS.todaysState, {}),
};

const checklistEl = document.querySelector("#checklist");
const historyEl = document.querySelector("#history");
const summaryEl = document.querySelector("#summary");
const saveStatusEl = document.querySelector("#save-status");
const itemFormEl = document.querySelector("#item-form");
const itemInputEl = document.querySelector("#item-input");
const checkItemTemplate = document.querySelector("#check-item-template");

const tg = window.Telegram?.WebApp;
if (tg) {
  tg.ready();
  tg.expand();
}

renderAll();

itemFormEl.addEventListener("submit", (event) => {
  event.preventDefault();
  const value = itemInputEl.value.trim();
  if (!value) return;
  state.items.push(value);
  persistItems();
  itemInputEl.value = "";
  renderChecklist();
  renderSummary();
});

document.querySelector("#save-day").addEventListener("click", saveToday);
document.querySelector("#reset-today").addEventListener("click", () => {
  state.todaysState = {};
  persistTodayState();
  saveStatusEl.textContent = "Отметки за сегодня сброшены.";
  renderChecklist();
});

function renderAll() {
  renderChecklist();
  renderHistory();
  renderSummary();
}

function renderChecklist() {
  checklistEl.innerHTML = "";

  state.items.forEach((item, index) => {
    const clone = checkItemTemplate.content.cloneNode(true);
    const checkbox = clone.querySelector("input[type='checkbox']");
    const textSpan = clone.querySelector("span");
    const deleteButton = clone.querySelector("button");

    textSpan.textContent = item;
    checkbox.checked = Boolean(state.todaysState[item]);

    checkbox.addEventListener("change", () => {
      state.todaysState[item] = checkbox.checked;
      persistTodayState();
    });

    deleteButton.addEventListener("click", () => {
      const removed = state.items.splice(index, 1)[0];
      delete state.todaysState[removed];
      persistItems();
      persistTodayState();
      renderAll();
    });

    checklistEl.appendChild(clone);
  });
}

function saveToday() {
  if (state.items.length === 0) {
    saveStatusEl.textContent = "Добавь хотя бы один пункт для отслеживания.";
    return;
  }

  const todayISO = new Date().toISOString();
  const dateKey = todayISO.slice(0, 10);

  const checkedItems = state.items.filter((item) => state.todaysState[item]);
  const entry = {
    date: todayISO,
    dateKey,
    completed: checkedItems,
    total: state.items.length,
  };

  state.history = state.history.filter((row) => row.dateKey !== dateKey);
  state.history.push(entry);
  state.history.sort((a, b) => new Date(b.date) - new Date(a.date));

  persistHistory();
  saveStatusEl.textContent = `Сохранено: ${formatDate(todayISO)} (${checkedItems.length}/${state.items.length})`;

  if (tg?.MainButton) {
    tg.MainButton.setText("Сохранено ✅");
    tg.MainButton.show();
  }

  renderHistory();
  renderSummary();
}

function renderHistory() {
  historyEl.innerHTML = "";
  if (!state.history.length) {
    historyEl.innerHTML = "<li>Пока нет сохранённых дней.</li>";
    return;
  }

  state.history.forEach((entry) => {
    const li = document.createElement("li");
    const items = entry.completed.length ? entry.completed.join(", ") : "ничего не отмечено";
    li.textContent = `${formatDate(entry.date)} — ${entry.completed.length}/${entry.total}. ${items}`;
    historyEl.appendChild(li);
  });
}

function renderSummary() {
  summaryEl.innerHTML = "";

  if (!state.items.length || !state.history.length) {
    summaryEl.innerHTML = '<div class="summary__item">Заполни несколько дней, и здесь появится аналитика.</div>';
    return;
  }

  state.items.forEach((item) => {
    const completedDays = state.history.filter((entry) => entry.completed.includes(item)).length;
    const percent = Math.round((completedDays / state.history.length) * 100);

    const card = document.createElement("div");
    card.className = "summary__item";
    card.innerHTML = `<strong>${item}</strong><span>${completedDays}/${state.history.length} дней (${percent}%)</span>`;
    summaryEl.appendChild(card);
  });
}

function formatDate(isoString) {
  return new Date(isoString).toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function loadJSON(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    if (!value) return fallback;
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function persistItems() {
  localStorage.setItem(STORAGE_KEYS.items, JSON.stringify(state.items));
}

function persistHistory() {
  localStorage.setItem(STORAGE_KEYS.history, JSON.stringify(state.history));
}

function persistTodayState() {
  localStorage.setItem(STORAGE_KEYS.todaysState, JSON.stringify(state.todaysState));
}
