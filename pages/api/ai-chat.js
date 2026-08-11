import { getAuth } from 'firebase-admin/auth';
import admin from 'firebase-admin';
import { AI_TOOL_DECLARATIONS, AI_PROPOSAL_TOOL_DECLARATIONS, AI_PROPOSAL_TOOL_NAMES, runAiTool } from '../../lib/aiTools';

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

// Usamos un modelo estable actualmente disponible para cuentas nuevas. Se lee de env por si
// algún día se quiere cambiar de modelo sin tocar código.
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.6-flash';
// Límite de idas y vueltas modelo -> herramienta -> modelo por mensaje. Evita que una cadena de
// llamadas a función mal encadenada deje la petición colgada o dispare coste sin fin.
const MAX_TOOL_ROUNDS = 4;

function buildSystemInstruction(userProfile) {
    let prompt = `Eres el Coach IA de FEEG, un entrenador personal virtual experto, cercano y motivador, integrado dentro de la app de entrenamiento FEEG.

REGLAS IMPORTANTES:
- Tienes acceso a herramientas que consultan los datos REALES del usuario (su historial de entrenamientos, rutinas, volumen, récords...). Úsalas siempre que la pregunta dependa de datos concretos (progreso, estancamientos, volumen, comparaciones, resúmenes, rutina actual, etc.) en vez de inventar cifras o suponer.
- Si el usuario pregunta algo que no depende de sus datos (técnica de un ejercicio, dudas generales de entrenamiento), responde directamente con tu conocimiento, sin llamar a ninguna herramienta.
- Cuando el usuario pida crear/modificar una rutina, sustituir un ejercicio, montar una sesión rápida o registrar una serie por chat, usa la herramienta propose_* correspondiente en vez de decir que ya lo has hecho: esa herramienta NO aplica el cambio, solo genera una propuesta que el usuario verá como una tarjeta y deberá confirmar. Llama primero a list_exercises (y a get_routines si hace falta conocer una rutina existente) para no inventar ejercicios que no existen en el catálogo de la app. Después de llamar a una herramienta propose_*, responde con un resumen breve y motivador de lo que has propuesto, dejando claro que puede confirmarlo o pedirte cambios.
- Sobre nutrición: la app NO registra comidas ni calorías, así que nunca inventes cifras exactas de macros/calorías del usuario. Puedes dar consejos generales y breves cuando encajen de forma natural (ej. "quizá te vendría bien subir algo los carbohidratos en días de entreno duro"), siempre dejando claro que son orientativos.
- Sé conciso, claro y motivador. Nunca devuelvas la información desordenada. Usa listas cortas cuando ayuden a la claridad.
- Si el usuario pregunta algo completamente ajeno a fitness, salud o bienestar, recuérdale amablemente que eres su entrenador personal virtual y que solo puedes ayudar en esa materia.`;

    if (userProfile) {
        prompt += `\n\n[DATOS DEL USUARIO]:
- Experiencia/Nivel: ${userProfile.level || 'No definido'}
- Altura: ${userProfile.height ? userProfile.height + ' cm' : 'No definida'}
- Peso: ${userProfile.weight ? userProfile.weight + ' kg' : 'No definido'}
Utiliza estos datos para personalizar el tono y las recomendaciones (p.ej. más cuidado con la técnica si es principiante).`;
    }

    return prompt;
}

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
        let decodedToken;
        try {
            decodedToken = await getAuth().verifyIdToken(token);
        } catch (error) {
            return res.status(401).json({ error: 'Invalid or expired firebase token' });
        }
        const uid = decodedToken.uid;

        const { messages, userProfile } = req.body;
        if (!messages || !Array.isArray(messages) || messages.length === 0) {
            return res.status(400).json({ error: 'Invalid messages array' });
        }

        if (!process.env.GEMINI_API_KEY) {
            throw new Error('Falta configurar GEMINI_API_KEY en el servidor.');
        }

        // Cargamos historial de entrenos + rutinas UNA vez por petición y se lo pasamos a las
        // herramientas como contexto en memoria — evita ida y vuelta a Firestore por cada
        // function call que Gemini decida hacer dentro del mismo turno.
        const db = admin.firestore();
        const [workoutsSnap, userDoc] = await Promise.all([
            db.collection('workouts').where('userId', '==', uid).orderBy('completedAt', 'desc').limit(500).get(),
            db.collection('users').doc(uid).get(),
        ]);
        const workouts = workoutsSnap.docs.map((d) => d.data());
        const userData = userDoc.exists ? userDoc.data() : {};
        const toolCtx = { workouts, routines: userData.routines || [] };

        const contents = messages
            .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && m.content)
            .map((m) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: String(m.content) }] }));

        if (contents.length === 0) {
            return res.status(400).json({ error: 'Invalid messages array' });
        }

        const systemInstruction = { parts: [{ text: buildSystemInstruction(userProfile) }] };
        const tools = [{ functionDeclarations: [...AI_TOOL_DECLARATIONS, ...AI_PROPOSAL_TOOL_DECLARATIONS] }];
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${process.env.GEMINI_API_KEY}`;

        let finalText = null;
        // Si el modelo llama a una herramienta propose_*, se captura aquí en vez de ejecutarla —
        // ver la nota en lib/aiTools.ts sobre por qué estas herramientas nunca tocan Firestore
        // desde el servidor. Si llama a varias en el mismo turno, se queda con la última.
        let pendingAction = null;

        for (let round = 0; round < MAX_TOOL_ROUNDS && finalText === null; round++) {
            const geminiResponse = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    systemInstruction,
                    contents,
                    tools,
                    generationConfig: { temperature: 0.6 },
                }),
            });

            const data = await geminiResponse.json();

            if (!geminiResponse.ok) {
                console.error('Gemini Error Details:', data);
                throw new Error(data.error?.message || 'Error en Gemini API');
            }

            const candidate = data.candidates?.[0];
            const parts = candidate?.content?.parts || [];
            const functionCalls = parts.filter((p) => p.functionCall).map((p) => p.functionCall);

            if (functionCalls.length === 0) {
                const text = parts.map((p) => p.text || '').join('').trim();
                finalText = text || 'No he podido generar una respuesta, inténtalo de nuevo.';
                break;
            }

            // Registramos el turno del modelo (con sus llamadas a función) y ejecutamos cada
            // herramienta localmente, devolviendo el resultado como turno "function". Las
            // propose_* no se ejecutan de verdad: se capturan como pendingAction y se les
            // responde un simple acuse de recibo para que el modelo siga con su respuesta final.
            contents.push({ role: 'model', parts });
            const functionResponseParts = functionCalls.map((fc) => {
                if (AI_PROPOSAL_TOOL_NAMES.has(fc.name)) {
                    pendingAction = { type: fc.name, payload: fc.args || {} };
                    return { functionResponse: { name: fc.name, response: { result: { proposed: true } } } };
                }
                return { functionResponse: { name: fc.name, response: { result: runAiTool(fc.name, fc.args, toolCtx) } } };
            });
            // Gemini espera las respuestas de las herramientas como un turno `user`;
            // el rol `function` pertenece a otros formatos de function calling y devuelve
            // INVALID_ARGUMENT en la API actual.
            contents.push({ role: 'user', parts: functionResponseParts });
        }

        if (finalText === null) {
            finalText = 'He tardado demasiado analizando tus datos. Prueba a reformular la pregunta de forma más concreta.';
        }

        res.status(200).json({ reply: finalText, pendingAction });
    } catch (error) {
        console.error('AI Chat API Error:', error.message || error);
        res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
}
