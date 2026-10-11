import { AyahPodcastEpisode, PREBUNDLED_AYAH_PODCASTS } from '../data/ayahPodcastData';
import { OfflineDatabase } from './offlineDatabase';
import { QuranService } from './quranService';

const PODCAST_LOCAL_CACHE_KEYS = 'athar_cached_podcast_ids_v2';

class AyahPodcastManager {
  private cachedIds: Set<string> = new Set();

  constructor() {
    this.initCachedIds();
  }

  private initCachedIds() {
    Object.keys(PREBUNDLED_AYAH_PODCASTS).forEach((id) => this.cachedIds.add(id));
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(PODCAST_LOCAL_CACHE_KEYS);
        if (saved) {
          const arr: string[] = JSON.parse(saved);
          arr.forEach((id) => this.cachedIds.add(id));
        }
      } catch {}
    }
  }

  private markIdCached(id: string) {
    this.cachedIds.add(id);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(PODCAST_LOCAL_CACHE_KEYS, JSON.stringify(Array.from(this.cachedIds)));
      } catch {}
    }
  }

  public isEpisodeAvailableOffline(surahNumber: number, ayahNumber: number): boolean {
    const id = `${surahNumber}:${ayahNumber}`;
    return this.cachedIds.has(id) || Boolean(PREBUNDLED_AYAH_PODCASTS[id]);
  }

  /**
   * Builds a deterministic, comprehensive offline story from Tafsir Al-Muyassar when the user is offline
   * and requests an Ayah that hasn't been AI-generated yet.
   */
  private buildOfflineTafsirStoryFallback(
    surahNumber: number,
    surahName: string,
    ayahNumber: number,
    ayahText: string,
    tafsirText: string
  ): AyahPodcastEpisode {
    const id = `${surahNumber}:${ayahNumber}`;
    const cleanTafsir =
      tafsirText && !tafsirText.includes('تعذر')
        ? tafsirText
        : `تأمل في قول الله تعالى: ﴿${ayahText}﴾ وما تحمله هذه الآية الكريمة من هداية وبصيرة للمؤمن في دنياه وآخرته.`;

    const episodeTitle = `رحلة التدبر والبيان في سورة ${surahName} (الآية ${ayahNumber})`;
    const revelationContext = `في رحاب سورة ${surahName}، تتنزل هذه الآية الكريمة: ﴿${ayahText}﴾ لتخاطب الفطرة الإنسانية وتكشف لها نور الوحي الإلهي وبيانه الشافي: ${cleanTafsir} وهي آية تضع المؤمن أمام حقيقة إيمانية راسخة تربط الأرض بالسماء، وتفتح للبصيرة آفاق الفهم عن الله عز وجل وحكمته البالغة في شرعه وقدره.`;
    const propheticLiving = `عاش النبي ﷺ وأصحابه الكرام معاني هذه الآيات واقعاً عملياً وحياةً نابضة؛ فكانوا إذا نزلت الآية تلقّوها بالسمع والطاعة والتدبر العميق، ولا يتجاوزون العشر آيات حتى يتعلموا ما فيها من العلم والعمل معاً، فكانت كل كلمة قرآنية تثمر في قلوبهم يقيناً راسخاً، وفي أخلاقهم سموّاً، وفي مواقفهم ثباتاً وسكينة.`;
    const modernReflection = `ورسالة هذه الآية لقلبك اليوم في زحام الحياة المعاصرة وتقلباتها أن تجعلها نوراً يهدي قراراتك، وميزاناً تقيس به خطواتك، وطمأنينةً تسكن بها روحك كلما تذكرت وعد الله وحكمته ولطفه بعباده؛ فالتدبر الحقيقي هو أن ترى أثر الآية في سكون نفسك، وفي إقبالك على ربك بقلب سليم مطمئن واثق بمعية الله.`;
    const practicalStep = `تأمل هذه الآية الكريمة اليوم في صلاتك وخلواتك، وطبّق هدايتها ومعناها في تعاملك مع نفسك ومن حولك بحضور قلب ويقين.`;
    const fullNarrationScript = `${episodeTitle}. المشهد الأول: قصة الآية وتفسيرها وبيانها: ${revelationContext} المشهد الثاني: كيف عاشها النبي صلى الله عليه وسلم والصحابة الكرام: ${propheticLiving} المشهد الثالث: التدبر العميق ورسالتها لقلبك اليوم: ${modernReflection} الخطوة العملية: ${practicalStep}`;

    return {
      id,
      surahNumber,
      surahName,
      ayahNumber,
      ayahText,
      episodeTitle,
      scenes: {
        revelationContext,
        propheticLiving,
        modernReflection,
      },
      practicalStep,
      fullNarrationScript,
      createdAt: Date.now(),
    };
  }

  /**
   * Retrieves or generates the comprehensive, untimed Ayah Podcast episode (script + audio).
   * 1. Checks IndexedDB local store ('ayah_podcasts').
   * 2. If prebundled and no audio cached yet, optionally synthesizes high-quality TTS if online.
   * 3. Calls /api/ayah-podcast to generate script + TTS via Gemini 3.8 Flash & TTS, then caches in IndexedDB.
   * 4. Falls back to offline Tafsir story if offline.
   */
  public async getOrGenerateEpisode(params: {
    surahNumber: number;
    surahName: string;
    ayahNumber: number;
    ayahText: string;
    tafsirText?: string;
    forceRefreshAI?: boolean;
  }): Promise<AyahPodcastEpisode> {
    const { surahNumber, surahName, ayahNumber, ayahText, forceRefreshAI } = params;
    const id = `${surahNumber}:${ayahNumber}`;

    // 1. Check IndexedDB first (only use cached record if it has comprehensive narration length >= 450 chars)
    if (!forceRefreshAI) {
      const cached = await OfflineDatabase.getRecord<AyahPodcastEpisode>('ayah_podcasts', id);
      if (
        cached &&
        cached.scenes?.revelationContext &&
        cached.fullNarrationScript &&
        cached.fullNarrationScript.length >= 450
      ) {
        this.markIdCached(id);
        if (cached.audioDataUrl || (typeof navigator !== 'undefined' && !navigator.onLine)) {
          return { ...cached, ayahText };
        }
      }
    }

    // 2. Check Prebundled Library
    const prebundled = PREBUNDLED_AYAH_PODCASTS[id];
    const tafsir =
      params.tafsirText || (await QuranService.getAyahTafsir(surahNumber, ayahNumber));

    // If prebundled story exists and user didn't force AI refresh, serve & cache immediately
    if (prebundled && !forceRefreshAI) {
      const ep: AyahPodcastEpisode = { ...prebundled, ayahText };
      await OfflineDatabase.putRecord('ayah_podcasts', ep);
      this.markIdCached(id);
      return ep;
    }

    // If offline, return prebundled or local Tafsir story immediately
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      if (prebundled) {
        const ep: AyahPodcastEpisode = { ...prebundled, ayahText };
        await OfflineDatabase.putRecord('ayah_podcasts', ep);
        this.markIdCached(id);
        return ep;
      }
      const fallback = this.buildOfflineTafsirStoryFallback(
        surahNumber,
        surahName,
        ayahNumber,
        ayahText,
        tafsir
      );
      await OfflineDatabase.putRecord('ayah_podcasts', fallback);
      this.markIdCached(id);
      return fallback;
    }

    // 3. Online: Call server-side Gemini endpoint (/api/ayah-podcast) for AI storytelling + Gemini TTS audio
    try {
      const response = await fetch('/api/ayah-podcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          surahNumber,
          surahName,
          ayahNumber,
          ayahText,
          tafsirText: tafsir,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const audioDataUrl = data.audioBase64
          ? `data:${data.audioMimeType || 'audio/wav'};base64,${data.audioBase64}`
          : undefined;

        const generatedEpisode: AyahPodcastEpisode = {
          id,
          surahNumber,
          surahName,
          ayahNumber,
          ayahText,
          episodeTitle: data.episodeTitle || prebundled?.episodeTitle || `قصة الآية ${ayahNumber} من سورة ${surahName}`,
          scenes: {
            revelationContext:
              data.scenes?.revelationContext || prebundled?.scenes.revelationContext || '',
            propheticLiving:
              data.scenes?.propheticLiving || prebundled?.scenes.propheticLiving || '',
            modernReflection:
              data.scenes?.modernReflection || prebundled?.scenes.modernReflection || '',
          },
          practicalStep: data.practicalStep || prebundled?.practicalStep || '',
          fullNarrationScript:
            data.fullNarrationScript || prebundled?.fullNarrationScript || '',
          audioDataUrl,
          createdAt: Date.now(),
        };

        await OfflineDatabase.putRecord('ayah_podcasts', generatedEpisode);
        this.markIdCached(id);
        return generatedEpisode;
      }
    } catch (err) {
      console.warn('AyahPodcastService: Server generation unavailable, using local bundle/fallback', err);
    }

    // 4. Fallback if API request failed
    if (prebundled) {
      const ep: AyahPodcastEpisode = { ...prebundled, ayahText };
      await OfflineDatabase.putRecord('ayah_podcasts', ep);
      this.markIdCached(id);
      return ep;
    }

    const fallback = this.buildOfflineTafsirStoryFallback(
      surahNumber,
      surahName,
      ayahNumber,
      ayahText,
      tafsir
    );
    await OfflineDatabase.putRecord('ayah_podcasts', fallback);
    this.markIdCached(id);
    return fallback;
  }
}

export const AyahPodcastService = new AyahPodcastManager();
