// Plugin do ChatGPT – backend w Node.js (Express)
// Endpoint: /get-offers
// Przetwarza nazwę produktu, szuka EAN w sieci (Google Books API), zwraca oferty z BUY.BOX

const express = require('express');
const fetch = require('node-fetch');
const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

async function searchEANOnline(productName, author = null) {
  const query = encodeURIComponent(productName);
  const url = `https://www.googleapis.com/books/v1/volumes?q=${query}`;

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error('Błąd pobierania danych z Google Books API');
    const data = await response.json();

    if (!data.items || data.items.length === 0) return null;

    // Jeśli jest podany autor, filtrujemy dokładniej
    let correctItem = data.items.find(item => {
      const titleMatch = item.volumeInfo?.title?.toLowerCase().includes(productName.toLowerCase());
      const authorMatch = author
        ? item.volumeInfo?.authors?.some(a => a.toLowerCase().includes(author.toLowerCase()))
        : true;
      return titleMatch && authorMatch;
    });

    // Jeśli nie znaleziono, bierz pierwszy z ISBN_13
    if (!correctItem) {
      correctItem = data.items.find(item =>
        item.volumeInfo?.industryIdentifiers?.some(id => id.type === 'ISBN_13')
      );
    }

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
    return data.offers || [];
  } catch (error) {
    console.error('Błąd pobierania ofert z BUY.BOX API:', error);
    return [];
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
