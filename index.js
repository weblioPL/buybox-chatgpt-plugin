import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

// Serwowanie statycznych plików
app.use('/.well-known', express.static(path.join(__dirname, '.well-known')));
app.use('/', express.static(__dirname));

// Poprawne serwowanie openapi.yaml z nagłówkiem Content-Type
app.get('/openapi.yaml', (req, res) => {
  res.setHeader('Content-Type', 'application/yaml');
  res.sendFile(path.join(__dirname, 'openapi.yaml'));
});

// Szukanie EAN w Google Books
app.post('/get-offers', async (req, res) => {
  const { product_name } = req.body;

  try {
    const query = encodeURIComponent(product_name);
    const url = `https://www.googleapis.com/books/v1/volumes?q=${query}`;
    const { data } = await axios.get(url);

    const ean = data?.items?.[0]?.volumeInfo?.industryIdentifiers?.[0]?.identifier || '';
    const offers = [];

    res.json({ ean, offers });
  } catch (error) {
    console.error('Błąd podczas pobierania danych:', error.message);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.listen(port, () => {
  console.log(`Serwer działa na porcie ${port}`);
});
