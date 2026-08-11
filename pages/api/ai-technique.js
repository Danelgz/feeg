import { getAuth } from 'firebase-admin/auth';
import admin from 'firebase-admin';
import { getExerciseInfo } from '../../lib/exerciseStats';

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

// Mantener la misma versión vigente que usa el Coach IA principal.
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.6-flash';

// Sin function calling aquí (a diferencia de ai-chat.js): es una única pregunta autocontenida,
// así que se pide directamente salida JSON estructurada (responseSchema) en vez de montar el
// bucle de herramientas — más barato y sin el riesgo de que el modelo devuelva prosa que luego
// hay que parsear a mano.
const TECHNIQUE_SCHEMA = {
    type: 'OBJECT',
    properties: {
        name: { type: 'STRING', description: 'Nombre normalizado del ejercicio.' },
        recognized: { type: 'BOOLEAN', description: 'false si el texto no corresponde a ningún ejercicio de fuerza/gimnasio real reconocible.' },
        muscleGroup: { type: 'STRING', description: 'Grupo muscular principal, en español.' },
        position: { type: 'STRING', description: 'Postura y ejecución correctas, paso a paso, en 2-4 frases.' },
        commonMistakes: { type: 'STRING', description: 'Errores técnicos más habituales, en 1-3 frases.' },
        musclesInvolved: { type: 'STRING', description: 'Músculos principales y secundarios implicados.' },
        repRange: { type: 'STRING', description: 'Rango de repeticiones habitual según objetivo (ej. "6-10 fuerza, 8-15 hipertrofia").' },
        restAdvice: { type: 'STRING', description: 'Descanso recomendado entre series, ej. "90-120s".' },
        tip: { type: 'STRING', description: 'Un consejo práctico y accionable, en una frase.' },
    },
    required: ['name', 'recognized', 'muscleGroup', 'position', 'commonMistakes', 'musclesInvolved', 'repRange', 'restAdvice', 'tip'],
};

const SYSTEM_INSTRUCTION = `Eres un entrenador personal experto en biomecánica y técnica de levantamiento de pesas.
Te dan el nombre de un ejercicio de gimnasio y debes devolver, en español y en el formato JSON exacto solicitado, una explicación técnica precisa: postura/ejecución, errores comunes, músculos implicados, rango de repeticiones y descanso recomendado, y un consejo práctico.
Sé concreto y útil, no genérico — la explicación debe ser específica de ESE ejercicio, no una plantilla que sirva para cualquiera.
Si el texto no corresponde a ningún ejercicio de fuerza/gimnasio real reconocible (está vacío de sentido, es una broma, o no es un ejercicio), pon recognized:false y dilo honestamente en el campo "position" en vez de inventar una técnica.`;

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

        const exerciseName = (req.body?.exerciseName || '').trim();
        if (!exerciseName) {
            return res.status(400).json({ error: 'exerciseName es obligatorio' });
        }
        if (exerciseName.length > 80) {
            return res.status(400).json({ error: 'Nombre de ejercicio demasiado largo' });
        }

        if (!process.env.GEMINI_API_KEY) {
            throw new Error('Falta configurar GEMINI_API_KEY en el servidor.');
        }

        // Si el ejercicio existe en el catálogo real de la app, se lo damos como referencia — así
        // la respuesta usa el mismo grupo muscular/nombre que ya conoce el resto de FEEG en vez de
        // que el modelo lo adivine por su cuenta.
        const catalogInfo = getExerciseInfo(exerciseName);
        let prompt = `Ejercicio: "${exerciseName}".`;
        if (catalogInfo) {
            prompt += `\nEste ejercicio existe en el catálogo de la app con grupo muscular "${catalogInfo.group}" y forma de registro "${catalogInfo.type}". Tenlo en cuenta como referencia.`;
        }

        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${process.env.GEMINI_API_KEY}`;
        const geminiResponse = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
                contents: [{ role: 'user', parts: [{ text: prompt }] }],
                generationConfig: {
                    temperature: 0.4,
                    responseMimeType: 'application/json',
                    responseSchema: TECHNIQUE_SCHEMA,
                },
            }),
        });

        const data = await geminiResponse.json();

        if (!geminiResponse.ok) {
            console.error('Gemini Error Details:', data);
            throw new Error(data.error?.message || 'Error en Gemini API');
        }

        const rawText = (data.candidates?.[0]?.content?.parts || []).map((p) => p.text || '').join('');
        let result;
        try {
            result = JSON.parse(rawText);
        } catch (parseError) {
            console.error('AI Technique: respuesta no era JSON válido:', rawText);
            throw new Error('La IA devolvió una respuesta con formato inesperado.');
        }

        res.status(200).json({ result });
    } catch (error) {
        console.error('AI Technique API Error:', error.message || error);
        res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
}
