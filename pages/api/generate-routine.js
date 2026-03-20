import { getAuth } from 'firebase-admin/auth';
import admin from 'firebase-admin';

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        }),
    });
}

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        // Validación de usuario
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

        const { trainingData } = req.body;

        if (!trainingData) {
            return res.status(400).json({ error: 'Missing trainingData' });
        }

        const systemPrompt = `Eres Coach FEEG, un entrenador personal experto en fitness y fuerza. 
Tu objetivo es crear una rutina de entrenamiento hiper-estructurada, 100% personalizada basada en los datos del usuario.

Datos del usuario:
- Edad: ${trainingData.age || 'No especificada'}
- Sexo: ${trainingData.sex || 'No especificado'}
- Altura: ${trainingData.height ? trainingData.height + ' cm' : 'No especificada'}
- Peso: ${trainingData.weight ? trainingData.weight + ' kg' : 'No especificado'}
- Objetivo: ${trainingData.goal || 'General'}
- Nivel: ${trainingData.level || 'Intermedio'}
- Días disponibles a la semana: ${trainingData.days || 3}
- Material disponible: ${trainingData.material || 'Gimnasio completo'}
- Lesiones o preferencias: ${trainingData.preferences || 'Ninguna'}

DEBES devolver ÚNICAMENTE un objeto JSON válido con la siguiente estructura exacta:
{
  "title": "Nombre atractivo de la rutina",
  "summary": "Breve explicación de por qué esta rutina es ideal para el usuario basándose en sus datos",
  "days": [
    {
      "name": "Nombre o enfoque del día (ej. Día 1: Pierna Fuerza)",
      "exercises": [
        {
          "name": "Nombre del ejercicio",
          "sets": "Número de series (ej. '3' o '4')",
          "reps": "Rango de reps (ej. '8-12')",
          "rest": "Tiempo de descanso (ej. '90s')",
          "note": "Breve tip biomecánico sobre el ejercicio (1 frase)"
        }
      ]
    }
  ],
  "advice": "Un consejo general o de nutrición aplicable a su objetivo"
}

No devuelvas NADA más que el JSON válido.`;

        const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini', // Modelo rápido y estructurado ideal para JSON
                messages: [
                    { role: 'system', content: systemPrompt }
                ],
                response_format: { type: "json_object" },
                temperature: 0.7,
            })
        });

        const aiData = await openAIResponse.json();

        if (!openAIResponse.ok) {
            console.error('OpenAI Error Details:', aiData);
            throw new Error(aiData.error?.message || 'Error en OpenAI API');
        }

        const replyContent = aiData.choices[0].message.content;
        const routineJSON = JSON.parse(replyContent);

        res.status(200).json(routineJSON);

    } catch (error) {
        console.error('API Error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}
