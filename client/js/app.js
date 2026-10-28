(function () {
  const API = '/server/product_search_app_function';
  const $ = (id) => document.getElementById(id);
  const LABELS = [['SKU','SKU'],['Category','Category'],['Sub_Category','Sub-category'],['Collection','Collection'],
    ['Metal','Metal'],['Size','Size'],['Center_Diamond_CTS','Center diamond (cts)'],['Total_Diamond_CTS','Total diamond (cts)'],
    ['Clarity','Clarity'],['Color','Color'],['Style_No','Style no.'],['Design_No','Design no.']];
  let current = null;

  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g,
    (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const money = (n) => (n == null || n === '') ? '' : Number(n).toLocaleString('en-IN', {style:'currency', currency:'INR'});
  const safeUrl = (u) => /^https?:\/\//i.test(u || '') ? u : '';

  async function api(path) {
    const r = await fetch(API + path);
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(data.error || 'Request failed.');
    return data;
  }

  async function search() {
    const q = $('q').value.trim();
    const list = $('results'), status = $('status');
    list.innerHTML = '';
    if (!q) { status.textContent = 'Enter a name, SKU or category to search.'; return; }
    status.textContent = 'Searching…';
    try {
      const { products } = await api('/search?q=' + encodeURIComponent(q));
      if (!products.length) { status.textContent = 'No products match “' + q + '”. Try a shorter or different term.'; return; }
      status.textContent = products.length + ' product' + (products.length === 1 ? '' : 's') + ' found.';
      list.innerHTML = products.map((p) => {
        const img = safeUrl(p.Image_Url);
        return '<li class="item" tabindex="0" data-id="' + esc(p.ROWID) + '">' +
          '<div class="thumb"' + (img ? ' style="background-image:url(\'' + esc(img) + '\')"' : '') + '></div>' +
          '<div><b>' + esc(p.Name) + '</b><small>' + esc(p.SKU) + (p.Category ? ' · ' + esc(p.Category) : '') + '</small>' +
          (Number(p.Stock) <= 0 ? '<span class="out">Out of stock</span>' : '') + '</div>' +
          '<div class="price">' + esc(money(p.Price)) + '</div></li>';
      }).join('');
    } catch (e) { status.textContent = e.message; }
  }

  async function openDetails(id) {
    try {
      const { product } = await api('/product/' + encodeURIComponent(id));
      current = product;
      const img = safeUrl(product.Image_Url);
      const rows = LABELS.filter(([k]) => product[k]).map(([k, l]) => '<dt>' + l + '</dt><dd>' + esc(product[k]) + '</dd>').join('');
      $('m-body').innerHTML = '<h2 id="m-title">' + esc(product.Name) + '</h2>' +
        '<div class="price">' + esc(money(product.Price)) + ' · ' + (Number(product.Stock) > 0 ? esc(product.Stock) + ' in stock' : 'Out of stock') + '</div>' +
        (img ? '<img src="' + esc(img) + '" alt="' + esc(product.Name) + '">' : '') +
        (product.Description ? '<p>' + esc(product.Description) + '</p>' : '') + '<dl>' + rows + '</dl>';
      $('modal').hidden = false;
      $('close').focus();
    } catch (e) { $('status').textContent = e.message; }
  }

  function closeModal() { $('modal').hidden = true; }

  function downloadPdf() {
    if (!current || !window.jspdf) return;
    const doc = new window.jspdf.jsPDF();
    let y = 20;
    doc.setFontSize(18); doc.text(String(current.Name), 15, y); y += 9;
    doc.setFontSize(12);
    // jsPDF's default font has no rupee glyph, so print the amount as "Rs."
    doc.text('Price: Rs. ' + Number(current.Price || 0).toLocaleString('en-IN') + '    Stock: ' + (current.Stock ?? 0), 15, y); y += 10;
    LABELS.forEach(([k, l]) => { if (current[k]) { doc.text(l + ': ' + current[k], 15, y); y += 7; } });
    if (current.Description) {
      y += 4;
      doc.splitTextToSize(String(current.Description), 180).forEach((line) => {
        if (y > 280) { doc.addPage(); y = 20; }
        doc.text(line, 15, y); y += 6;
      });
    }
    doc.save((current.SKU || 'product') + '.pdf');
  }

  $('go').addEventListener('click', search);
  $('q').addEventListener('keydown', (e) => { if (e.key === 'Enter') search(); });
  $('results').addEventListener('click', (e) => { const li = e.target.closest('.item'); if (li) openDetails(li.dataset.id); });
  $('results').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { const li = e.target.closest('.item'); if (li) openDetails(li.dataset.id); }
  });
  $('close').addEventListener('click', closeModal);
  $('modal').addEventListener('click', (e) => { if (e.target.id === 'modal') closeModal(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });
  $('pdf').addEventListener('click', downloadPdf);
})();
