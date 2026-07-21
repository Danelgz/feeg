import { getAuth } from 'firebase-admin/auth';
import admin from 'firebase-admin';

// Evitamos inicializar fuera del handler para que no colapse todo Vercel si faltan las variables de entorno.
function initAdmin() {
    if (!admin.apps.length) {
        if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL || !process.env.FIREBASE_PRIVATE_KEY) {
            throw new Error('Faltan variables de entorno de Firebase Admin en Vercel.');
        }
        admin.initializeApp({
            credential: admin.credential.cert({
                projectId: process.env.FIREBASE_PROJECT_ID,
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
            }),
        });
    }
}

// El body es una foto en base64 — el default de Next (~1mb) se queda corto para una foto de
// plato ya redimensionada en el cliente (ver resizeImageForUpload en pages/food.js).
export const config = {
    api: {
        bodyParser: {
            sizeLimit: '4mb',
        },
    },
};

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        initAdmin();

        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const token = authHeader.split('Bearer ')[1];
        try {
            await getAuth().verifyIdToken(token);
        } catch (error) {
            return res.status(401).json({ error: 'Invalid or expired firebase token' });
        }

        const { image } = req.body;

        if (!image || typeof image !== 'string' || !image.startsWith('data:image/')) {
            return res.status(400).json({ error: 'Missing or invalid image' });
        }

        const systemPrompt = `Eres un nutricionista experto analizando la foto de un plato de comida.
Identifica cada alimento visible y estima su cantidad (en gramos o unidades) y sus macros a partir de ese
tamaño estimado.

DEBES devolver ÚNICAMENTE un objeto JSON válido con esta estructura exacta:
{
  "items": [
    { "name": "Nombre del alimento", "quantity": "ej. 150g o 1 unidad", "calories": 0, "protein": 0, "carbs": 0, "fats": 0 }
  ],
  "feedback": "Una frase breve en español valorando el equilibrio nutricional del plato"
}

Si la imagen no muestra comida reconocible, devuelve "items": [] y explica el motivo en "feedback".
No devuelvas NADA más que el JSON válido.`;

        const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: [
                    {
                        role: 'user',
                        content: [
                            { type: 'text', text: systemPrompt },
                            { type: 'image_url', image_url: { url: image } },
                        ],
                    },
                ],
                response_format: { type: 'json_object' },
                temperature: 0.4,
            }),
        });

        const aiData = await openAIResponse.json();

        if (!openAIResponse.ok) {
            console.error('OpenAI Error Details:', aiData);
            throw new Error(aiData.error?.message || 'Error en OpenAI API');
        }

        const result = JSON.parse(aiData.choices[0].message.content);
        res.status(200).json(result);

    } catch (error) {
        console.error('API Error:', error.message || error);
        res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
}
