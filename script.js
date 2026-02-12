// PLAYHAUZ POS (front-end only)
// Data is stored locally in the browser (localStorage). No backend needed.

const DEFAULT_ITEMS = [
  // Celebrations
  { id:'bday-basic', cat:'Celebrations', name:'Birthday Basic', desc:'Cake + Decor + Music', price:2499, icon:'🎂', tag:'Birthday' },
  { id:'bday-prem',  cat:'Celebrations', name:'Birthday Premium', desc:'LED setup + Fog + Theme', price:4999, icon:'🎉', tag:'Premium' },
  { id:'proposal',   cat:'Celebrations', name:'Proposal / Candle', desc:'Romantic setup + lights', price:3999, icon:'💍', tag:'Romance' },
  { id:'private-cinema', cat:'Celebrations', name:'Private Cinema', desc:'Your show • popcorn', price:2999, icon:'🎬', tag:'Cinema' },

  // Gaming
  { id:'vr-30',   cat:'Gaming', name:'VR Arena (30 min)', desc:'Immersive VR experience', price:499, icon:'🕶️', tag:'VR' },
  { id:'vr-60',   cat:'Gaming', name:'VR Arena (60 min)', desc:'Full session', price:899, icon:'🕶️', tag:'VR' },
  { id:'racing-30', cat:'Gaming', name:'Racing Simulator (30 min)', desc:'Steering wheel + seat', price:599, icon:'🏎️', tag:'Sim' },
  { id:'multi-60',  cat:'Gaming', name:'Multiplayer PC (60 min)', desc:'2–6 players • LAN', price:699, icon:'🖥️', tag:'Multi' },

  // Entertainment
  { id:'standup', cat:'Entertainment', name:'Standup Comedy (Entry)', desc:'Live nights', price:399, icon:'🎤', tag:'Show' },
  { id:'seminar', cat:'Entertainment', name:'Seminar / Event Hall', desc:'Stage + audio', price:7999, icon:'🏟️', tag:'Hall' },
  { id:'cloudwalk', cat:'Entertainment', name:'Cloud Walk', desc:'Fog entry experience', price:299, icon:'☁️', tag:'Entry' },
  { id:'selfie', cat:'Selfie Point', name:'Selfie Point', desc:'Neon selfie stage', price:199, icon:'📸', tag:'Photo' },
];

const STORAGE_KEY = "playhauz_pos_items_v1";
const BILL_KEY = "playhauz_pos_bill_v1";
const HOLD_KEY = "playhauz_pos_holds_v1";

function loadItems(){
  const raw = localStorage.getItem(STORAGE_KEY);
  if(!raw){ localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_ITEMS)); return [...DEFAULT_ITEMS]; }
  try { return JSON.parse(raw); } catch { return [...DEFAULT_ITEMS]; }
}
function saveItems(items){ localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); }

function money(n){
  const x = Number(n || 0);
  return "₹" + x.toLocaleString("en-IN");
}

let items = loadItems();
let categories = [];
let activeCat = "All";
let viewMode = "grid";

let bill = loadBill();

function loadBill(){
  const raw = localStorage.getItem(BILL_KEY);
  if(!raw){
    const b = { id: nextBillNo(), customerType:"Walk-in", lines:[], payType:"UPI", createdAt: Date.now() };
    localStorage.setItem(BILL_KEY, JSON.stringify(b));
    return b;
  }
  try { return JSON.parse(raw); } catch { return { id: nextBillNo(), customerType:"Walk-in", lines:[], payType:"UPI", createdAt: Date.now() }; }
}
function saveBill(){ localStorage.setItem(BILL_KEY, JSON.stringify(bill)); }

function nextBillNo(){
  const n = Number(localStorage.getItem("playhauz_bill_seq") || "1");
  localStorage.setItem("playhauz_bill_seq", String(n+1));
  return String(n).padStart(4,"0");
}

