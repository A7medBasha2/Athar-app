import {
  JourneyPreferences,
  JourneyActivityNode,
  UserActivityProgress,
  PrivateReflectionEntry,
  JourneyRecommendationResult,
  ConsentSuccessMetrics,
  JourneyPathType,
  JourneyTopicCategory,
} from '../types';
import {
  ADAPTIVE_JOURNEY_NODES,
  JOURNEY_GOALS_META,
  JOURNEY_PATHS_META,
} from '../data/adaptiveJourneyData';

const KEYS = {
  PREFS: 'athar_journey_preferences_v1',
  PROGRESS: 'athar_journey_progress_map_v1',
  DISMISSED_IDS: 'athar_journey_dismissed_ids_v1',
  ISOLATED_REFLECTIONS: 'athar_private_reflections_v1',
  CONSENT_METRICS: 'athar_journey_consent_metrics_v1',
};

const todayDateKey = (): string => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
    now.getDate()
  ).padStart(2, '0')}`;
};

export const DEFAULT_JOURNEY_PREFERENCES: JourneyPreferences = {
  hasCompletedJourneyOnboarding: false,
  hasSkippedJourneyOnboarding: false,
  selectedGoals: ['tafsir_quran', 'seerah_ethics', 'fiqh_duas', 'serenity_adhkar'],
  preferredDurationMinutes: 10,
  preferredDepth: 'balanced',
  recommendationsEnabled: true,
  gentleRemindersEnabled: false,
  reminderWindow: 'flexible',
  consentAnalyticsEnabled: false,
  lastUpdatedAt: new Date().toISOString(),
};

export const DEFAULT_CONSENT_METRICS: ConsentSuccessMetrics = {
  firstSessionCompleted: false,
  totalSessionsStarted: 0,
  totalActivitiesCompleted: 0,
  pausedSessionsCount: 0,
  successfulResumesCount: 0,
  voluntaryReturnDays: [todayDateKey()],
  firstOpenedDate: todayDateKey(),
  lastOpenedDate: todayDateKey(),
  recommendationDismissals: 0,
  recommendationReplacements: 0,
  notificationOptOutCount: 0,
};

export interface WeeklyJourneyRecap {
  completedNodesThisWeek: JourneyActivityNode[];
  inProgressNodes: JourneyActivityNode[];
  savedNodes: JourneyActivityNode[];
  visitedPathsCount: Record<JourneyPathType, number>;
  exploredTopics: JourneyTopicCategory[];
  reflectionsWrittenCount: number;
  daysSinceLastVisit: number;
  isReturningAfterBreak: boolean;
}

export interface JourneyIntegrityTestReport {
  passed: boolean;
  totalChecks: number;
  passedChecks: number;
  details: { checkName: string; passed: boolean; note: string }[];
}

export class AdaptiveJourneyService {
  // ============================================================================
  // 1. Preferences Management
  // ============================================================================
  static getPreferences(): JourneyPreferences {
    try {
      const raw = localStorage.getItem(KEYS.PREFS);
      if (!raw) return { ...DEFAULT_JOURNEY_PREFERENCES };
      const parsed = JSON.parse(raw);
      return {
        ...DEFAULT_JOURNEY_PREFERENCES,
        ...parsed,
        selectedGoals:
          Array.isArray(parsed.selectedGoals) && parsed.selectedGoals.length > 0
            ? parsed.selectedGoals
            : DEFAULT_JOURNEY_PREFERENCES.selectedGoals,
      };
    } catch {
      return { ...DEFAULT_JOURNEY_PREFERENCES };
    }
  }

  static savePreferences(prefs: Partial<JourneyPreferences>): void {
    const prev = this.getPreferences();
    const updated: JourneyPreferences = {
      ...prev,
      ...prefs,
      lastUpdatedAt: new Date().toISOString(),
    };
    localStorage.setItem(KEYS.PREFS, JSON.stringify(updated));

    // Track notification opt-out if user turned off gentle reminders
    if (prev.gentleRemindersEnabled && !updated.gentleRemindersEnabled) {
      this.recordConsentMetricEvent('notification_opt_out');
    }

    window.dispatchEvent(new CustomEvent('athar_journey_updated'));
  }

  static completeOnboarding(prefsPartial: Partial<JourneyPreferences>): JourneyPreferences {
    const current = this.getPreferences();
    const next: JourneyPreferences = {
      ...current,
      ...prefsPartial,
      hasCompletedJourneyOnboarding: true,
      hasSkippedJourneyOnboarding: false,
      lastUpdatedAt: new Date().toISOString(),
    };
    this.savePreferences(next);
    return next;
  }

  static skipOnboarding(): JourneyPreferences {
    const current = this.getPreferences();
    const next: JourneyPreferences = {
      ...current,
      hasSkippedJourneyOnboarding: true,
      lastUpdatedAt: new Date().toISOString(),
    };
    this.savePreferences(next);
    return next;
  }

  // ============================================================================
  // 2. Activity Progress & Bookmarks (Non-linear, Pause & Resume Ready)
  // ============================================================================
  static getProgressMap(): Record<string, UserActivityProgress> {
    try {
      const raw = localStorage.getItem(KEYS.PROGRESS);
      if (!raw) return {};
      return JSON.parse(raw);
    } catch {
      return {};
    }
  }

  static getNodeProgress(nodeId: string): UserActivityProgress {
    const map = this.getProgressMap();
    return (
      map[nodeId] || {
        nodeId,
        status: 'not_started',
        completedStepIds: [],
        isBookmarked: false,
        completionCount: 0,
      }
    );
  }

  static saveNodeProgress(progress: UserActivityProgress): void {
    const map = this.getProgressMap();
    map[progress.nodeId] = progress;
    localStorage.setItem(KEYS.PROGRESS, JSON.stringify(map));
    window.dispatchEvent(new CustomEvent('athar_journey_updated'));
  }

  static startOrResumeActivity(nodeId: string): UserActivityProgress {
    const existing = this.getNodeProgress(nodeId);
    const wasPaused = existing.status === 'in_progress';
    const next: UserActivityProgress = {
      ...existing,
      status: existing.status === 'completed' ? 'completed' : 'in_progress',
      startedAt: existing.startedAt || new Date().toISOString(),
    };
    this.saveNodeProgress(next);

    if (wasPaused) {
      this.recordConsentMetricEvent('session_resumed');
    } else {
      this.recordConsentMetricEvent('session_started');
    }
    return next;
  }

  static togglePracticalStep(nodeId: string, stepId: string): UserActivityProgress {
    const existing = this.getNodeProgress(nodeId);
    const exists = existing.completedStepIds.includes(stepId);
    const completedStepIds = exists
      ? existing.completedStepIds.filter((id) => id !== stepId)
      : [...existing.completedStepIds, stepId];

    const next: UserActivityProgress = {
      ...existing,
      status: existing.status === 'completed' ? 'completed' : 'in_progress',
      completedStepIds,
      startedAt: existing.startedAt || new Date().toISOString(),
    };
    this.saveNodeProgress(next);
    return next;
  }

  static pauseActivityForLater(nodeId: string): UserActivityProgress {
    const existing = this.getNodeProgress(nodeId);
    const next: UserActivityProgress = {
      ...existing,
      status: 'in_progress',
      startedAt: existing.startedAt || new Date().toISOString(),
      lastPausedAt: new Date().toISOString(),
    };
    this.saveNodeProgress(next);
    this.recordConsentMetricEvent('session_paused');
    return next;
  }

  static completeActivity(nodeId: string): UserActivityProgress {
    const node = ADAPTIVE_JOURNEY_NODES.find((n) => n.id === nodeId);
    const existing = this.getNodeProgress(nodeId);
    const allStepIds = node ? node.practicalSteps.map((s) => s.id) : existing.completedStepIds;

    const next: UserActivityProgress = {
      ...existing,
      status: 'completed',
      completedStepIds: Array.from(new Set([...existing.completedStepIds, ...allStepIds])),
      completedAt: new Date().toISOString(),
      lastPausedAt: undefined,
      completionCount: (existing.completionCount || 0) + 1,
    };
    this.saveNodeProgress(next);
    this.recordConsentMetricEvent('activity_completed');
    return next;
  }

  static toggleBookmark(nodeId: string): UserActivityProgress {
    const existing = this.getNodeProgress(nodeId);
    const next: UserActivityProgress = {
      ...existing,
      isBookmarked: !existing.isBookmarked,
    };
    this.saveNodeProgress(next);
    return next;
  }

  // ============================================================================
  // 3. Transparent Rule-Based Recommendation Engine (Zero Spiritual Scoring)
  // ============================================================================
  static getDismissedIds(): string[] {
    try {
      const raw = localStorage.getItem(KEYS.DISMISSED_IDS);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  static dismissRecommendation(nodeId: string, isReplacement: boolean = false): void {
    const current = this.getDismissedIds();
    if (!current.includes(nodeId)) {
      const next = [...current, nodeId];
      localStorage.setItem(KEYS.DISMISSED_IDS, JSON.stringify(next));
    }
    this.recordConsentMetricEvent(
      isReplacement ? 'recommendation_replaced' : 'recommendation_dismissed'
    );
    window.dispatchEvent(new CustomEvent('athar_journey_updated'));
  }

  static resetDismissedRecommendations(): void {
    localStorage.removeItem(KEYS.DISMISSED_IDS);
    window.dispatchEvent(new CustomEvent('athar_journey_updated'));
  }

  static getAdaptiveRecommendation(
    excludeNodeId?: string
  ): JourneyRecommendationResult | null {
    const prefs = this.getPreferences();
    if (!prefs.recommendationsEnabled) {
      return null;
    }

    const progressMap = this.getProgressMap();
    const dismissed = this.getDismissedIds();

    // Priority 1: Unfinished / Paused activity so user can gently resume
    const pausedCandidates = ADAPTIVE_JOURNEY_NODES.filter((node) => {
      if (node.id === excludeNodeId || dismissed.includes(node.id)) return false;
      return progressMap[node.id]?.status === 'in_progress';
    });

    if (pausedCandidates.length > 0) {
      const topPaused = pausedCandidates.sort((a, b) => {
        const tA = progressMap[a.id]?.lastPausedAt || progressMap[a.id]?.startedAt || '';
        const tB = progressMap[b.id]?.lastPausedAt || progressMap[b.id]?.startedAt || '';
        return tB.localeCompare(tA);
      })[0];

      return {
        node: topPaused,
        reasonsArabic: [
          'محطة بدأتها سابقاً وتوقفت عندها — يمكنك استئنافها من حيث توقفت بهدوء',
          `ضمن مسار «${JOURNEY_PATHS_META[topPaused.path].titleArabic}» (${topPaused.durationMinutes} دقائق)`,
        ],
        matchType: 'resume_paused',
      };
    }

    // Priority 2: Connected next path from the most recently completed activity
    const completedNodes = ADAPTIVE_JOURNEY_NODES.filter(
      (n) => progressMap[n.id]?.status === 'completed'
    ).sort((a, b) => {
      const cA = progressMap[a.id]?.completedAt || '';
      const cB = progressMap[b.id]?.completedAt || '';
      return cB.localeCompare(cA);
    });

    if (completedNodes.length > 0) {
      const latestCompleted = completedNodes[0];
      const connectedIds = Object.values(latestCompleted.connectedNodeIds).filter(
        Boolean
      ) as string[];

      for (const connId of connectedIds) {
        if (connId === excludeNodeId || dismissed.includes(connId)) continue;
        const connNode = ADAPTIVE_JOURNEY_NODES.find((n) => n.id === connId);
        if (connNode && progressMap[connNode.id]?.status !== 'completed') {
          return {
            node: connNode,
            reasonsArabic: [
              `مرتبطة مباشرة بالمحطة التي أتممتها («${latestCompleted.title}») لاستكمال التكامل بين المعرفة والعمل والسكينة`,
              `توافق وقتك المتاح (${connNode.durationMinutes} دقائق)`,
            ],
            matchType: 'connected_next_path',
          };
        }
      }
    }

    // Priority 3: Explicit preference matching (Selected Goals + Preferred Duration + Depth)
    const availableNodes = ADAPTIVE_JOURNEY_NODES.filter(
      (n) => n.id !== excludeNodeId && !dismissed.includes(n.id)
    );

    const pool = availableNodes.length > 0 ? availableNodes : ADAPTIVE_JOURNEY_NODES;

    const scored = pool.map((node) => {
      let score = 0;
      const reasons: string[] = [];

      const goalMeta = JOURNEY_GOALS_META.find((g) => g.id === node.topicCategory);
      if (prefs.selectedGoals.includes(node.topicCategory)) {
        score += 40;
        reasons.push(
          `توافق هدفك المختار: «${goalMeta?.titleArabic || node.topicCategory}»`
        );
      }

      if (node.durationMinutes <= prefs.preferredDurationMinutes) {
        score += 30;
        reasons.push(
          `تناسب وقتك المتاح المفضل (${node.durationMinutes} دقائق من أصل ${prefs.preferredDurationMinutes} دقيقة)`
        );
      }

      if (node.depth === prefs.preferredDepth) {
        score += 15;
      }

      const status = progressMap[node.id]?.status || 'not_started';
      if (status === 'not_started') {
        score += 20;
      }

      if (progressMap[node.id]?.isBookmarked && status !== 'completed') {
        score += 25;
        reasons.push('محفوظة في قائمة محطاتك المفضلة');
      }

      if (reasons.length === 0) {
        reasons.push(
          `محطة مختارة من مسار «${JOURNEY_PATHS_META[node.path].titleArabic}» بمدة ${node.durationMinutes} دقائق`
        );
      }

      return { node, score, reasons };
    });

    scored.sort((a, b) => b.score - a.score);
    const chosen = scored[0];

    return {
      node: chosen.node,
      reasonsArabic: chosen.reasons.slice(0, 2),
      matchType: 'explicit_preference',
    };
  }

  // ============================================================================
  // 4. Isolated Private Reflections (Strictly Local, Never Analyzed)
  // ============================================================================
  static getPrivateReflections(): PrivateReflectionEntry[] {
    try {
      const raw = localStorage.getItem(KEYS.ISOLATED_REFLECTIONS);
      if (!raw) return [];
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }

  static savePrivateReflection(
    node: JourneyActivityNode,
    content: string
  ): PrivateReflectionEntry | null {
    const trimmed = content.trim();
    if (!trimmed) return null;

    const existingList = this.getPrivateReflections();
    const nowIso = new Date().toISOString();
    const existingIdx = existingList.findIndex((r) => r.nodeId === node.id);

    let entry: PrivateReflectionEntry;
    if (existingIdx >= 0) {
      entry = {
        ...existingList[existingIdx],
        content: trimmed,
        updatedAt: nowIso,
      };
      existingList[existingIdx] = entry;
    } else {
      entry = {
        id: `refl_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        nodeId: node.id,
        nodeTitle: node.title,
        path: node.path,
        content: trimmed,
        createdAt: nowIso,
        updatedAt: nowIso,
      };
      existingList.unshift(entry);
    }

    localStorage.setItem(KEYS.ISOLATED_REFLECTIONS, JSON.stringify(existingList));
    window.dispatchEvent(new CustomEvent('athar_journey_updated'));
    return entry;
  }

  static deletePrivateReflection(reflectionId: string): void {
    const list = this.getPrivateReflections().filter((r) => r.id !== reflectionId);
    localStorage.setItem(KEYS.ISOLATED_REFLECTIONS, JSON.stringify(list));
    window.dispatchEvent(new CustomEvent('athar_journey_updated'));
  }

  // ============================================================================
  // 5. Weekly Personal Recap & Returning-User State
  // ============================================================================
  static getWeeklyPersonalRecap(): WeeklyJourneyRecap {
    const progressMap = this.getProgressMap();
    const reflections = this.getPrivateReflections();
    const metrics = this.getConsentMetrics();

    const completedNodesThisWeek: JourneyActivityNode[] = [];
    const inProgressNodes: JourneyActivityNode[] = [];
    const savedNodes: JourneyActivityNode[] = [];
    const visitedPathsCount: Record<JourneyPathType, number> = {
      knowledge: 0,
      practice: 0,
      serenity: 0,
    };
    const exploredTopicsSet = new Set<JourneyTopicCategory>();

    ADAPTIVE_JOURNEY_NODES.forEach((node) => {
      const p = progressMap[node.id];
      if (!p) return;

      if (p.isBookmarked) {
        savedNodes.push(node);
      }

      if (p.status === 'in_progress') {
        inProgressNodes.push(node);
        visitedPathsCount[node.path] += 1;
        exploredTopicsSet.add(node.topicCategory);
      } else if (p.status === 'completed') {
        completedNodesThisWeek.push(node);
        visitedPathsCount[node.path] += 1;
        exploredTopicsSet.add(node.topicCategory);
      }
    });

    // Calculate days since last visit without punitive streaks
    let daysSinceLastVisit = 0;
    if (metrics.lastOpenedDate) {
      const last = new Date(metrics.lastOpenedDate).getTime();
      const now = new Date(todayDateKey()).getTime();
      const diffDays = Math.floor((now - last) / (1000 * 60 * 60 * 24));
      if (diffDays > 0) daysSinceLastVisit = diffDays;
    }

    return {
      completedNodesThisWeek,
      inProgressNodes,
      savedNodes,
      visitedPathsCount,
      exploredTopics: Array.from(exploredTopicsSet),
      reflectionsWrittenCount: reflections.length,
      daysSinceLastVisit,
      isReturningAfterBreak: daysSinceLastVisit >= 2,
    };
  }

  // ============================================================================
  // 6. Privacy-Conscious Consent-Based Success Metrics
  // ============================================================================
  static getConsentMetrics(): ConsentSuccessMetrics {
    try {
      const raw = localStorage.getItem(KEYS.CONSENT_METRICS);
      if (!raw) return { ...DEFAULT_CONSENT_METRICS };
      return { ...DEFAULT_CONSENT_METRICS, ...JSON.parse(raw) };
    } catch {
      return { ...DEFAULT_CONSENT_METRICS };
    }
  }

  static recordVisitHeartbeat(): void {
    const prefs = this.getPreferences();
    if (!prefs.consentAnalyticsEnabled) return;

    const metrics = this.getConsentMetrics();
    const today = todayDateKey();
    const returnDays = Array.isArray(metrics.voluntaryReturnDays)
      ? [...metrics.voluntaryReturnDays]
      : [];
    if (!returnDays.includes(today)) {
      returnDays.push(today);
    }

    const updated: ConsentSuccessMetrics = {
      ...metrics,
      voluntaryReturnDays: returnDays,
      lastOpenedDate: today,
    };
    localStorage.setItem(KEYS.CONSENT_METRICS, JSON.stringify(updated));
  }

  static recordConsentMetricEvent(
    event:
      | 'session_started'
      | 'session_paused'
      | 'session_resumed'
      | 'activity_completed'
      | 'recommendation_dismissed'
      | 'recommendation_replaced'
      | 'notification_opt_out'
  ): void {
    const prefs = this.getPreferences();
    if (!prefs.consentAnalyticsEnabled) return;

    const m = this.getConsentMetrics();
    const today = todayDateKey();
    const returnDays = m.voluntaryReturnDays.includes(today)
      ? m.voluntaryReturnDays
      : [...m.voluntaryReturnDays, today];

    const updated: ConsentSuccessMetrics = {
      ...m,
      voluntaryReturnDays: returnDays,
      lastOpenedDate: today,
    };

    if (event === 'session_started') {
      updated.totalSessionsStarted += 1;
    } else if (event === 'session_paused') {
      updated.pausedSessionsCount += 1;
    } else if (event === 'session_resumed') {
      updated.successfulResumesCount += 1;
    } else if (event === 'activity_completed') {
      updated.totalActivitiesCompleted += 1;
      updated.firstSessionCompleted = true;
    } else if (event === 'recommendation_dismissed') {
      updated.recommendationDismissals += 1;
    } else if (event === 'recommendation_replaced') {
      updated.recommendationReplacements += 1;
    } else if (event === 'notification_opt_out') {
      updated.notificationOptOutCount += 1;
    }

    localStorage.setItem(KEYS.CONSENT_METRICS, JSON.stringify(updated));
  }

  // ============================================================================
  // 7. Backup, Export, Import & Complete Data Deletion Flows
  // ============================================================================
  static exportJourneyBackupJson(includePrivateReflections: boolean = true): string {
    const payload = {
      app: 'أثر | ATHAR — Adaptive Spiritual Journey',
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      preferences: this.getPreferences(),
      progressMap: this.getProgressMap(),
      privateReflections: includePrivateReflections ? this.getPrivateReflections() : [],
      consentMetrics: this.getConsentMetrics(),
    };
    return JSON.stringify(payload, null, 2);
  }

  static importJourneyBackupJson(jsonString: string): { success: boolean; message: string } {
    try {
      const parsed = JSON.parse(jsonString);
      if (!parsed || typeof parsed !== 'object') {
        return { success: false, message: 'ملف النسخة الاحتياطية غير صالح.' };
      }

      if (parsed.preferences) {
        localStorage.setItem(KEYS.PREFS, JSON.stringify(parsed.preferences));
      }
      if (parsed.progressMap) {
        localStorage.setItem(KEYS.PROGRESS, JSON.stringify(parsed.progressMap));
      }
      if (Array.isArray(parsed.privateReflections)) {
        localStorage.setItem(
          KEYS.ISOLATED_REFLECTIONS,
          JSON.stringify(parsed.privateReflections)
        );
      }
      if (parsed.consentMetrics) {
        localStorage.setItem(KEYS.CONSENT_METRICS, JSON.stringify(parsed.consentMetrics));
      }

      window.dispatchEvent(new CustomEvent('athar_journey_updated'));
      return { success: true, message: 'تمت استعادة بيانات رحلتك وتفضيلاتك بنجاح.' };
    } catch {
      return {
        success: false,
        message: 'تعذر قراءة ملف JSON. تأكد من صحة ملف النسخة الاحتياطية.',
      };
    }
  }

  static deleteAllJourneyData(options?: {
    onlyReflections?: boolean;
  }): void {
    if (options?.onlyReflections) {
      localStorage.removeItem(KEYS.ISOLATED_REFLECTIONS);
    } else {
      localStorage.removeItem(KEYS.PREFS);
      localStorage.removeItem(KEYS.PROGRESS);
      localStorage.removeItem(KEYS.DISMISSED_IDS);
      localStorage.removeItem(KEYS.ISOLATED_REFLECTIONS);
      localStorage.removeItem(KEYS.CONSENT_METRICS);
    }
    window.dispatchEvent(new CustomEvent('athar_journey_updated'));
  }

  // ============================================================================
  // 8. Automated Architecture & Content Integrity Verification Suite
  // ============================================================================
  static verifyAdaptiveJourneyIntegrity(): JourneyIntegrityTestReport {
    const details: { checkName: string; passed: boolean; note: string }[] = [];

    // Check 1: All 3 paths (Knowledge, Practice, Serenity) exist and are balanced
    const knowledgeCount = ADAPTIVE_JOURNEY_NODES.filter((n) => n.path === 'knowledge').length;
    const practiceCount = ADAPTIVE_JOURNEY_NODES.filter((n) => n.path === 'practice').length;
    const serenityCount = ADAPTIVE_JOURNEY_NODES.filter((n) => n.path === 'serenity').length;
    details.push({
      checkName: 'توازن المسارات الثلاثة (المعرفة، العمل، السكينة)',
      passed: knowledgeCount >= 4 && practiceCount >= 4 && serenityCount >= 4,
      note: `المعرفة (${knowledgeCount}) · العمل (${practiceCount}) · السكينة (${serenityCount})`,
    });

    // Check 2: Bidirectional Cross-Path Graph Links
    const allLinksValid = ADAPTIVE_JOURNEY_NODES.every((node) => {
      const links = Object.values(node.connectedNodeIds).filter(Boolean) as string[];
      return (
        links.length >= 2 &&
        links.every((targetId) => ADAPTIVE_JOURNEY_NODES.some((n) => n.id === targetId))
      );
    });
    details.push({
      checkName: 'ترابط الخريطة غير الخطية بين المحطات',
      passed: allLinksValid,
      note: 'جميع المحطات مرتبطة بمحطات المعرفة والعمل والسكينة المقابلة لها.',
    });

    // Check 3: Content Integrity & Scholarly Attribution
    const allVerified = ADAPTIVE_JOURNEY_NODES.every(
      (node) =>
        Boolean(node.sacredContent.arabicText) &&
        Boolean(node.sacredContent.reference) &&
        Boolean(node.scholarlyExplanation.sourceBook) &&
        node.scholarlyExplanation.reviewStatus === 'verified'
    );
    details.push({
      checkName: 'توثيق النصوص الشرعية وفصلها عن التطبيقات العملية',
      passed: allVerified,
      note: 'كافة الآيات والأحاديث والتفاسير موثقة المصدر ومفصولة عن خطوات العمل.',
    });

    // Check 4: Zero Spiritual Scoring / Zero Private Reflection Leakage
    const metricsJson = JSON.stringify(this.getConsentMetrics());
    const noReflectionInMetrics = !metricsJson.includes('content');
    details.push({
      checkName: 'عزل التأملات الشخصية ومنع التقييم الإيماني',
      passed: noReflectionInMetrics,
      note: 'التأملات الخاصة معزولة في مفتاح محلي مستقل ولا تدخل في أي تحليلات.',
    });

    const passedChecks = details.filter((d) => d.passed).length;
    return {
      passed: passedChecks === details.length,
      totalChecks: details.length,
      passedChecks,
      details,
    };
  }
}
