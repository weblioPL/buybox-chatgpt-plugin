import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const app = express();
const port = process.env.PORT || 10000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware: JSON parsing
app.use(express.json());

// Endpoint do testów (opcjonalny)
app.get('/', (req, res) => {
  res.send('BUY.BOX Plugin działa 🚀');
});

// Serwowanie openapi.yaml z poprawnym Content-Type
app.get('/openapi.yaml', (req, res) => {
  const yamlPath = path.join(__dirname, 'openapi.yaml');

  fs.readFile(yamlPath, 'utf8', (err, data) => {
    if (err) {
      res.status(500).send('Błąd podczas czytania openapi.yaml');
    } else {
      res.setHeader('Content-Type', 'text/yaml');
      res.send(data);
    }
  });
});

app.listen(port, () => {
  console.log(`✅ Serwer działa na porcie ${port}`);
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