function buildCats(){
  const map = new Map();
  items.forEach(it => map.set(it.cat, (map.get(it.cat)||0)+1));
  categories = ["All", ...Array.from(map.keys()).sort((a,b)=>a.localeCompare(b))];
  const catsEl = document.getElementById("cats");
  catsEl.innerHTML = "";
  categories.forEach(cat=>{
    const div = document.createElement("div");
    div.className = "cat" + (cat===activeCat ? " cat--on" : "");
    div.innerHTML = `<div class="cat__name">${cat}</div><div class="cat__count">${cat==="All" ? items.length : (map.get(cat)||0)}</div>`;
    div.onclick = ()=>{ activeCat = cat; renderCats(); renderItems(); };
    catsEl.appendChild(div);
  });
}
function renderCats(){ buildCats(); }

function matches(it, q){
  if(!q) return true;
  const s = (it.name + " " + it.desc + " " + it.cat + " " + (it.tag||"")).toLowerCase();
  return s.includes(q.toLowerCase());
}

function renderItems(){
  const q = document.getElementById("search").value.trim();
  const box = document.getElementById("items");
  box.classList.toggle("list", viewMode==="list");
  box.innerHTML = "";
  const filtered = items.filter(it => (activeCat==="All" ? true : it.cat===activeCat)).filter(it => matches(it,q));
  if(filtered.length===0){
    const empty = document.createElement("div");
    empty.className = "cart__empty";
    empty.textContent = "No items found.";
    box.appendChild(empty);
    return;
  }

  filtered.forEach(it=>{
    const div = document.createElement("div");
    div.className = "item";
    div.innerHTML = `
      <div class="item__media">${it.icon || "✨"}</div>
      <div class="badge item__tag">${it.tag || it.cat}</div>
      <div class="item__body">
        <div class="item__name">${it.name}</div>
        <div class="item__desc">${it.desc || ""}</div>
        <div class="item__meta">
          <div class="price">${money(it.price)}</div>
          <div class="badge">${it.cat}</div>
        </div>
      </div>
    `;

    div.addEventListener("click", (e)=>{
      const addQty = e.shiftKey ? 5 : 1;
      addToBill(it.id, addQty);
    });
    div.addEventListener("dblclick", ()=>{
      addToBill(it.id, 1);
    });

    box.appendChild(div);
  });
}

function addToBill(itemId, qty=1){
  const it = items.find(x=>x.id===itemId);
  if(!it) return;
  const line = bill.lines.find(l=>l.itemId===itemId);
  if(line){ line.qty += qty; }
  else { bill.lines.push({ itemId, qty }); }
  saveBill();
  renderCart();
}

function setQty(itemId, newQty){
  const line = bill.lines.find(l=>l.itemId===itemId);
  if(!line) return;
  line.qty = Math.max(1, newQty);
  saveBill();
  renderCart();
}

function removeLine(itemId){
  bill.lines = bill.lines.filter(l=>l.itemId!==itemId);
  saveBill();
  renderCart();
}

function computeTotals(){
  const sub = bill.lines.reduce((acc,l)=>{
    const it = items.find(x=>x.id===l.itemId);
    if(!it) return acc;
    return acc + (Number(it.price)||0) * (Number(l.qty)||0);
  },0);

  const discPct = clampNum(document.getElementById("discount").value, 0, 90);
  const gstPct = clampNum(document.getElementById("gst").value, 0, 28);

  const afterDisc = sub * (1 - discPct/100);
  const gstAmt = afterDisc * (gstPct/100);
  const total = Math.round(afterDisc + gstAmt);

  return { sub: Math.round(sub), discPct, gstPct, afterDisc: Math.round(afterDisc), gstAmt: Math.round(gstAmt), total };
}

function clampNum(v, min, max){
  const n = Number(v);
  if(Number.isNaN(n)) return min;
  return Math.max(min, Math.min(max, n));
}

