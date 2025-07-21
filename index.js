import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';

const app = express();
const port = process.env.PORT || 3000;

// Zamiennik __dirname w ES Modules
const express = require('express');
const path = require('path');
const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

// Serwowanie .well-known/ai-plugin.json
app.use('/.well-known', express.static(path.join(__dirname, '.well-known')));

// Serwowanie pliku openapi.yaml z poprawnym Content-Type
app.get('/openapi.yaml', (req, res) => {
  res.setHeader('Content-Type', 'text/yaml');
  res.sendFile(path.join(__dirname, 'openapi.yaml'), (err) => {
    if (err) {
      console.error('Błąd przy wysyłaniu openapi.yaml:', err);
      res.status(500).send('Błąd przy ładowaniu specyfikacji');
    }
  });
});

// Endpoint API (opcjonalnie, jeśli chcesz mieć działający plugin)
app.post('/get-offers', (req, res) => {
  const { product_name } = req.body;
  if (!product_name) {
    return res.status(400).json({ error: 'Brak product_name' });
  }
  // Możesz tu dodać logikę do Google Books lub własnego źródła
  res.json({
    ean: '1234567890123',
    offers: [],
  });
});

app.listen(port, () => {
  console.log(`Serwer działa na porcie ${port}`);
});

// Szukanie EAN z Google Books
async function searchEANOnline(productName, authorName = '') {
  const query = encodeURIComponent(`${productName} ${authorName}`);
  const url = `https://www.googleapis.com/books/v1/volumes?q=${query}`;

  try {
    const response = await axios.get(url);
    const items = response.data.items || [];

    for (const item of items) {
      const industryIdentifiers = item.volumeInfo?.industryIdentifiers || [];
      for (const id of industryIdentifiers) {
        if (id.type === 'EAN_13' || id.type === 'ISBN_13') {
          return id.identifier;
        }
      }
    }
  } catch (err) {
    console.error('Błąd przy szukaniu EAN:', err.message);
  }

  return null;
}

// Endpoint do pobierania ofert
app.post('/get-offers', async (req, res) => {
  const { product_name, author_name } = req.body;

  const ean = await searchEANOnline(product_name, author_name);

  if (!ean) {
    return res.status(404).json({ error: 'Nie znaleziono EAN' });
  }

  try {
    const apiUrl = `https://buybox.click/21347/buybox.json?number=${ean}&p1=chatgpt`;
    const response = await axios.get(apiUrl);

    const offers = response.data?.offers || [];

    res.json({
      ean,
      offers,
    });
  } catch (err) {
    console.error('Błąd przy pobieraniu danych z BUY.BOX:', err.message);
    res.status(500).json({ error: 'Błąd po stronie serwera' });
  }
});

app.listen(port, () => {
  console.log(`Serwer działa na porcie ${port}`);
});
