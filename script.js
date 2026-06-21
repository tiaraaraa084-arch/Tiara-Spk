const LS_KEYS = {
  loggedIn: "saw_login_state",
  criteria: "saw_criteria_biji_coklat",
  alternatives: "saw_alternatives_biji_coklat"
};

const defaultCriteria = [
  { code: "C1", name: "Ukuran Biji", type: "benefit", weight: 0.30 },
  { code: "C2", name: "Warna Biji", type: "benefit", weight: 0.25 },
  { code: "C3", name: "Kadar Air", type: "cost", weight: 0.20 },
  { code: "C4", name: "Kemurnian", type: "benefit", weight: 0.25 }
];

const defaultAlternatives = [
  { code:"A1",  name:"Biji Coklat 1",  values:[2,1,1,2] },
  { code:"A2",  name:"Biji Coklat 2",  values:[2,2,1,3] },
  { code:"A3",  name:"Biji Coklat 3",  values:[3,3,1,3] },
  { code:"A4",  name:"Biji Coklat 4",  values:[3,2,2,3] },
  { code:"A5",  name:"Biji Coklat 5",  values:[1,3,3,2] },
  { code:"A6",  name:"Biji Coklat 6",  values:[4,4,2,4] },
  { code:"A7",  name:"Biji Coklat 7",  values:[2,3,2,3] },
  { code:"A8",  name:"Biji Coklat 8",  values:[5,4,1,4] },
  { code:"A9",  name:"Biji Coklat 9",  values:[3,2,1,3] },
  { code:"A10", name:"Biji Coklat 10", values:[4,3,2,4] },
  { code:"A11", name:"Biji Coklat 11", values:[2,4,2,3] },
  { code:"A12", name:"Biji Coklat 12", values:[3,3,3,2] },
  { code:"A13", name:"Biji Coklat 13", values:[4,2,1,5] },
  { code:"A14", name:"Biji Coklat 14", values:[1,2,4,2] },
  { code:"A15", name:"Biji Coklat 15", values:[5,5,1,4] }
];

let criteria = loadJSON(LS_KEYS.criteria, defaultCriteria);
let alternatives = loadJSON(LS_KEYS.alternatives, defaultAlternatives);
let lastResult = [];

const $ = (id) => document.getElementById(id);

function loadJSON(key, fallback){
  try{
    const raw = localStorage.getItem(key);
    if(!raw) return structuredClone(fallback);
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : structuredClone(fallback);
  }catch{
    return structuredClone(fallback);
  }
}

function saveAll(){
  localStorage.setItem(LS_KEYS.criteria, JSON.stringify(criteria));
  localStorage.setItem(LS_KEYS.alternatives, JSON.stringify(alternatives));
}

function fmt(n){
  return Number(n).toFixed(3).replace(/\.?0+$/,'');
}

function sumWeights(){
  return criteria.reduce((a,b)=>a + Number(b.weight || 0), 0);
}

function normalizeWeights(){
  const total = sumWeights();
  if(total <= 0) return;
  criteria = criteria.map(c => ({...c, weight: Number(c.weight) / total}));
}

function calculateSAW(){
  if(!alternatives.length) return [];

  const minVals = [];
  const maxVals = [];
  for(let j=0; j<criteria.length; j++){
    const column = alternatives.map(a => Number(a.values[j]));
    minVals[j] = Math.min(...column);
    maxVals[j] = Math.max(...column);
  }

  const results = alternatives.map(alt => {
    const norm = alt.values.map((v, j) => {
      const crit = criteria[j];
      const num = Number(v);
      if(crit.type === "cost"){
        return minVals[j] / (num || 1);
      }
      return num / (maxVals[j] || 1);
    });

    const finalScore = norm.reduce((acc, r, j) => acc + r * Number(criteria[j].weight), 0);
    return { ...alt, norm, finalScore };
  });

  results.sort((a,b) => b.finalScore - a.finalScore);
  return results;
}

function renderCriteria(){
  const tbody = $("criteriaBody");
  tbody.innerHTML = "";

  criteria.forEach((c, idx) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${c.code}</td>
      <td><input class="input" data-crit="name" data-index="${idx}" value="${c.name}"></td>
      <td>
        <select class="select" data-crit="type" data-index="${idx}">
          <option value="benefit" ${c.type === "benefit" ? "selected" : ""}>Benefit</option>
          <option value="cost" ${c.type === "cost" ? "selected" : ""}>Cost</option>
        </select>
      </td>
      <td><input class="input" data-crit="weight" data-index="${idx}" type="number" step="0.01" min="0" value="${c.weight}"></td>
    `;
    tbody.appendChild(tr);
  });

  document.querySelectorAll("[data-crit]").forEach(el => {
    el.addEventListener("input", () => {
      const i = Number(el.dataset.index);
      criteria[i][el.dataset.crit] = el.dataset.crit === "weight" ? Number(el.value) : el.value;
    });
  });
}

function renderAlternatives(filter = ""){
  const tbody = $("altBody");
  tbody.innerHTML = "";

  alternatives
    .filter(a =>
      a.code.toLowerCase().includes(filter) ||
      a.name.toLowerCase().includes(filter)
    )
    .forEach(a => {
      const realIndex = alternatives.findIndex(x => x.code === a.code);
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td><b>${a.code}</b></td>
        <td>${a.name}</td>
        <td>${a.values[0]}</td>
        <td>${a.values[1]}</td>
        <td>${a.values[2]}</td>
        <td>${a.values[3]}</td>
        <td>
          <button class="btn ghost" onclick="editAlt(${realIndex})">Edit</button>
          <button class="btn danger" onclick="deleteAlt(${realIndex})">Hapus</button>
        </td>
      `;
      tbody.appendChild(tr);
    });

  $("statAlt").textContent = alternatives.length;
}