function renderCart(){
  const cart = document.getElementById("cart");
  cart.innerHTML = "";

  document.getElementById("billMeta").textContent = `${bill.customerType} • #${bill.id}`;

  if(bill.lines.length===0){
    const empty = document.createElement("div");
    empty.className = "cart__empty";
    empty.innerHTML = "Cart is empty.<br/><span class='muted'>Add items from the center panel.</span>";
    cart.appendChild(empty);
  } else {
    bill.lines.forEach(l=>{
      const it = items.find(x=>x.id===l.itemId);
      if(!it) return;
      const lineTotal = (Number(it.price)||0) * (Number(l.qty)||0);
      const div = document.createElement("div");
      div.className = "line";
      div.innerHTML = `
        <div>
          <div class="line__name">${it.name}</div>
          <div class="line__sub">${it.cat} • ${it.desc || ""}</div>
          <div class="qty" style="margin-top:10px">
            <button class="qbtn" aria-label="decrease">−</button>
            <div class="qval">${l.qty}</div>
            <button class="qbtn" aria-label="increase">+</button>
          </div>
        </div>
        <div class="line__right">
          <div class="line__price">${money(lineTotal)}</div>
          <button class="rmbtn">Remove</button>
        </div>
      `;
      const [decBtn, incBtn] = div.querySelectorAll(".qbtn");
      decBtn.onclick = ()=> setQty(l.itemId, l.qty-1);
      incBtn.onclick = ()=> setQty(l.itemId, l.qty+1);
      div.querySelector(".rmbtn").onclick = ()=> removeLine(l.itemId);
      cart.appendChild(div);
    });
  }

  const totals = computeTotals();
  document.getElementById("subTotal").textContent = money(totals.sub);
  document.getElementById("grandTotal").textContent = money(totals.total);
}

function setClock(){
  const d = new Date();
  const hh = String(d.getHours()).padStart(2,'0');
  const mm = String(d.getMinutes()).padStart(2,'0');
  document.getElementById("clockPill").textContent = `${hh}:${mm}`;
}
setInterval(setClock, 1000*10);
setClock();

/* ===== Glitch sparks ===== */
(function makeSparks(){
  const wrap = document.getElementById("sparks");
  const SPARKS = 14;
  for(let i=0;i<SPARKS;i++){
    const s = document.createElement("div");
    s.className = "spark";
    const top = Math.random()*100;
    const rot = (Math.random()*40)-20;
    const dur = (6 + Math.random()*8).toFixed(2) + "s";
    const delay = (Math.random()*6).toFixed(2) + "s";
    s.style.top = top + "%";
    s.style.setProperty("--r", rot + "deg");
    s.style.setProperty("--d", dur);
    s.style.animationDelay = delay;
    wrap.appendChild(s);
  }
})();

/* ===== View mode ===== */
document.getElementById("viewSeg").addEventListener("click", (e)=>{
  const btn = e.target.closest(".seg__btn");
  if(!btn) return;
  document.querySelectorAll(".seg__btn").forEach(b=>b.classList.remove("seg__btn--on"));
  btn.classList.add("seg__btn--on");
  viewMode = btn.dataset.view;
  renderItems();
});

/* ===== Search ===== */
document.getElementById("search").addEventListener("input", ()=> renderItems());
document.getElementById("btnClearSearch").addEventListener("click", ()=>{
  document.getElementById("search").value="";
  renderItems();
});

/* ===== Discount/GST recalc ===== */
document.getElementById("discount").addEventListener("input", ()=> renderCart());
document.getElementById("gst").addEventListener("input", ()=> renderCart());

/* ===== New bill ===== */
document.getElementById("btnNewBill").addEventListener("click", ()=>{
  bill = { id: nextBillNo(), customerType:"Walk-in", lines:[], payType: bill.payType || "UPI", createdAt: Date.now() };
  saveBill();
  renderCart();
});

/* ===== Clear ===== */
document.getElementById("btnClear").addEventListener("click", ()=>{
  if(!confirm("Clear current bill?")) return;
  bill.lines = [];
  saveBill();
  renderCart();
});

/* ===== Hold ===== */
document.getElementById("btnHold").addEventListener("click", ()=>{
  if(bill.lines.length===0){ alert("Nothing to hold."); return; }
  const holds = loadHolds();
  holds.push({ ...bill, holdId: cryptoRand(), heldAt: Date.now() });
  saveHolds(holds);
  bill = { id: nextBillNo(), customerType:"Walk-in", lines:[], payType: bill.payType || "UPI", createdAt: Date.now() };
  saveBill();
  renderCart();
  showHoldsModal();
});

