import { AyahPodcastEpisode, PREBUNDLED_AYAH_PODCASTS } from '../data/ayahPodcastData';
import { OfflineDatabase } from './offlineDatabase';
import { QuranService } from './quranService';
import { AudioService } from './audioService';
import { ALL_SURAHS } from '../data/surahsData';

const PODCAST_LOCAL_CACHE_KEYS = 'athar_cached_podcast_ids_v2';

export interface ActivePodcastPlaybackState {
  isActive: boolean;
  isSheetOpen: boolean;
  isLoading: boolean;
  isPlaying: boolean;
  episode: AyahPodcastEpisode | null;
  surahNumber: number;
  surahName: string;
  ayahNumber: number;
  ayahText: string;
  totalAyahsInSurah: number;
  activeSceneIndex: 0 | 1 | 2;
  progressPercent: number;
  elapsedSeconds: number;
  totalDurationSeconds: number;
  isContinuousDriveMode: boolean;
}

type PodcastPlaybackListener = (state: ActivePodcastPlaybackState | null) => void;

class AyahPodcastManager {
  private cachedIds: Set<string> = new Set();
  private playbackListeners: Set<PodcastPlaybackListener> = new Set();
  private playbackState: ActivePodcastPlaybackState | null = null;
  private audioElement: HTMLAudioElement | null = null;
  private speechTimerId: ReturnType<typeof setInterval> | null = null;
  private autoAdvanceTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private currentSessionId: number = 0;

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

  public subscribe(listener: PodcastPlaybackListener): () => void {
    this.playbackListeners.add(listener);
    listener(this.playbackState ? { ...this.playbackState } : null);
    return () => {
      this.playbackListeners.delete(listener);
    };
  }

  public getPlaybackState(): ActivePodcastPlaybackState | null {
    return this.playbackState ? { ...this.playbackState } : null;
  }

  private emitPlaybackState() {
    const snapshot = this.playbackState ? { ...this.playbackState } : null;
    this.playbackListeners.forEach((cb) => {
      try {
        cb(snapshot);
      } catch {}
    });
  }

  public setSheetOpen(open: boolean) {
    if (!this.playbackState) return;
    this.playbackState.isSheetOpen = open;
    this.emitPlaybackState();
  }

  public minimizeSheet() {
    if (!this.playbackState) return;
    this.playbackState.isSheetOpen = false;
    this.emitPlaybackState();
  }

  public expandSheet() {
    if (!this.playbackState) return;
    this.playbackState.isSheetOpen = true;
    this.emitPlaybackState();
  }

  public setContinuousDriveMode(enabled: boolean) {
    if (!this.playbackState) return;
    this.playbackState.isContinuousDriveMode = enabled;
    this.emitPlaybackState();
  }

  private clearActiveAudioAndTimers() {
    if (this.autoAdvanceTimeoutId) {
      clearTimeout(this.autoAdvanceTimeoutId);
      this.autoAdvanceTimeoutId = null;
    }
    if (this.audioElement) {
      try {
        this.audioElement.pause();
        this.audioElement.src = '';
      } catch {}
      this.audioElement = null;
    }
    if (this.speechTimerId) {
      clearInterval(this.speechTimerId);
      this.speechTimerId = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {}
    }
  }

  public stopPlayback() {
    this.currentSessionId++;
    this.clearActiveAudioAndTimers();
    this.playbackState = null;
    this.emitPlaybackState();
  }

  private estimateNarrationSeconds(script: string): number {
    const wordCount = script ? script.trim().split(/\s+/).length : 120;
    return Math.max(75, Math.round(wordCount / 1.85));
  }

  private computeSceneIndex(percent: number): 0 | 1 | 2 {
    if (percent < 34) return 0;
    if (percent < 68) return 1;
    return 2;
  }

