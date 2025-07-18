const express = require('express');
const fetch = require('node-fetch');
const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

// Funkcja do pobrania EAN z Google Books API
async function searchEANOnline(productName, authorName = '') {
  const query = encodeURIComponent(productName);
  const url = `https://www.googleapis.com/books/v1/volumes?q=${query}`;

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error('Błąd pobierania danych z Google Books API');

    const data = await response.json();
    if (!data.items || data.items.length === 0) return null;

    // Szukamy najlepszego dopasowania
    const match = data.items.find(item => {
      const volume = item.volumeInfo;
      const titleMatch = volume.title?.toLowerCase().includes(productName.toLowerCase());
      const authorMatch = authorName
        ? volume.authors?.some(a => a.toLowerCase().includes(authorName.toLowerCase()))
        : true;
      return titleMatch && authorMatch;
    });

    const correctItem = match || data.items[0]; // fallback: pierwszy wynik

    const isbn13 = correctItem?.volumeInfo?.industryIdentifiers?.find(id => id.type === 'ISBN_13');
    return isbn13?.identifier || null;
  } catch (error) {
    console.error('Błąd podczas szukania EAN:', error);
    return null;
  }
}

// Funkcja do pobrania ofert z BUY.BOX
async function fetchOffersByEAN(ean) {
  const url = `https://buybox.click/21347/buybox.json?number=${ean}&p1=chatgpt`;

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error('Błąd pobierania danych z BUY.BOX API');

    const data = await response.json();
    return data?.data || [];
  } catch (error) {
    console.error('Błąd podczas pobierania ofert z BUY.BOX:', error);
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
