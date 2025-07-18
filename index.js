const express = require('express');
const fetch = require('node-fetch');
const app = express();
const port = process.env.PORT || 3000;
const path = require('path');

app.use(express.json());

app.use('/.well-known', express.static(path.join(__dirname, '.well-known')));
app.use('/', express.static(__dirname));

// Funkcja pobiera poprawny ISBN_13 z pierwszego wyniku Google Books API
async function searchEANOnline(productName, authorName = '') {
  const query = encodeURIComponent(`${productName} ${authorName}`);
  const url = `https://www.googleapis.com/books/v1/volumes?q=${query}`;

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error('Błąd pobierania danych z Google Books API');

    const data = await response.json();
    const firstItem = data.items?.[0];
    const identifiers = firstItem?.volumeInfo?.industryIdentifiers || [];

    const isbn13 = identifiers.find(id => id.type === 'ISBN_13');
    return isbn13?.identifier || null;
  } catch (error) {
    console.error('Błąd podczas szukania EAN:', error);
    return null;
  }
}

// Funkcja pobiera oferty z BUY.BOX API
async function fetchOffersByEAN(ean) {
  const url = `https://buybox.click/21347/buybox.json?number=${ean}&p1=chatgpt`;

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error('Błąd pobierania danych z BUY.BOX API');

    const data = await response.json();

    // Zamiana obiektu ofert na tablicę, jeśli trzeba
    const offers = data.offers
      ? Array.isArray(data.offers)
        ? data.offers
        : Object.values(data.offers)
      : [];

    return offers;
  } catch (error) {
    console.error('Błąd:', error);
    return [];
  }
}

// Endpoint POST /get-offers
app.post('/get-offers', async (req, res) => {
  const { product_name, author } = req.body;

  if (!product_name) {
    return res.status(400).json({ error: 'Brak pola product_name' });
  }

  const ean = await searchEANOnline(product_name, author);
  if (!ean) {
    return res.status(404).json({ error: 'Nie znaleziono EAN dla tego produktu' });
  }

  const offers = await fetchOffersByEAN(ean);
  res.json({ ean, offers });
});

app.listen(port, () => {
  console.log(`BUY.BOX Plugin API listening on port ${port}`);
});