  public async openAndPlayEpisode(params: {
    surahNumber: number;
    surahName?: string;
    ayahNumber: number;
    ayahText?: string;
    totalAyahsInSurah?: number;
    openSheet?: boolean;
  }): Promise<void> {
    const sessionId = ++this.currentSessionId;
    const surahMeta = ALL_SURAHS.find((s) => s.number === params.surahNumber);
    const surahName = params.surahName || surahMeta?.name || '';
    const totalAyahsInSurah = params.totalAyahsInSurah || surahMeta?.numberOfAyahs || 1;
    const openSheet = params.openSheet !== undefined ? params.openSheet : true;

    // If the same Ayah is already loaded, just open the sheet (and resume if paused)
    if (
      this.playbackState &&
      this.playbackState.surahNumber === params.surahNumber &&
      this.playbackState.ayahNumber === params.ayahNumber &&
      this.playbackState.episode &&
      !this.playbackState.isLoading
    ) {
      this.playbackState.isSheetOpen = openSheet;
      this.emitPlaybackState();
      if (!this.playbackState.isPlaying) {
        this.togglePlayPause();
      }
      return;
    }

    this.clearActiveAudioAndTimers();
    AudioService.pause();

    let resolvedAyahText = params.ayahText || '';
    if (!resolvedAyahText) {
      try {
        const res = await QuranService.getSurahAyahs(params.surahNumber);
        const found = res.ayahs.find((a) => a.numberInSurah === params.ayahNumber);
        if (found) resolvedAyahText = found.text;
      } catch {}
    }

    const preserveContinuous = this.playbackState?.isContinuousDriveMode ?? false;

    this.playbackState = {
      isActive: true,
      isSheetOpen: openSheet,
      isLoading: true,
      isPlaying: false,
      episode: null,
      surahNumber: params.surahNumber,
      surahName,
      ayahNumber: params.ayahNumber,
      ayahText: resolvedAyahText,
      totalAyahsInSurah,
      activeSceneIndex: 0,
      progressPercent: 0,
      elapsedSeconds: 0,
      totalDurationSeconds: 120,
      isContinuousDriveMode: preserveContinuous,
    };
    this.emitPlaybackState();

    try {
      const ep = await this.getOrGenerateEpisode({
        surahNumber: params.surahNumber,
        surahName,
        ayahNumber: params.ayahNumber,
        ayahText: resolvedAyahText,
      });

      if (sessionId !== this.currentSessionId || !this.playbackState) return;

      this.playbackState.episode = ep;
      this.playbackState.ayahText = ep.ayahText || resolvedAyahText;
      this.playbackState.isLoading = false;
      this.emitPlaybackState();

      this.startAudioForEpisode(ep, sessionId);
    } catch {
      if (sessionId !== this.currentSessionId || !this.playbackState) return;
      this.playbackState.isLoading = false;
      this.emitPlaybackState();
    }
  }