function renderResults(){
  const results = calculateSAW();
  lastResult = results;

  const processBody = $("processBody");
  const rankBody = $("rankBody");
  processBody.innerHTML = "";
  rankBody.innerHTML = "";

  results.forEach((r, idx) => {
    const pTr = document.createElement("tr");
    pTr.innerHTML = `
      <td>${r.code}</td>
      <td>${fmt(r.norm[0])}</td>
      <td>${fmt(r.norm[1])}</td>
      <td>${fmt(r.norm[2])}</td>
      <td>${fmt(r.norm[3])}</td>
      <td><b>${fmt(r.finalScore)}</b></td>
    `;
    processBody.appendChild(pTr);

    const rkTr = document.createElement("tr");
    rkTr.innerHTML = `
      <td><b>${idx + 1}</b></td>
      <td>${r.code}</td>
      <td>${r.name}</td>
      <td><b>${fmt(r.finalScore)}</b></td>
    `;
    rankBody.appendChild(rkTr);
  });

  if(results.length){
    const best = results[0];
    $("statBest").textContent = best.code;
    $("statScore").textContent = fmt(best.finalScore);
    $("bestName").textContent = `${best.code} — ${best.name}`;
    $("bestValue").textContent = fmt(best.finalScore);
    $("bestDesc").textContent =
      `Alternatif terbaik berdasarkan metode SAW adalah ${best.code}. Nilai tertinggi diperoleh dari kombinasi nilai kriteria yang sudah dinormalisasi dan dibobot.`;
  } else {
    $("statBest").textContent = "-";
    $("statScore").textContent = "-";
    $("bestName").textContent = "-";
    $("bestValue").textContent = "-";
    $("bestDesc").textContent = "Tidak ada data alternatif.";
  }

  $("statCrit").textContent = criteria.length;
}

function refreshAll(){
  normalizeWeights();
  saveAll();
  renderCriteria();
  renderAlternatives($("searchAlt").value.trim().toLowerCase());
  renderResults();
}

function clearAltForm(){
  $("altCode").value = "";
  $("altName").value = "";
  $("altC1").value = "";
  $("altC2").value = "";
  $("altC3").value = "";
  $("altC4").value = "";
}

window.editAlt = function(index){
  const a = alternatives[index];
  $("altCode").value = a.code;
  $("altName").value = a.name;
  $("altC1").value = a.values[0];
  $("altC2").value = a.values[1];
  $("altC3").value = a.values[2];
  $("altC4").value = a.values[3];
  window.scrollTo({ top: 0, behavior: "smooth" });
};

window.deleteAlt = function(index){
  if(!confirm("Hapus alternatif ini?")) return;
  alternatives.splice(index, 1);
  saveAll();
  refreshAll();
};

$("btnLogin").addEventListener("click", () => {
  const u = $("loginUser").value.trim();
  const p = $("loginPass").value.trim();
  if(u === "admin" && p === "123456"){
    localStorage.setItem(LS_KEYS.loggedIn, "true");
    $("loginPage").classList.add("hidden");
    $("appPage").classList.remove("hidden");
    refreshAll();
  } else {
    $("loginError").style.display = "block";
  }
});

$("btnLogout").addEventListener("click", () => {
  localStorage.removeItem(LS_KEYS.loggedIn);
  $("appPage").classList.add("hidden");
  $("loginPage").classList.remove("hidden");
});

$("btnAddAlt").addEventListener("click", () => {
  const code = $("altCode").value.trim().toUpperCase();
  const name = $("altName").value.trim();
  const values = [
    Number($("altC1").value),
    Number($("altC2").value),
    Number($("altC3").value),
    Number($("altC4").value)
  ];

  if(!code || !name || values.some(v => Number.isNaN(v) || v < 1 || v > 5)){
    alert("Lengkapi data alternatif. Nilai kriteria harus 1 sampai 5.");
    return;
  }

  const newItem = { code, name, values };
  const idx = alternatives.findIndex(a => a.code === code);

  if(idx >= 0){
    alternatives[idx] = newItem;
  } else {
    alternatives.push(newItem);
  }

  alternatives.sort((a,b) => {
    const na = Number(a.code.replace(/\D/g,""));
    const nb = Number(b.code.replace(/\D/g,""));
    return na - nb;
  });

  saveAll();
  refreshAll();
  clearAltForm();
});

$("btnSaveCriteria").addEventListener("click", () => {
  normalizeWeights();
  saveAll();
  refreshAll();
  alert("Kriteria berhasil disimpan dan bobot dinormalisasi.");
});

$("btnCalc").addEventListener("click", () => {
  refreshAll();
  alert("Perhitungan SAW berhasil dijalankan.");
});

$("btnReset").addEventListener("click", () => {
  if(!confirm("Reset semua data ke default?")) return;
  criteria = structuredClone(defaultCriteria);
  alternatives = structuredClone(defaultAlternatives);
  saveAll();
  refreshAll();
});

$("btnRandomize").addEventListener("click", () => {
  alternatives = structuredClone(defaultAlternatives);
  saveAll();
  refreshAll();
  alert("Data contoh 15 alternatif sudah dimuat.");
});

$("btnExport").addEventListener("click", () => {
  const data = {
    criteria,
    alternatives,
    results: lastResult
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "data-saw-biji-coklat.json";
  a.click();
  URL.revokeObjectURL(url);
});

$("searchAlt").addEventListener("input", (e) => {
  renderAlternatives(e.target.value.trim().toLowerCase());
});

const loggedIn = localStorage.getItem(LS_KEYS.loggedIn) === "true";
if(loggedIn){
  $("loginPage").classList.add("hidden");
  $("appPage").classList.remove("hidden");
  refreshAll();
}

normalizeWeights();
saveAll();