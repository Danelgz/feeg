import { getAuth } from 'firebase-admin/auth';
import admin from 'firebase-admin';

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

export const config = { api: { bodyParser: { sizeLimit: '24mb' } } };

const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.6-flash';
const MUSCLE_GROUPS = ['Cuello', 'Hombros', 'Pecho', 'Espalda', 'Abdomen', 'Bíceps', 'Tríceps', 'Antebrazo', 'Cuádriceps', 'Femoral', 'Glúteos', 'Gemelos'];

function buildPrompt(userProfile, hasPrevious) {
    return `Eres el analizador visual de composición y desarrollo muscular de FEEG. Analiza las fotos de una persona que entrena y devuelve SOLO JSON válido, sin markdown.

Tu salida debe ser prudente, útil y no médica. No identifiques a la persona, no juzgues su apariencia, no diagnostiques lesiones y no hagas recomendaciones nutricionales clínicas. No afirmes medidas exactas: usa expresiones como "aparenta", "podría" y rangos.

Compara desarrollo visible de los 12 grupos de FEEG: ${MUSCLE_GROUPS.join(', ')}. Puntúa cada grupo de 0 a 100 de forma RELATIVA a la propia imagen y al conjunto corporal, no contra un estándar de belleza. Usa status strength para 75+, balanced para 50-74 y focus para menos de 50.

Devuelve exactamente este esquema:
{
  "summary": "2 frases breves",
  "confidence": "low|medium|high",
  "bodyFat": { "estimate": "p. ej. 15–18%", "range": "rango visual aproximado", "disclaimer": "No es una medición médica" },
  "symmetry": { "score": 0, "note": "observación prudente sobre izquierda/derecha" },
  "proportions": [{ "label": "Hombros / cintura", "value": "lectura cualitativa", "reading": "qué se observa" }],
  "evolution": { "available": ${hasPrevious ? 'true' : 'false'}, "headline": "titular corto", "points": ["cambio observable o explicación de por qué no se puede comparar"] },
  "muscles": [{ "group": "uno de los 12 grupos exactos", "score": 0, "status": "strength|focus|balanced", "note": "observación breve" }],
  "strengths": ["hasta 3 puntos fuertes"],
  "focusAreas": ["hasta 3 prioridades"],
  "recommendations": ["3 recomendaciones concretas de entrenamiento, sin prescribir tratamiento"]
}

Incluye entre 5 y 7 proporciones cuando las fotos lo permitan (hombros/cintura, torso/brazos, pecho/espalda, cuádriceps/gemelos, brazos izquierda/derecha, cintura/cadera, torso/pierna). Si el ángulo o la ropa no permiten una lectura, dilo. Una comparativa anterior está marcada como "Foto anterior"; si no existe, no inventes evolución.

Contexto opcional del perfil: ${JSON.stringify(userProfile || {})}`;
}

function validateImages(images, name) {
    if (!Array.isArray(images) || images.length > 3) throw new Error(`${name} no es válido.`);
    return images.map((image) => {
        if (!image || typeof image.data !== 'string' || !/^image\/(jpeg|png|webp)$/.test(image.mimeType || '')) throw new Error(`Formato no válido en ${name}.`);
        if (image.data.length > 10000000) throw new Error(`Una imagen de ${name} es demasiado grande.`);
        return { inlineData: { mimeType: image.mimeType, data: image.data } };
    });
}

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    try {
        initAdmin();
        const authHeader = req.headers.authorization;
        if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ error: 'Necesitas iniciar sesión para analizar tus fotos.' });
        try { await getAuth().verifyIdToken(authHeader.split('Bearer ')[1]); } catch { return res.status(401).json({ error: 'Tu sesión ha caducado. Vuelve a iniciar sesión.' }); }
        if (!process.env.GEMINI_API_KEY) throw new Error('El analizador visual aún no está configurado en el servidor.');

        const { currentImages, previousImages, userProfile } = req.body || {};
        if (!Array.isArray(currentImages) || currentImages.length < 2 || currentImages.length > 3) return res.status(400).json({ error: 'Sube 2 o 3 fotos actuales para analizar.' });
        const currentParts = validateImages(currentImages, 'las fotos actuales');
        const previousParts = validateImages(previousImages || [], 'la comparativa');
        const parts = [{ text: buildPrompt(userProfile, previousParts.length > 0) }];
        currentImages.forEach((image, index) => parts.push({ text: `Foto actual ${index + 1}: ${image.label || 'ángulo'}` }, currentParts[index]));
        if (previousParts.length) parts.push({ text: 'Foto anterior para comparar evolución:' }, ...previousParts);

        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${process.env.GEMINI_API_KEY}`;
        const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ role: 'user', parts }], generationConfig: { temperature: 0.25, responseMimeType: 'application/json' } }) });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error?.message || 'Gemini no pudo analizar las imágenes.');
        const text = data.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('').trim();
        if (!text) throw new Error('El analizador no devolvió una lectura.');
        let analysis;
        try { analysis = JSON.parse(text.replace(/^```json\s*|\s*```$/g, '')); } catch { throw new Error('La respuesta del analizador no tenía un formato válido.'); }
        if (!analysis || !Array.isArray(analysis.muscles)) throw new Error('La respuesta del analizador está incompleta.');
        analysis.muscles = MUSCLE_GROUPS.map((group) => analysis.muscles.find((item) => item.group === group)).filter(Boolean).map((item) => ({ ...item, score: Math.max(0, Math.min(100, Number(item.score) || 0)) }));
        return res.status(200).json({ analysis });
    } catch (error) {
        console.error('Body analysis API error:', error.message || error);
        return res.status(500).json({ error: error.message || 'No se pudo completar el análisis.' });
    }
}
