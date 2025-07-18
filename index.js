// Plugin do ChatGPT – backend w Node.js (Express)
// Endpoint: /get-offers
// Przetwarza nazwę produktu i autora, szuka EAN w Google Books API, zwraca oferty z BUY.BOX

const express = require('express');
const fetch = require('node-fetch');
const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

async function searchEANOnline(productName, authorName = '') {
  const query = encodeURIComponent(productName);
  const url = `https://www.googleapis.com/books/v1/volumes?q=${query}`;

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error('Błąd pobierania danych z Google Books API');

    const data = await response.json();
    if (!data.items || data.items.length === 0) return null;

    // Lepsze dopasowanie: porównujemy dokładnie tytuł i autora
    const match = data.items.find(item => {
      const volume = item.volumeInfo;
      const title = volume.title?.toLowerCase().trim();
      const authorList = volume.authors?.map(a => a.toLowerCase().trim()) || [];
      return (
        title === productName.toLowerCase().trim() &&
        (!authorName || authorList.includes(authorName.toLowerCase().trim()))
      );
    });

    const correctItem = match || data.items[0]; // fallback

    const isbn13 = correctItem?.volumeInfo?.industryIdentifiers?.find(id => id.type === 'ISBN_13');
    return isbn13?.identifier || null;
  } catch (error) {
    console.error('Błąd podczas szukania EAN:', error);
    return null;
  }
}

async function fetchOffersByEAN(ean) {
  const url = `https://buybox.click/21347/buybox.json?number=${ean}&p1=chatgpt`;

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error('Błąd pobierania danych z BUY.BOX API');

    const data = await response.json();
    return data.offers || {};
  } catch (error) {
    console.error('Błąd:', error);
    return {};
  }
}

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
