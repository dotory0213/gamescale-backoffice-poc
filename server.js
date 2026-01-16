import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import cors from 'cors';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

// Enable CORS for Vite dev server
app.use(cors());
app.use(express.json({ limit: '50mb' })); // Increase limit for content

const NAV_DATA_PATH = path.resolve(__dirname, '../saas-landing/src/constants/navData.json');

// GET navigation data
app.get('/api/nav', async (req, res) => {
    try {
        const data = await fs.readFile(NAV_DATA_PATH, 'utf8');
        res.json(JSON.parse(data));
    } catch (error) {
        console.error('Error reading nav data:', error);
        res.status(500).json({ error: 'Failed to read navigation data' });
    }
});

// UPDATE navigation data
app.post('/api/nav', async (req, res) => {
    try {
        const newData = req.body;
        // Basic validation could go here
        await fs.writeFile(NAV_DATA_PATH, JSON.stringify(newData, null, 4), 'utf8');
        res.json({ success: true, message: 'Navigation data updated' });
    } catch (error) {
        console.error('Error writing nav data:', error);
        res.status(500).json({ error: 'Failed to save navigation data' });
    }
});

app.listen(PORT, () => {
    console.log(`Backoffice API Server running on port ${PORT}`);
    console.log(`Managing data at: ${NAV_DATA_PATH}`);
});
