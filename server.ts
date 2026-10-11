import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';
import { PREBUNDLED_AYAH_PODCASTS } from './src/data/ayahPodcastData';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Resolve a valid Gemini API key (filtering out placeholder strings or ambient ADC tokens
 * that lack Generative Language API scopes).
 */
function getValidGeminiApiKey(): string | null {
  const candidates = [process.env.GEMINI_API_KEY, process.env.GOOGLE_API_KEY];
  for (const raw of candidates) {
    const key = raw?.trim();
    if (
      key &&
      key !== 'MY_GEMINI_API_KEY' &&
      key !== 'YOUR_API_KEY' &&
      !key.startsWith('TODO') &&
      key.length > 15
    ) {
      return key;
    }
  }
  return null;
}

/**
 * Deterministic, rich 3-scene storytelling builder grounded in Tafsir Al-Muyassar and Pre-bundled stories.
 * Used when the server operates in offline/local mode or when external AI credentials are unavailable.
 */
function buildStructuredEpisodeFallback(params: {
  surahNumber: number;
  surahName: string;
  ayahNumber: number;
  ayahText: string;
  tafsirText?: string;
}) {
  const { surahNumber, surahName, ayahNumber, ayahText, tafsirText } = params;
  const id = `${surahNumber}:${ayahNumber}`;
  const prebundled = PREBUNDLED_AYAH_PODCASTS[id];

  if (prebundled) {
    return {
      episodeTitle: prebundled.episodeTitle,
      revelationContext: prebundled.scenes.revelationContext,
      propheticLiving: prebundled.scenes.propheticLiving,
      modernReflection: prebundled.scenes.modernReflection,
      practicalStep: prebundled.practicalStep,
      fullNarrationScript: prebundled.fullNarrationScript,
    };
  }

  const cleanTafsir =
    tafsirText && !tafsirText.includes('تعذر') && tafsirText.trim().length > 5
      ? tafsirText.trim()
      : `تأمل في قول الله تعالى: ﴿${ayahText}﴾ وما تحمله هذه الآية الكريمة من هداية وبصيرة للمؤمن في دنياه وآخرته.`;

  const episodeTitle = `رحلة التدبر والبيان في سورة ${surahName} (الآية ${ayahNumber})`;
  const revelationContext = `في رحاب سورة ${surahName}، تتنزل هذه الآية الكريمة: ﴿${ayahText}﴾ لتخاطب القلوب المؤمنة وتكشف لها نور الوحي الإلهي وبيانه الشافي؛ ففي تفسيرها وبيان معناها: ${cleanTafsir} وهي آية تضع المؤمن أمام حقيقة إيمانية راسخة تربط الأرض بالسماء، وتفتح للبصيرة آفاق الفهم عن الله عز وجل وحكمته البالغة في شرعه وقدره.`;
  const propheticLiving = `عاش النبي ﷺ وأصحابه الكرام معاني هذه الآيات واقعاً عملياً وحياةً نابضة؛ فكانوا إذا نزلت الآية تلقّوها بالسمع والطاعة والتدبر العميق، ولا يتجاوزون العشر آيات حتى يتعلموا ما فيها من العلم والعمل معاً، فكانت كل كلمة قرآنية تثمر في قلوبهم يقيناً راسخاً، وفي أخلاقهم سموّاً، وفي مواقفهم ثباتاً وسكينةً تفيض على من حولهم.`;
  const modernReflection = `ورسالة هذه الآية لقلبك اليوم في زحام الحياة المعاصرة وتقلباتها أن تجعلها نوراً يهدي قراراتك، وميزاناً تقيس به خطواتك، وطمأنينةً تسكن بها روحك كلما تذكرت وعد الله وحكمته ولطفه بعباده؛ فالتدبر الحقيقي هو أن ترى أثر الآية في سكون نفسك، وفي إقبالك على ربك بقلب سليم مطمئن واثق بمعية الله.`;
  const practicalStep = `تأمل هذه الآية الكريمة اليوم في صلاتك وخلواتك، وطبّق هدايتها ومعناها في تعاملك مع نفسك ومن حولك بحضور قلب ويقين.`;
  const fullNarrationScript = `${episodeTitle}. المشهد الأول: قصة الآية وتفسيرها وبيانها: ${revelationContext} المشهد الثاني: كيف عاشها النبي صلى الله عليه وسلم والصحابة الكرام: ${propheticLiving} المشهد الثالث: التدبر العميق ورسالتها لقلبك اليوم: ${modernReflection} الخطوة العملية: ${practicalStep}`;

  return {
    episodeTitle,
    revelationContext,
    propheticLiving,
    modernReflection,
    practicalStep,
    fullNarrationScript,
  };
}

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;

  // Security headers for public deployment
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  });

  app.use(express.json({ limit: '10mb' }));

  /**
   * POST /api/ayah-podcast
   * Generates a complete, untimed, in-depth reflection & storytelling script (3 rich scenes + practical daily step)
   * using gemini-3.8-flash, and synthesizes a warm, reverent single-narrator WAV audio track
   * using gemini-3.8-flash-lite-tts, with seamless fallback to curated Tafsir storytelling.
   */
  app.post('/api/ayah-podcast', async (req, res) => {
    const { surahNumber, surahName, ayahNumber, ayahText, tafsirText } = req.body || {};

    if (!surahNumber || !ayahNumber || !ayahText) {
      return res.status(400).json({ error: 'بيانات الآية غير مكتملة' });
    }

    const sNum = Number(surahNumber);
    const aNum = Number(ayahNumber);
    const sName = String(surahName || surahNumber);

    let parsedScript = buildStructuredEpisodeFallback({
      surahNumber: sNum,
      surahName: sName,
      ayahNumber: aNum,
      ayahText: String(ayahText),
      tafsirText: tafsirText ? String(tafsirText) : undefined,
    });

    let audioBase64: string | null = null;
    let audioMimeType = 'audio/wav';

    const apiKey = getValidGeminiApiKey();

    if (apiKey) {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      // Step 1: Generate the comprehensive, untimed 3-scene reflection & storytelling script + practical action step
      const scriptPrompt = `أنت راوٍ ومفسّر ومعدّ لبودكاست قرآني روحاني وتدبري عميق بعنوان "بودكاست الآية" داخل تطبيق "أثر".
مهمتك صياغة حلقة بودكاست تدبرية كاملة ووافية وشاملة (دون التقيد بـ 60 ثانية أو أي حد زمني ضيق)؛ بحيث تكمل شرح الآية الكريمة وتفسيرها وقصتها وتدبرها العميق حتى تكتمل الفكرة والمعنى الإيماني تماماً للمستمع:

سورة: ${sName} - الآية رقم: ${aNum}
نص الآية الكريمة: ﴿${ayahText}﴾
التفسير المعتمد المرجعي: ${tafsirText || 'اعتمد على التفسير الميسر وأمهات كتب التفسير وأسباب النزول الصحيحة الثابتة.'}

المطلوب إخراج JSON منظم يحتوي على:
1. "episodeTitle": عنوان إيماني جذاب وعميق للحلقة يعبّر عن جوهر الآية (من 4 إلى 9 كلمات).
2. "revelationContext": (المشهد الأول: قصة الآية، سبب النزول، والشرح التفصيلي الوافي) اشرح معنى الآية الكريمة ومفرداتها وسياق نزولها وقصتها بأسلوب سردي ممتع ووافٍ يكشف أسرارها البيانية والتفسيرية بالكامل (حوالي 90 إلى 140 كلمة).
3. "propheticLiving": (المشهد الثاني: كيف عاشها النبي ﷺ والصحابة والسلف الصالح) اذكر المواقف النبوية والأحاديث أو قصص الصحابة الكرام وتفاعلهم العملي والقلبي مع هذه الآية وكيف غيّرت نفوسهم وحياتهم (حوالي 80 إلى 120 كلمة).
4. "modernReflection": (المشهد الثالث: التدبر العميق ورسالتها لقلبك وواقعك اليوم) تدبر روحي ونفسي عميق يخاطب المستمع المعاصر، ويربط الآية بواقع حياته وهمومه وسكينته وكيف يداوي بها قلبه بتفصيل وهدوء (حوالي 90 إلى 130 كلمة).
5. "practicalStep": خطوة عملية يومية واضحة وملهمة يطبقها المستمع في يومه عملاً بهذه الآية وتدبرها.

احرص على الفصحى المشرقة السلسة، الدقة الشرعية التامة، وإتمام الشرح والتدبر والقصة كاملةً دون بتر أو استعجال.`;

      try {
        const textResponse = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: scriptPrompt,
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                episodeTitle: {
                  type: Type.STRING,
                  description: 'عنوان الحلقة التدبري العميق',
                },
                revelationContext: {
                  type: Type.STRING,
                  description: 'المشهد الأول: قصة الآية وسبب نزولها وشرحها التفصيلي الكامل',
                },
                propheticLiving: {
                  type: Type.STRING,
                  description: 'المشهد الثاني: كيف عاشها النبي ﷺ والصحابة الكرام بتفصيل وافٍ',
                },
                modernReflection: {
                  type: Type.STRING,
                  description: 'المشهد الثالث: التدبر العميق للآية ورسالتها لقلب المسلم في واقعنا المعاصر',
                },
                practicalStep: {
                  type: Type.STRING,
                  description: 'خطوة عملية يومية لتطبيق الآية اليوم',
                },
              },
              required: [
                'episodeTitle',
                'revelationContext',
                'propheticLiving',
                'modernReflection',
                'practicalStep',
              ],
            },
          },
        });

        const rawJson = textResponse.text?.trim();
        if (rawJson) {
          const aiParsed = JSON.parse(rawJson);
          if (aiParsed.episodeTitle && aiParsed.revelationContext) {
            parsedScript = {
              episodeTitle: aiParsed.episodeTitle,
              revelationContext: aiParsed.revelationContext,
              propheticLiving: aiParsed.propheticLiving || parsedScript.propheticLiving,
              modernReflection: aiParsed.modernReflection || parsedScript.modernReflection,
              practicalStep: aiParsed.practicalStep || parsedScript.practicalStep,
              fullNarrationScript: `${aiParsed.episodeTitle}. ${aiParsed.revelationContext} ${aiParsed.propheticLiving} ${aiParsed.modernReflection} الخطوة العملية: ${aiParsed.practicalStep || parsedScript.practicalStep}`,
            };
          }
        }

        // Step 2: Generate warm, reverent single-narrator audio using gemini-3.8-flash-lite-tts
        try {
          const ttsResponse = await ai.models.generateContent({
            model: 'gemini-3.8-flash-lite-tts',
            contents: [
              {
                role: 'user',
                parts: [
                  {
                    text: parsedScript.fullNarrationScript,
                  },
                ],
              },
            ],
            config: {
              responseModalities: ['AUDIO'],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: { voiceName: 'Charon' },
                },
              },
            },
          });

          const inlinePart = ttsResponse.candidates?.[0]?.content?.parts?.find(
            (p: any) => p.inlineData && p.inlineData.data
          );
          if (inlinePart?.inlineData?.data) {
            audioBase64 = inlinePart.inlineData.data;
            audioMimeType = inlinePart.inlineData.mimeType || 'audio/wav';
          }
        } catch {
          // Audio falls back gracefully to client-side Arabic narration
        }
      } catch {
        // Gracefully use structured Tafsir storytelling script when API credentials/scopes are unavailable
      }
    }

    return res.json({
      id: `${sNum}:${aNum}`,
      surahNumber: sNum,
      surahName: sName,
      ayahNumber: aNum,
      episodeTitle: parsedScript.episodeTitle,
      scenes: {
        revelationContext: parsedScript.revelationContext,
        propheticLiving: parsedScript.propheticLiving,
        modernReflection: parsedScript.modernReflection,
      },
      practicalStep: parsedScript.practicalStep,
      fullNarrationScript: parsedScript.fullNarrationScript,
      audioBase64,
      audioMimeType,
      createdAt: Date.now(),
    });
  });

  if (process.env.NODE_ENV !== 'production') {
    // Intercept any stale/cached browser request to /@vite/client and return a harmless ES module stub
    // so the browser never attempts a WebSocket connection that could fail with 'WebSocket closed without opened'
    app.get('/@vite/client', (_req, res) => {
      res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
      res.setHeader('Cache-Control', 'no-store');
      res.send(
        `export function createHotContext() { return { accept() {}, dispose() {}, prune() {}, invalidate() {}, on() {}, off() {}, send() {} }; }
export function updateStyle(id, content) {
  if (typeof document === 'undefined') return;
  let el = document.querySelector('style[data-vite-dev-id="' + id + '"]');
  if (!el) {
    el = document.createElement('style');
    el.setAttribute('type', 'text/css');
    el.setAttribute('data-vite-dev-id', id);
    document.head.appendChild(el);
  }
  el.textContent = content;
}
export function removeStyle(id) {
  if (typeof document === 'undefined') return;
  const el = document.querySelector('style[data-vite-dev-id="' + id + '"]');
  if (el) el.remove();
}
export function injectQuery(url) { return url; }
`
      );
    });

    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
        watch: null,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Athar server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