  private startAudioForEpisode(ep: AyahPodcastEpisode, sessionId: number) {
    this.clearActiveAudioAndTimers();
    if (!this.playbackState || sessionId !== this.currentSessionId) return;

    if (typeof navigator !== 'undefined' && 'mediaSession' in navigator) {
      try {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: `بودكاست الآية: ${ep.episodeTitle}`,
          artist: `سورة ${ep.surahName} · الآية ${ep.ayahNumber}`,
          album: 'أثر | بودكاست الآية والتدبر الصوتي',
        });
      } catch {}
    }

    if (ep.audioDataUrl) {
      const audio = new Audio(ep.audioDataUrl);
      this.audioElement = audio;
      const fallbackEstimated = this.estimateNarrationSeconds(ep.fullNarrationScript);

      audio.onloadedmetadata = () => {
        if (!this.playbackState || sessionId !== this.currentSessionId) return;
        if (audio.duration && isFinite(audio.duration) && audio.duration > 0) {
          this.playbackState.totalDurationSeconds = Math.round(audio.duration);
        } else {
          this.playbackState.totalDurationSeconds = fallbackEstimated;
        }
        this.emitPlaybackState();
      };

      audio.ontimeupdate = () => {
        if (!this.playbackState || sessionId !== this.currentSessionId) return;
        const cur = audio.currentTime || 0;
        const dur =
          audio.duration && isFinite(audio.duration) && audio.duration > 0
            ? audio.duration
            : Math.max(fallbackEstimated, cur + 5);
        const pct = Math.min(100, Math.max(0, (cur / dur) * 100));
        this.playbackState.elapsedSeconds = Math.floor(cur);
        this.playbackState.totalDurationSeconds = Math.round(dur);
        this.playbackState.progressPercent = pct;
        this.playbackState.activeSceneIndex = this.computeSceneIndex(pct);
        this.emitPlaybackState();
      };

      audio.onended = () => {
        if (sessionId !== this.currentSessionId) return;
        this.handleEpisodeEnded(sessionId);
      };

      audio.onerror = () => {
        if (sessionId !== this.currentSessionId) return;
        this.startSpeechSynthesisFallback(ep, sessionId);
      };

      audio
        .play()
        .then(() => {
          if (!this.playbackState || sessionId !== this.currentSessionId) return;
          this.playbackState.isPlaying = true;
          this.emitPlaybackState();
        })
        .catch(() => {
          if (sessionId !== this.currentSessionId) return;
          this.startSpeechSynthesisFallback(ep, sessionId);
        });
      return;
    }

    this.startSpeechSynthesisFallback(ep, sessionId);
  }

  private startSpeechSynthesisFallback(ep: AyahPodcastEpisode, sessionId: number) {
    if (!this.playbackState || sessionId !== this.currentSessionId) return;
    let dynamicTotalSeconds = this.estimateNarrationSeconds(ep.fullNarrationScript);
    this.playbackState.totalDurationSeconds = dynamicTotalSeconds;
    this.playbackState.elapsedSeconds = 0;
    this.playbackState.progressPercent = 0;
    this.playbackState.isPlaying = true;
    this.emitPlaybackState();

    let hasSpeechApi = false;
    let utteranceFinished = false;

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(ep.fullNarrationScript);
        utterance.lang = 'ar-SA';
        utterance.rate = 0.92;
        utterance.pitch = 0.95;

        const voices = window.speechSynthesis.getVoices();
        const arabicVoice = voices.find((v) => v.lang.toLowerCase().startsWith('ar'));
        if (arabicVoice) {
          utterance.voice = arabicVoice;
        }

        utterance.onend = () => {
          utteranceFinished = true;
          if (this.speechTimerId) {
            clearInterval(this.speechTimerId);
            this.speechTimerId = null;
          }
          if (sessionId === this.currentSessionId) {
            this.handleEpisodeEnded(sessionId);
          }
        };

        utterance.onerror = () => {
          utteranceFinished = true;
        };

        window.speechSynthesis.speak(utterance);
        hasSpeechApi = true;
      } catch {}
    }

    let currentSec = 0;
    if (this.speechTimerId) clearInterval(this.speechTimerId);
    this.speechTimerId = setInterval(() => {
      if (!this.playbackState || sessionId !== this.currentSessionId) {
        if (this.speechTimerId) clearInterval(this.speechTimerId);
        return;
      }
      currentSec += 1;
      const synthSpeaking =
        hasSpeechApi &&
        typeof window !== 'undefined' &&
        'speechSynthesis' in window &&
        window.speechSynthesis.speaking;

      if (synthSpeaking && currentSec >= dynamicTotalSeconds - 3) {
        dynamicTotalSeconds = currentSec + 8;
        this.playbackState.totalDurationSeconds = dynamicTotalSeconds;
      }

      const pct = Math.min(99, (currentSec / dynamicTotalSeconds) * 100);
      this.playbackState.elapsedSeconds = currentSec;
      this.playbackState.progressPercent = pct;
      this.playbackState.activeSceneIndex = this.computeSceneIndex(pct);
      this.emitPlaybackState();

      if (!synthSpeaking && (utteranceFinished || currentSec >= dynamicTotalSeconds)) {
        if (this.speechTimerId) {
          clearInterval(this.speechTimerId);
          this.speechTimerId = null;
        }
        this.handleEpisodeEnded(sessionId);
      }
    }, 1000);
  }

  private handleEpisodeEnded(sessionId: number) {
    if (!this.playbackState || sessionId !== this.currentSessionId) return;
    this.playbackState.isPlaying = false;
    this.playbackState.progressPercent = 100;
    this.playbackState.activeSceneIndex = 2;
    this.emitPlaybackState();

    if (
      this.playbackState.isContinuousDriveMode &&
      this.playbackState.ayahNumber < this.playbackState.totalAyahsInSurah
    ) {
      const nextAyah = this.playbackState.ayahNumber + 1;
      const sNum = this.playbackState.surahNumber;
      const sName = this.playbackState.surahName;
      const total = this.playbackState.totalAyahsInSurah;
      const sheetOpen = this.playbackState.isSheetOpen;
      this.autoAdvanceTimeoutId = setTimeout(() => {
        if (sessionId === this.currentSessionId) {
          this.openAndPlayEpisode({
            surahNumber: sNum,
            surahName: sName,
            ayahNumber: nextAyah,
            totalAyahsInSurah: total,
            openSheet: sheetOpen,
          });
        }
      }, 1500);
    }
  }

  public togglePlayPause() {
    if (!this.playbackState || !this.playbackState.episode) return;

    if (this.audioElement) {
      if (this.playbackState.isPlaying) {
        this.audioElement.pause();
        this.playbackState.isPlaying = false;
        this.emitPlaybackState();
      } else {
        AudioService.pause();
        this.audioElement.play().catch(() => {});
        this.playbackState.isPlaying = true;
        this.emitPlaybackState();
      }
      return;
    }

    if (this.playbackState.isPlaying) {
      if (this.speechTimerId) {
        clearInterval(this.speechTimerId);
        this.speechTimerId = null;
      }
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        try {
          window.speechSynthesis.pause();
        } catch {}
      }
      this.playbackState.isPlaying = false;
      this.emitPlaybackState();
    } else {
      AudioService.pause();
      if (
        typeof window !== 'undefined' &&
        'speechSynthesis' in window &&
        window.speechSynthesis.paused
      ) {
        try {
          window.speechSynthesis.resume();
          this.playbackState.isPlaying = true;
          this.emitPlaybackState();
          return;
        } catch {}
      }
      this.startAudioForEpisode(this.playbackState.episode, this.currentSessionId);
    }
  }

  public jumpToScene(sceneIdx: 0 | 1 | 2) {
    if (!this.playbackState) return;
    this.playbackState.activeSceneIndex = sceneIdx;
    const targetPct = sceneIdx === 0 ? 5 : sceneIdx === 1 ? 36 : 70;
    this.playbackState.progressPercent = targetPct;
    if (this.audioElement && this.audioElement.duration && isFinite(this.audioElement.duration)) {
      this.audioElement.currentTime = (targetPct / 100) * this.audioElement.duration;
    }
    this.emitPlaybackState();
  }

  public playNextAyahEpisode() {
    if (!this.playbackState) return;
    if (this.playbackState.ayahNumber < this.playbackState.totalAyahsInSurah) {
      this.openAndPlayEpisode({
        surahNumber: this.playbackState.surahNumber,
        surahName: this.playbackState.surahName,
        ayahNumber: this.playbackState.ayahNumber + 1,
        totalAyahsInSurah: this.playbackState.totalAyahsInSurah,
        openSheet: this.playbackState.isSheetOpen,
      });
    }
  }

  public playPreviousAyahEpisode() {
    if (!this.playbackState) return;
    if (this.playbackState.ayahNumber > 1) {
      this.openAndPlayEpisode({
        surahNumber: this.playbackState.surahNumber,
        surahName: this.playbackState.surahName,
        ayahNumber: this.playbackState.ayahNumber - 1,
        totalAyahsInSurah: this.playbackState.totalAyahsInSurah,
        openSheet: this.playbackState.isSheetOpen,
      });
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
          return { ...cached, ayahText: ayahText || cached.ayahText };
        }
      }
    }

    const prebundled = PREBUNDLED_AYAH_PODCASTS[id];
    const tafsir =
      params.tafsirText || (await QuranService.getAyahTafsir(surahNumber, ayahNumber));

    if (prebundled && !forceRefreshAI) {
      const ep: AyahPodcastEpisode = { ...prebundled, ayahText: ayahText || prebundled.ayahText };
      await OfflineDatabase.putRecord('ayah_podcasts', ep);
      this.markIdCached(id);
      return ep;
    }

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      if (prebundled) {
        const ep: AyahPodcastEpisode = { ...prebundled, ayahText: ayahText || prebundled.ayahText };
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

    if (prebundled) {
      const ep: AyahPodcastEpisode = { ...prebundled, ayahText: ayahText || prebundled.ayahText };
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