function loadHolds(){
  const raw = localStorage.getItem(HOLD_KEY);
  if(!raw) return [];
  try { return JSON.parse(raw); } catch { return []; }
}
function saveHolds(h){ localStorage.setItem(HOLD_KEY, JSON.stringify(h)); }

/* ===== Payment chips ===== */
document.querySelectorAll(".chip").forEach(ch=>{
  ch.addEventListener("click", ()=>{
    bill.payType = ch.dataset.pay;
    saveBill();
    document.querySelectorAll(".chip").forEach(x=>x.classList.remove("chip--on"));
  });
});

/* ===== Pay ===== */
document.getElementById("btnPay").addEventListener("click", ()=>{
  if(bill.lines.length===0){ alert("Cart is empty."); return; }
  showPayModal();
});

/* ===== Print ===== */
document.getElementById("btnPrint").addEventListener("click", ()=>{
  if(bill.lines.length===0){ alert("Cart is empty."); return; }
  printReceipt({ paid:false });
});

/* ===== Settings ===== */
document.getElementById("btnSettings").addEventListener("click", ()=>{
  showSettingsModal();
});

/* ===== Manage items ===== */
document.getElementById("btnManageItems").addEventListener("click", ()=>{
  showManageItemsModal();
});

/* ===== Modal helpers ===== */
const modal = document.getElementById("modal");
const modalBody = document.getElementById("modalBody");
const modalTitle = document.getElementById("modalTitle");
const modalFoot = document.getElementById("modalFoot");

function openModal(title, bodyHtml, footHtml){
  modalTitle.textContent = title;
  modalBody.innerHTML = bodyHtml;
  modalFoot.innerHTML = footHtml || "";
  modal.setAttribute("aria-hidden","false");
}
function closeModal(){ modal.setAttribute("aria-hidden","true"); }
document.getElementById("modalClose").addEventListener("click", closeModal);
modal.addEventListener("click", (e)=>{
  if(e.target.dataset.close) closeModal();
});

function showPayModal(){
  const totals = computeTotals();
  const payType = bill.payType || "UPI";
  openModal(
    "Complete Payment",
    `
    <div class="grid2">
      <div class="field">
        <label>Payment method</label>
        <select id="payType">
          ${["UPI","Card","Cash","Wallet"].map(x=>`<option ${x===payType?"selected":""}>${x}</option>`).join("")}
        </select>
      </div>
      <div class="field">
        <label>Customer type</label>
        <select id="custType">
          ${["Walk-in","Booking","Member"].map(x=>`<option ${x===bill.customerType?"selected":""}>${x}</option>`).join("")}
        </select>
      </div>
    </div>

    <div class="field">
      <label>Notes (optional)</label>
      <textarea id="notes" rows="3" placeholder="e.g., Slot 7pm–8pm • VR Room 2"></textarea>
    </div>

    <table class="table" style="margin-top:10px">
      <tr><th>Subtotal</th><td>${money(totals.sub)}</td></tr>
      <tr><th>Discount</th><td>${totals.discPct}%</td></tr>
      <tr><th>GST</th><td>${totals.gstPct}%</td></tr>
      <tr><th>Total</th><td><b>${money(totals.total)}</b></td></tr>
    </table>
    `,
    `
      <button class="btn btn--ghost" id="btnPayCancel">Cancel</button>
      <button class="btn btn--primary" id="btnPayConfirm">Mark Paid</button>
    `
  );

  document.getElementById("btnPayCancel").onclick = closeModal;
  document.getElementById("btnPayConfirm").onclick = ()=>{
    bill.payType = document.getElementById("payType").value;
    bill.customerType = document.getElementById("custType").value;
    const notes = document.getElementById("notes").value.trim();
    saveBill();
    printReceipt({ paid:true, notes });

    // Start new bill
    bill = { id: nextBillNo(), customerType:"Walk-in", lines:[], payType: bill.payType || "UPI", createdAt: Date.now() };
    saveBill();
    renderCart();
    closeModal();
  };
}

