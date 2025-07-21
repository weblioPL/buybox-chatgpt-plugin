import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import fetch from 'node-fetch';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

// Serwowanie statycznych plików (np. ai-plugin.json)
app.use('/.well-known', express.static(path.join(__dirname, '.well-known')));
app.use('/', express.static(__dirname));

// Endpoint dla openapi.yaml z poprawnym Content-Type
app.get('/openapi.yaml', (req, res) => {
  res.setHeader('Content-Type', 'application/yaml');
  res.sendFile(path.join(__dirname, 'openapi.yaml'));
});

// Przykładowy endpoint (jeśli używasz np. do wyszukiwania książek)
app.post('/get-offers', async (req, res) => {
  const { product_name } = req.body;

  if (!product_name) {
    return res.status(400).json({ error: 'Brakuje pola product_name' });
  }

  // Prosty fetch do Google Books API (jeśli nadal chcesz używać)
  const query = encodeURIComponent(product_name);
  const url = `https://www.googleapis.com/books/v1/volumes?q=${query}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    const ean = data?.items?.[0]?.volumeInfo?.industryIdentifiers?.find(id => id.type === 'EAN_13')?.identifier;

    res.json({ ean, offers: [] }); // placeholder
  } catch (err) {
    res.status(500).json({ error: 'Błąd podczas wyszukiwania EAN' });
  }
});

app.listen(port, () => {
  console.log(`Serwer działa na porcie ${port}`);
});
