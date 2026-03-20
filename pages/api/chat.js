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

export default async function handler(req, res) {
    // Solo se admiten validaciones POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        // Inicialización segura
        initAdmin();

        // 1. VALIDACIÓN: Comprobar que el usuario que solicita está autenticado por Firebase Auth
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const token = authHeader.split('Bearer ')[1];
        let decodedToken;
        try {
            decodedToken = await getAuth().verifyIdToken(token);
        } catch (error) {
            return res.status(401).json({ error: 'Invalid or expired firebase token' });
        }

        const { messages, routine, userProfile } = req.body;

        if (!messages || !Array.isArray(messages)) {
            return res.status(400).json({ error: 'Invalid messages array' });
        }

        // 2. PROMPT DEL SISTEMA: El rol fundamental del asistente
        let systemPrompt = `Eres Coach FEEG, un entrenador personal virtual experto, motivador y 100% centrado en el usuario. 
Tu objetivo es ayudar al usuario a mejorar su entrenamiento, estado físico y responder dudas biomecánicas (ej. cómo hacer una sentadilla). 
Sé conciso, nunca devuelvas la información desordenada, usa un tono cercano, profesional y motivador. 
Si el usuario te pregunta cosas que no sean de fitness, salud o bienestar, recuérdale amablemente que tú eres su entrenador personal virtual y solo puedes ayudar en esa materia.`;

        // 3. CONTEXTO DINÁMICO DEL USUARIO (Perfil)
        if (userProfile) {
            systemPrompt += `\n\n[DATOS DEL USUARIO]:
- Experiencia/Nivel: ${userProfile.level || 'No definido'}
- Altura: ${userProfile.height ? userProfile.height + ' cm' : 'No definida'}
- Peso: ${userProfile.weight ? userProfile.weight + ' kg' : 'No definido'}
Utiliza estos datos para personalizar tus respuestas. Por ejemplo, si el usuario es principiante, sé más cuidadoso con la técnica; si tiene poco peso, sugiere ejercicios acordes, etc.`;
        }

        // 4. CONTEXTO DE LA RUTINA SELECCIONADA
        if (routine) {
            systemPrompt += `\n\n[CONTEXTO DE ENTRENAMIENTO ACTUAL]: El usuario está consultado específicamente sobre una rutina de: "${routine}". 
Ten esto en cuenta al recomendar ejercicios, volumen o descansos hoy.`;
        }

        // 4. Llama de forma segura a OpenAI usando la clave de variables de entorno de Backend
        const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini', // Cambiado a un modelo más rápido y capaz
                messages: [
                    { role: 'system', content: systemPrompt }, // Inyectamos Reglas base + la Rutina seleccionada
                    ...messages // Inyectamos historial del chat
                ],
                temperature: 0.7, // Equilibrado entre creatividad y concisión
            })
        });

        const aiData = await openAIResponse.json();

        if (!openAIResponse.ok) {
            console.error('OpenAI Error Details:', aiData);
            throw new Error(aiData.error?.message || 'Error en OpenAI API');
        }

        const reply = aiData.choices[0].message.content;

        // 5. Devolver mensaje de IA al Frontend
        res.status(200).json({ reply });

    } catch (error) {
        console.error('API Error:', error.message || error);
        res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
}