function printReceipt({ paid, notes }){
  const totals = computeTotals();
  const lines = bill.lines.map(l=>{
    const it = items.find(x=>x.id===l.itemId);
    if(!it) return "";
    const lt = (Number(it.price)||0)*(Number(l.qty)||0);
    return `<tr>
      <td>${escapeHtml(it.name)}<div style="color:#777;font-size:12px">${escapeHtml(it.cat)}</div></td>
      <td style="text-align:right">${l.qty}</td>
      <td style="text-align:right">${money(it.price)}</td>
      <td style="text-align:right">${money(lt)}</td>
    </tr>`;
  }).join("");

  const d = new Date();
  const dt = d.toLocaleString("en-IN");
  const win = window.open("", "_blank");
  if(!win) { alert("Popup blocked. Allow popups to print."); return; }

  win.document.write(`
  <html><head><title>Receipt #${bill.id}</title>
    <style>
      body{ font-family: Arial, sans-serif; padding:18px; }
      h2{ margin:0 0 6px; }
      .muted{ color:#666; font-size:12px; }
      table{ width:100%; border-collapse:collapse; margin-top:12px; }
      th,td{ border-bottom:1px solid #eee; padding:8px; font-size:13px; }
      th{ text-align:left; color:#444; }
      .tot{ margin-top:12px; }
      .row{ display:flex; justify-content:space-between; padding:4px 0; }
      .big{ font-size:16px; font-weight:700; }
      .badge{ display:inline-block; padding:4px 8px; border:1px solid #ddd; border-radius:999px; font-size:12px; }
    </style>
  </head><body>
    <h2>PLAYHAUZ</h2>
    <div class="muted">Receipt • #${bill.id} • ${dt}</div>
    <div class="muted">Payment: <span class="badge">${escapeHtml(bill.payType||"")}</span> • Status: <span class="badge">${paid ? "PAID" : "UNPAID"}</span></div>
    ${notes ? `<div class="muted" style="margin-top:8px">Notes: ${escapeHtml(notes)}</div>` : ""}

    <table>
      <thead><tr><th>Item</th><th style="text-align:right">Qty</th><th style="text-align:right">Rate</th><th style="text-align:right">Amount</th></tr></thead>
      <tbody>${lines}</tbody>
    </table>

    <div class="tot">
      <div class="row"><span>Subtotal</span><span>${money(totals.sub)}</span></div>
      <div class="row"><span>Discount (${totals.discPct}%)</span><span>${money(totals.sub - totals.afterDisc)}</span></div>
      <div class="row"><span>GST (${totals.gstPct}%)</span><span>${money(totals.gstAmt)}</span></div>
      <div class="row big"><span>Total</span><span>${money(totals.total)}</span></div>
    </div>

    <div class="muted" style="margin-top:14px">Thank you • Celebrate • Play • Experience</div>

    <script>window.print();<\/script>
  </body></html>
  `);
  win.document.close();
}

function escapeHtml(s){
  return String(s || "").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#39;");
}

function showSettingsModal(){
  const store = localStorage.getItem("playhauz_counter_name") || "Counter 1";
  openModal(
    "Settings",
    `
      <div class="field">
        <label>Counter name</label>
        <input id="counterName" value="${escapeHtml(store)}" />
      </div>
      <div class="field">
        <label>Keyboard tips</label>
        <div class="muted">Use <span class="kbd">Shift</span> + Click on an item to add 5 quantity.</div>
      </div>
      <div class="field">
        <label>Danger zone</label>
        <button class="btn btn--danger" id="btnResetData">Reset Items to Default</button>
        <div class="muted" style="margin-top:6px">This resets your saved catalog, not your current bill.</div>
      </div>
    `,
    `
      <button class="btn btn--ghost" id="btnSetClose">Close</button>
      <button class="btn btn--primary" id="btnSetSave">Save</button>
    `
  );

  document.getElementById("btnSetClose").onclick = closeModal;
  document.getElementById("btnSetSave").onclick = ()=>{
    const name = document.getElementById("counterName").value.trim() || "Counter 1";
    localStorage.setItem("playhauz_counter_name", name);
    document.getElementById("storePill").textContent = name;
    closeModal();
  };

  document.getElementById("btnResetData").onclick = ()=>{
    if(!confirm("Reset item catalog to default?")) return;
    saveItems([...DEFAULT_ITEMS]);
    items = loadItems();
    renderCats();
    renderItems();
    closeModal();
  };
}

