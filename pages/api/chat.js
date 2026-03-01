import { getAuth } from 'firebase-admin/auth';
import admin from 'firebase-admin';

// Inicializamos Firebase Admin una sola vez en el entorno de backend
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            // Reemplazamos saltos de línea codificados que Vercel/NextJS suelen causar
            privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        }),
    });
}

export default async function handler(req, res) {
    // Solo se admiten validaciones POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
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

        const { messages, routine } = req.body;

        if (!messages || !Array.isArray(messages)) {
            return res.status(400).json({ error: 'Invalid messages array' });
        }

        // 2. PROMPT DEL SISTEMA: El rol fundamental del asistente
        let systemPrompt = `Eres un entrenador personal virtual experto, amable y motivador. 
Tu objetivo es ayudar al usuario a mejorar su entrenamiento militar o deportivo, estado físico y responder dudas concretas biomecánicas (ej. cómo hacer una sentadilla). 
Sé conciso, nunca devuelvas la información desordenada, usa un tono cercano pero profesional. 
Si el usuario te pregunta cosas que no sean de fitness o salud, recuérdale amablemente que tú eres un entrenador personal virtual y solo puedes ayudar en esa materia.`;

        // 3. CONTEXTO DE LA RUTINA
        if (routine) {
            systemPrompt += `\n\n[CONTEXTO IMPORTANTE PARA ESTA PREGUNTA]: ACTUALMENTE EL USUARIO ESTÁ CONCENTRADO EN UNA RUTINA DE: "${routine}". 
Ten esto en cuenta al recomendarle ejercicios si no te especifica ningún otro grupo muscular hoy.`;
        }

        // 4. Llama de forma segura a OpenAI usando la clave de variables de entorno de Backend
        const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
            },
            body: JSON.stringify({
                model: 'gpt-3.5-turbo', // Se usa gpt-3.5-turbo o el que el usuario prefiera configurar
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
        console.error('API Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}
