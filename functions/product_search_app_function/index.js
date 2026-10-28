'use strict';
const express = require('express');
const catalyst = require('zcatalyst-sdk-node');

const app = express();
app.use(express.json());

const FIELDS = ['ROWID','Name','Description','Category','Sub_Category','Collection','SKU','Price','Stock',
  'Metal','Size','Center_Diamond_CTS','Total_Diamond_CTS','Clarity','Color','Style_No','Design_No','Image_Url'];

// Escape a value for use inside a single-quoted ZCQL string literal.
const esc = (s) => String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'");

const flatten = (rows) => rows.map((r) => r.Products || r);

// GET /search?q=ring  -> partial, case-insensitive match on name, SKU, category, style no.
app.get('/search', async (req, res) => {
  try {
    const q = String(req.query.q || '').trim().slice(0, 100);
    if (!q) return res.json({ products: [] });
    // ZCQL LIKE uses * as its wildcard (not %), so strip any typed wildcards.
    const term = esc(q.replace(/[*%]/g, ''));
    if (!term) return res.json({ products: [] });
    const zcql = catalyst.initialize(req).zcql();
    const sql =
      `SELECT ${FIELDS.join(', ')} FROM Products ` +
      `WHERE Name_Lower LIKE '*${term.toLowerCase()}*' OR SKU LIKE '*${term}*' OR Category LIKE '*${term}*' ` +
      `OR Style_No LIKE '*${term}*' ORDER BY Name_Lower LIMIT 0, 50`;
    const rows = await zcql.executeZCQLQuery(sql);
    res.json({ products: flatten(rows) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Search failed. Please try again.' });
  }
});

// GET /product/:id -> full details for one product
app.get('/product/:id', async (req, res) => {
  try {
    const id = String(req.params.id).replace(/\D/g, '');
    if (!id) return res.status(400).json({ error: 'Invalid product id.' });
    const zcql = catalyst.initialize(req).zcql();
    const rows = await zcql.executeZCQLQuery(
      `SELECT ${FIELDS.join(', ')} FROM Products WHERE ROWID = ${id}`);
    if (!rows.length) return res.status(404).json({ error: 'Product not found.' });
    res.json({ product: flatten(rows)[0] });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Could not load product.' });
  }
});

module.exports = app;