function showManageItemsModal(){
  const rows = items.map(it=>`
    <tr>
      <td><b>${escapeHtml(it.name)}</b><div class="muted">${escapeHtml(it.desc||"")}</div></td>
      <td>${escapeHtml(it.cat)}</td>
      <td style="text-align:right">${money(it.price)}</td>
      <td style="text-align:right"><button class="btn btn--ghost" data-edit="${it.id}">Edit</button></td>
    </tr>
  `).join("");

  openModal(
    "Manage Items",
    `
      <div class="muted" style="margin-bottom:10px">Edit packages & prices. Saved locally on this device.</div>
      <div style="max-height:48vh; overflow:auto;">
        <table class="table">
          <thead><tr><th>Item</th><th>Category</th><th style="text-align:right">Price</th><th></th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
      <hr style="border:0;border-top:1px solid rgba(255,255,255,.10); margin:14px 0;">
      <div class="grid2">
        <div class="field">
          <label>New item name</label>
          <input id="newName" placeholder="e.g., VR Arena (15 min)" />
        </div>
        <div class="field">
          <label>Category</label>
          <input id="newCat" placeholder="Gaming" />
        </div>
      </div>
      <div class="grid2">
        <div class="field">
          <label>Price (INR)</label>
          <input id="newPrice" type="number" min="0" step="1" value="0" />
        </div>
        <div class="field">
          <label>Icon (emoji)</label>
          <input id="newIcon" placeholder="🎮" />
        </div>
      </div>
      <div class="field">
        <label>Description</label>
        <input id="newDesc" placeholder="Short description" />
      </div>
      <div class="field">
        <label>Tag (optional)</label>
        <input id="newTag" placeholder="VR / Birthday / Show" />
      </div>
    `,
    `
      <button class="btn btn--ghost" id="btnManClose">Close</button>
      <button class="btn btn--primary" id="btnAddItem">Add Item</button>
    `
  );

  document.getElementById("btnManClose").onclick = closeModal;

  modalBody.querySelectorAll("[data-edit]").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const id = btn.getAttribute("data-edit");
      const it = items.find(x=>x.id===id);
      if(!it) return;
      showEditItemModal(it);
    });
  });

  document.getElementById("btnAddItem").onclick = ()=>{
    const name = document.getElementById("newName").value.trim();
    const cat = document.getElementById("newCat").value.trim() || "Other";
    const price = Number(document.getElementById("newPrice").value || 0);
    const icon = document.getElementById("newIcon").value.trim() || "✨";
    const desc = document.getElementById("newDesc").value.trim();
    const tag = document.getElementById("newTag").value.trim();

    if(!name){ alert("Enter item name."); return; }

    const id = name.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"") + "-" + Math.floor(Math.random()*9999);
    items.push({ id, cat, name, desc, price, icon, tag });
    saveItems(items);
    renderCats(); renderItems(); renderCart();
    closeModal();
    showManageItemsModal();
  };
}

