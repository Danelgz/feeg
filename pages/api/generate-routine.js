import { getAuth } from 'firebase-admin/auth';
import admin from 'firebase-admin';

// Evitamos inicializar fuera del handler para que no colapse todo Vercel si faltan variables
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

// Mismo modelo que el resto del Coach IA (ai-chat.js, ai-technique.js) — este endpoint usaba
// OpenAI mientras el resto de la IA ya se había migrado a Gemini, así que en cualquier entorno
// donde solo hay GEMINI_API_KEY configurada (como este) fallaba con un error genérico.
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.6-flash';

const EXERCISE_SCHEMA = {
    type: 'OBJECT',
    properties: {
        name: { type: 'STRING', description: 'Nombre del ejercicio.' },
        sets: { type: 'STRING', description: "Número de series, ej. '3' o '4'." },
        reps: { type: 'STRING', description: "Rango de repeticiones, ej. '8-12'." },
        rest: { type: 'STRING', description: "Descanso entre series, ej. '90s'." },
        note: { type: 'STRING', description: 'Un tip biomecánico breve sobre el ejercicio, en una frase.' },
    },
    required: ['name', 'sets', 'reps', 'rest', 'note'],
};

const DAY_SCHEMA = {
    type: 'OBJECT',
    properties: {
        name: { type: 'STRING', description: "Nombre o enfoque del día, ej. 'Día 1: Pierna fuerza'." },
        exercises: { type: 'ARRAY', items: EXERCISE_SCHEMA },
    },
    required: ['name', 'exercises'],
};

const PLAN_SCHEMA = {
    type: 'OBJECT',
    properties: {
        title: { type: 'STRING', description: 'Nombre atractivo de la rutina.' },
        tagline: { type: 'STRING', description: 'Frase de una línea que resuma el enfoque distintivo de ESTE plan frente al otro (ej. "Full body cada sesión" vs "Torso-pierna clásico").' },
        summary: { type: 'STRING', description: 'Breve explicación de por qué este plan encaja con los datos del usuario.' },
        days: { type: 'ARRAY', items: DAY_SCHEMA },
        advice: { type: 'STRING', description: 'Un consejo general o de nutrición aplicable al objetivo.' },
    },
    required: ['title', 'tagline', 'summary', 'days', 'advice'],
};

const RESPONSE_SCHEMA = {
    type: 'OBJECT',
    properties: {
        plans: {
            type: 'ARRAY',
            description: 'Exactamente dos planes distintos entre los que el usuario pueda elegir.',
            items: PLAN_SCHEMA,
        },
    },
    required: ['plans'],
};

function buildSystemInstruction(trainingData) {
    return `Eres Coach FEEG, un entrenador personal experto en fitness y fuerza.
Tu objetivo es diseñar DOS rutinas de entrenamiento distintas, hiper-estructuradas y 100% personalizadas, basadas en los datos del usuario, para que pueda comparar dos enfoques válidos y elegir el que más le convenza.

Datos del usuario:
- Edad: ${trainingData.age || 'No especificada'}
- Sexo: ${trainingData.sex || 'No especificado'}
- Altura: ${trainingData.height ? trainingData.height + ' cm' : 'No especificada'}
- Peso: ${trainingData.weight ? trainingData.weight + ' kg' : 'No especificado'}
- Objetivo: ${trainingData.goal || 'General'}
- Nivel: ${trainingData.level || 'Intermedio'}
- Días disponibles a la semana: ${trainingData.days || 3}
- Tiempo disponible por sesión: ${trainingData.time ? trainingData.time + ' minutos' : 'No especificado'}
- Distribución preferida: ${trainingData.split || 'Sin preferencia'}
- Material disponible: ${trainingData.material || 'Gimnasio completo'}
- Grupos prioritarios: ${trainingData.focusGroups || 'Cuerpo equilibrado'}
- Lesiones o preferencias: ${trainingData.preferences || 'Ninguna'}

Reglas importantes:
- Los dos planes deben cumplir igual de bien los datos del usuario (mismos días, mismo tiempo, mismo material, mismo nivel), pero con un enfoque de verdad distinto entre sí — no renombres el mismo plan. Por ejemplo, splits diferentes (full body vs torso-pierna vs empuje-tirón-pierna), énfasis distinto dentro del objetivo, o selección de ejercicios distinta. La diferencia debe notarse en los ejercicios, no solo en el nombre.
- Respeta la distribución preferida si es compatible con el número de días; si no lo es, explica la adaptación en el resumen y elige una distribución realista.
- Da prioridad visible a los grupos indicados sin abandonar el equilibrio del cuerpo: ningún grupo prioritario debe quedarse sin trabajo y evita sobrecargarlo con volumen absurdo.
- Ajusta el número de ejercicios por día para que quepan cómodamente en el tiempo disponible por sesión (contando calentamiento, series y descansos) — no lo ignores.
- Usa solo ejercicios de gimnasio reales y coherentes con el material disponible.
- Responde ÚNICAMENTE en el formato JSON exacto solicitado, en español.`;
}

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        initAdmin();

        // Validación de usuario
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

        const { trainingData } = req.body;

        if (!trainingData) {
            return res.status(400).json({ error: 'Missing trainingData' });
        }

        if (!process.env.GEMINI_API_KEY) {
            throw new Error('Falta configurar GEMINI_API_KEY en el servidor.');
        }

        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${process.env.GEMINI_API_KEY}`;
        const geminiResponse = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                systemInstruction: { parts: [{ text: buildSystemInstruction(trainingData) }] },
                contents: [{ role: 'user', parts: [{ text: 'Genera los dos planes según los datos y reglas del system prompt.' }] }],
                generationConfig: {
                    temperature: 0.8,
                    responseMimeType: 'application/json',
                    responseSchema: RESPONSE_SCHEMA,
                },
            }),
        });

        const aiData = await geminiResponse.json();

        if (!geminiResponse.ok) {
            console.error('Gemini Error Details:', aiData);
            throw new Error(aiData.error?.message || 'Error en Gemini API');
        }

        const rawText = (aiData.candidates?.[0]?.content?.parts || []).map((p) => p.text || '').join('');
        let parsed;
        try {
            parsed = JSON.parse(rawText);
        } catch (parseError) {
            console.error('Generate Routine: respuesta no era JSON válido:', rawText);
            throw new Error('La IA devolvió una respuesta con formato inesperado.');
        }

        const plans = Array.isArray(parsed.plans) ? parsed.plans.slice(0, 2) : [];
        if (plans.length < 2) {
            throw new Error('La IA no devolvió dos planes completos.');
        }

        res.status(200).json({ plans });

    } catch (error) {
        console.error('API Error:', error.message || error);
        res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
}
