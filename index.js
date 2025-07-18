// Plugin do ChatGPT – backend w Node.js (Express)
// Endpoint: /get-offers
// Przetwarza nazwę produktu, szuka EAN w sieci (Google Books API), zwraca oferty z BUY.BOX

const express = require('express');
const fetch = require('node-fetch');
const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

async function searchEANOnline(productName) {
  const query = encodeURIComponent(productName);
  const url = `https://www.googleapis.com/books/v1/volumes?q=${query}`;

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error('Błąd pobierania danych z Google Books API');

    const data = await response.json();

    // Szukaj najlepszego dopasowania po tytule
    const match = data.items?.find(item =>
      item.volumeInfo?.title?.toLowerCase().includes(productName.toLowerCase()) &&
      item.volumeInfo?.industryIdentifiers?.some(id => id.type === 'ISBN_13')
    );

    const isbn13 = match?.volumeInfo?.industryIdentifiers?.find(id => id.type === 'ISBN_13');
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
    const raw = await response.text();
    console.log('Odpowiedź BUY.BOX:', raw);

    if (!response.ok) throw new Error('Błąd pobierania danych z BUY.BOX API');
    const data = JSON.parse(raw);
    return data.offers || [];
  } catch (error) {
    console.error('Błąd BUY.BOX:', error);
    return [];
  }
}

app.post('/get-offers', async (req, res) => {
  const { product_name } = req.body;

  if (!product_name) {
    return res.status(400).json({ error: 'Brak pola product_name' });
  }

  const ean = await searchEANOnline(product_name);
  if (!ean) {
    return res.status(404).json({ error: 'Nie znaleziono EAN dla tego produktu' });
  }

  const offers = await fetchOffersByEAN(ean);
  res.json({ ean, offers });
});

app.listen(port, () => {
  console.log(`BUY.BOX Plugin API listening on port ${port}`);
});