function showEditItemModal(it){
  openModal(
    "Edit Item",
    `
      <div class="grid2">
        <div class="field">
          <label>Name</label>
          <input id="eName" value="${escapeHtml(it.name)}" />
        </div>
        <div class="field">
          <label>Category</label>
          <input id="eCat" value="${escapeHtml(it.cat)}" />
        </div>
      </div>
      <div class="grid2">
        <div class="field">
          <label>Price (INR)</label>
          <input id="ePrice" type="number" min="0" step="1" value="${Number(it.price||0)}" />
        </div>
        <div class="field">
          <label>Icon (emoji)</label>
          <input id="eIcon" value="${escapeHtml(it.icon||"✨")}" />
        </div>
      </div>
      <div class="field">
        <label>Description</label>
        <input id="eDesc" value="${escapeHtml(it.desc||"")}" />
      </div>
      <div class="field">
        <label>Tag</label>
        <input id="eTag" value="${escapeHtml(it.tag||"")}" />
      </div>
    `,
    `
      <button class="btn btn--danger" id="btnDel">Delete</button>
      <div style="flex:1"></div>
      <button class="btn btn--ghost" id="btnEClose">Close</button>
      <button class="btn btn--primary" id="btnESave">Save</button>
    `
  );

  document.getElementById("btnEClose").onclick = closeModal;
  document.getElementById("btnESave").onclick = ()=>{
    it.name = document.getElementById("eName").value.trim() || it.name;
    it.cat = document.getElementById("eCat").value.trim() || it.cat;
    it.price = Number(document.getElementById("ePrice").value || it.price);
    it.icon = document.getElementById("eIcon").value.trim() || it.icon;
    it.desc = document.getElementById("eDesc").value.trim();
    it.tag = document.getElementById("eTag").value.trim();
    saveItems(items);
    renderCats(); renderItems(); renderCart();
    closeModal();
    showManageItemsModal();
  };
  document.getElementById("btnDel").onclick = ()=>{
    if(!confirm("Delete this item?")) return;
    items = items.filter(x=>x.id!==it.id);
    saveItems(items);
    // Remove from bill if present
    bill.lines = bill.lines.filter(l=>l.itemId!==it.id);
    saveBill();
    renderCats(); renderItems(); renderCart();
    closeModal();
    showManageItemsModal();
  };
}

function showHoldsModal(){
  const holds = loadHolds();
  const rows = holds.map(h=>{
    const d = new Date(h.heldAt||Date.now()).toLocaleString("en-IN");
    const count = (h.lines||[]).reduce((a,l)=>a+(l.qty||0),0);
    return `<tr>
      <td><b>#${h.id}</b><div class="muted">${d}</div></td>
      <td>${escapeHtml(h.customerType||"")}</td>
      <td style="text-align:right">${count}</td>
      <td style="text-align:right">
        <button class="btn btn--ghost" data-resume="${h.holdId}">Resume</button>
        <button class="btn btn--danger" data-drop="${h.holdId}">Drop</button>
      </td>
    </tr>`;
  }).join("");

  openModal(
    "Held Bills",
    holds.length ? `
      <div style="max-height:48vh; overflow:auto;">
        <table class="table">
          <thead><tr><th>Bill</th><th>Type</th><th style="text-align:right">Items</th><th></th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    ` : `<div class="cart__empty">No held bills.</div>`,
    `<button class="btn btn--ghost" id="btnHoldClose">Close</button>`
  );

  document.getElementById("btnHoldClose").onclick = closeModal;

  modalBody.querySelectorAll("[data-resume]").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const id = btn.getAttribute("data-resume");
      const holds = loadHolds();
      const h = holds.find(x=>x.holdId===id);
      if(!h) return;
      bill = { id: h.id, customerType: h.customerType || "Walk-in", lines: h.lines || [], payType: h.payType || "UPI", createdAt: h.createdAt||Date.now() };
      saveBill();
      saveHolds(holds.filter(x=>x.holdId!==id));
      renderCart();
      closeModal();
    });
  });

  modalBody.querySelectorAll("[data-drop]").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const id = btn.getAttribute("data-drop");
      if(!confirm("Delete this held bill?")) return;
      const holds = loadHolds().filter(x=>x.holdId!==id);
      saveHolds(holds);
      closeModal();
      showHoldsModal();
    });
  });
}

function cryptoRand(){
  return (crypto && crypto.getRandomValues)
    ? Array.from(crypto.getRandomValues(new Uint8Array(8))).map(b=>b.toString(16).padStart(2,"0")).join("")
    : String(Math.random()).slice(2);
}

/* Init */
(function init(){
  const cn = localStorage.getItem("playhauz_counter_name") || "Counter 1";
  document.getElementById("storePill").textContent = cn;

  renderCats();
  renderItems();
  renderCart();
})();
