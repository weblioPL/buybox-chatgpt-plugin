const express = require('express');
const path = require('path');
const axios = require('axios');

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

// Serwowanie katalogu .well-known
app.use('/.well-known', express.static(path.join(__dirname, '.well-known')));

// Endpoint do openapi.yaml z nagłówkiem Content-Type
app.get('/openapi.yaml', (req, res) => {
  res.setHeader('Content-Type', 'application/yaml');
  res.sendFile(path.join(__dirname, 'openapi.yaml'));
});

// Szukanie EAN w Google Books
async function searchEANOnline(productName, authorName = '') {
  const query = encodeURIComponent(`${productName} ${authorName}`);
  const url = `https://www.googleapis.com/books/v1/volumes?q=${query}`;

  try {
    const response = await axios.get(url);
    const items = response.data.items || [];

    for (const item of items) {
      const title = item.volumeInfo?.title?.toLowerCase() || '';
      const authors = item.volumeInfo?.authors?.join(', ').toLowerCase() || '';

      if (title.includes(productName.toLowerCase()) && authors.includes(authorName.toLowerCase())) {
        const identifiers = item.volumeInfo.industryIdentifiers || [];
        const isbn13 = identifiers.find(id => id.type === 'ISBN_13');
        if (isbn13) return isbn13.identifier;
      }
    }

    return null;
  } catch (err) {
    console.error('Błąd podczas szukania EAN:', err);
    return null;
  }
}

// Endpoint do pobierania ofert z BUY.BOX API
app.post('/get-offers', async (req, res) => {
  const { product_name, author_name = '' } = req.body;

  if (!product_name) {
    return res.status(400).json({ error: 'Brakuje pola "product_name"' });
  }

  const ean = await searchEANOnline(product_name, author_name);

  if (!ean) {
    return res.status(404).json({ error: 'Nie znaleziono EAN dla podanej książki' });
  }

  try {
    const buyboxRes = await axios.get(`https://buybox.click/21347/buybox.json?number=${ean}&p1=chatgpt`);
    res.json({ ean, offers: buyboxRes.data.offers || [] });
  } catch (err) {
    console.error('Błąd przy pobieraniu ofert z BUY.BOX:', err);
    res.status(500).json({ error: 'Błąd przy pobieraniu ofert z BUY.BOX' });
  }
});

// Serwowanie pozostałych plików statycznych (NA KOŃCU)
app.use('/', express.static(__dirname));

// Start serwera
app.listen(port, () => {
  console.log(`Serwer działa na porcie ${port}`);
});
