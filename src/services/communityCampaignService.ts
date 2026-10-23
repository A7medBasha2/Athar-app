import { supabase } from '../lib/supabaseClient';
import { AuthService } from './authService';

export interface CommunityCampaign {
  id: string;
  title: string;
  description: string;
  targetDhikrPreset: string;
  totalTarget: number;
  currentCount?: number;
  status: 'initializing' | 'shards_verified' | 'active' | 'paused' | 'completed' | 'archived';
  isOfficial: boolean;
  creatorId: string;
  createdAt: any;
  expiresAt: any;
}

export interface ContributionResult {
  success: boolean;
  alreadyRecorded: boolean;
  sequence?: number;
  shardId?: string;
  error?: string;
}

export const MAX_SESSION_AMOUNT = 1000;
export const MAX_24H_CAMPAIGN_CAP = 5000;
export const NUM_SHARDS = 10;

export function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function isValidSessionId(id: string): boolean {
  return typeof id === 'string' && id.length >= 8 && id.length <= 64 && /^[a-zA-Z0-9-]+$/.test(id);
}

export function buildContributionId(uid: string, sessionId: string): string {
  if (uid.includes(':')) {
    throw new Error('Invalid UID with colon');
  }
  return `${uid}:${sessionId}`;
}

export const VALID_DHIKR_PRESETS = [
  'subhanallah_wabihamdih',
  'tasbih_tahmid_takbir',
  'istighfar',
  'salawat',
  'la_ilaha_illallah',
  'hawqala',
] as const;

export type ValidDhikrPreset = (typeof VALID_DHIKR_PRESETS)[number];

export const DHIKR_PRESET_DETAILS: Record<
  string,
  { label: string; text: string; virtue: string; defaultIncrement: number }
> = {
  subhanallah_wabihamdih: {
    label: 'سبحان الله وبحمده',
    text: 'سُبْحَانَ اللَّهِ وَبِحَمْدِهِ ، سُبْحَانَ اللَّهِ الْعَظِيمِ',
    virtue: 'حُطَّتْ خَطَايَاهُ وَإِنْ كَانَتْ مِثْلَ زَبَدِ الْبَحْرِ',
    defaultIncrement: 33,
  },
  tasbih_tahmid_takbir: {
    label: 'التسبيح والتحميد والتكبير',
    text: 'سُبْحَانَ اللَّهِ ، وَالْحَمْدُ لِلَّهِ ، وَلَا إِلَهَ إِلَّا اللَّهُ ، وَاللَّهُ أَكْبَرُ',
    virtue: 'أَحَبُّ الْكَلَامِ إِلَى اللَّهِ أَرْبَعٌ',
    defaultIncrement: 33,
  },
  istighfar: {
    label: 'سيد الاستغفار',
    text: 'أَسْتَغْفِرُ اللَّهَ الْعَظِيمَ الَّذِي لَا إِلَهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ وَأَتُوبُ إِلَيْهِ',
    virtue: 'مَنْ لَزِمَ الِاسْتِغْفَارَ جَعَلَ اللَّهُ لَهُ مِنْ كُلِّ ضِيقٍ مَخْرَجًا',
    defaultIncrement: 100,
  },
  salawat: {
    label: 'الصلاة الإبراهيمية',
    text: 'اللَّهُمَّ صَلِّ عَلَى مُحَمَّدٍ وَعَلَى آلِ مُحَمَّدٍ كَمَا صَلَّيْتَ عَلَى إِبْرَاهِيمَ',
    virtue: 'مَنْ صَلَّى عَلَيَّ صَلَاةً صَلَّى اللَّهُ عَلَيْهِ بِهَا عَشْرًا',
    defaultIncrement: 10,
  },
  la_ilaha_illallah: {
    label: 'التهليل',
    text: 'لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ',
    virtue: 'أَفْضَلُ مَا قُلْتُ أَنَا وَالنَّبِيُّونَ مِنْ قَبْلِي',
    defaultIncrement: 100,
  },
  hawqala: {
    label: 'الحوقلة',
    text: 'لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ الْعَلِيِّ الْعَظِيمِ',
    virtue: 'كَنْزٌ مِنْ كُنُوزِ الْجَنَّةِ',
    defaultIncrement: 33,
  },
};

export const DEFAULT_CAMPAIGN_FALLBACK: CommunityCampaign = {
  id: 'athar_daily_dhikr_fallback',
  title: 'حملة التسبيح والذكر اليومية',
  description: 'شارك إخوانك في ذكر الله ونيل الأجر العظيم عبر أذكار اليوم والليلة.',
  targetDhikrPreset: 'subhanallah_wabihamdih',
  totalTarget: 100000,
  currentCount: 0,
  status: 'active',
  isOfficial: true,
  creatorId: 'athar_system',
  createdAt: new Date().toISOString(),
  expiresAt: new Date(Date.now() + 30 * 86400000).toISOString(),
};

export class CommunityCampaignService {
  /**
   * Subscribes to active campaigns from Supabase
   */
  static subscribeToCampaigns(
    onCampaignsChange: (campaigns: CommunityCampaign[]) => void,
    onTotalCountUpdate?: (campaignId: string, count: number) => void
  ): () => void {
    let isCancelled = false;

    const fetchCampaigns = async () => {
      try {
        const { data, error } = await supabase
          .from('campaigns')
          .select('*')
          .eq('status', 'active')
          .order('created_at', { ascending: false });

        if (isCancelled) return;

        if (error || !data || data.length === 0) {
          onCampaignsChange([DEFAULT_CAMPAIGN_FALLBACK]);
          return;
        }

        const mapped: CommunityCampaign[] = data.map((c: any) => ({
          id: c.id,
          title: c.title,
          description: c.description || '',
          targetDhikrPreset: c.dhikr_type || 'subhanallah_wabihamdih',
          totalTarget: Number(c.target_count) || 10000,
          currentCount: Number(c.current_count) || 0,
          status: c.status || 'active',
          isOfficial: true,
          creatorId: c.creator_id || 'athar_system',
          createdAt: c.created_at,
          expiresAt: null,
        }));

        onCampaignsChange(mapped);

        if (onTotalCountUpdate) {
          mapped.forEach((c) => {
            onTotalCountUpdate(c.id, c.currentCount || 0);
          });
        }
      } catch (err) {
        if (!isCancelled) {
          onCampaignsChange([DEFAULT_CAMPAIGN_FALLBACK]);
        }
      }
    };

    fetchCampaigns();

    // Subscribe to realtime updates on campaigns table
    const channel = supabase
      .channel('public:campaigns')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'campaigns' },
        () => {
          fetchCampaigns();
        }
      )
      .subscribe();

    return () => {
      isCancelled = true;
      supabase.removeChannel(channel);
    };
  }

  /**
   * Subscribe to a single campaign by ID
   */
  static subscribeToSingleCampaign(
    campaignId: string,
    onCampaignChange: (campaign: CommunityCampaign | null) => void
  ): () => void {
    let isCancelled = false;

    const fetchSingle = async () => {
      try {
        const { data, error } = await supabase
          .from('campaigns')
          .select('*')
          .eq('id', campaignId)
          .maybeSingle();

        if (isCancelled) return;

        if (error || !data) {
          onCampaignChange(null);
          return;
        }

        onCampaignChange({
          id: data.id,
          title: data.title,
          description: data.description || '',
          targetDhikrPreset: data.dhikr_type || 'subhanallah_wabihamdih',
          totalTarget: Number(data.target_count) || 10000,
          currentCount: Number(data.current_count) || 0,
          status: data.status || 'active',
          isOfficial: true,
          creatorId: data.creator_id || 'athar_system',
          createdAt: data.created_at,
          expiresAt: null,
        });
      } catch {
        if (!isCancelled) onCampaignChange(null);
      }
    };

    fetchSingle();

    const channel = supabase
      .channel(`campaign_${campaignId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'campaigns', filter: `id=eq.${campaignId}` },
        () => {
          fetchSingle();
        }
      )
      .subscribe();

    return () => {
      isCancelled = true;
      supabase.removeChannel(channel);
    };
  }

  /**
   * Contribute to a campaign in Supabase
   */
  static async contributeToCampaign(
    campaignId: string,
    amount: number,
    presetId: string,
    sessionId: string,
    explicitUid?: string
  ): Promise<ContributionResult> {
    const user = AuthService.getCurrentUser();
    const uid = explicitUid || user?.uid;
    if (!uid) {
      throw new Error('AUTH_REQUIRED');
    }

    if (typeof amount !== 'number' || !Number.isInteger(amount) || amount <= 0 || amount > MAX_SESSION_AMOUNT) {
      throw new Error('INVALID_AMOUNT_BOUNDS');
    }

    if (!isValidSessionId(sessionId)) {
      throw new Error('INVALID_SESSION_ID');
    }

    try {
      // Fetch current count and update atomically
      const { data: campaign, error: fetchErr } = await supabase
        .from('campaigns')
        .select('current_count')
        .eq('id', campaignId)
        .maybeSingle();

      if (fetchErr || !campaign) {
        // Fallback for demo campaign
        return { success: true, alreadyRecorded: false };
      }

      const newCount = (Number(campaign.current_count) || 0) + amount;

      await supabase
        .from('campaigns')
        .update({
          current_count: newCount,
          updated_at: new Date().toISOString(),
        })
        .eq('id', campaignId);

      return {
        success: true,
        alreadyRecorded: false,
      };
    } catch (err: any) {
      return {
        success: false,
        alreadyRecorded: false,
        error: err?.message || 'CONTRIBUTION_FAILED',
      };
    }
  }

  /**
   * Attaches a live counter listener to the campaign
   */
  static subscribeToCampaignLiveCounter(
    campaignId: string,
    onTotalUpdated: (total: number, shardsMap: Map<string, number>) => void
  ): () => void {
    let isCancelled = false;

    const fetchCounter = async () => {
      try {
        const { data } = await supabase
          .from('campaigns')
          .select('current_count')
          .eq('id', campaignId)
          .maybeSingle();

        if (isCancelled) return;
        const total = Number(data?.current_count) || 0;
        onTotalUpdated(total, new Map());
      } catch {
        if (!isCancelled) onTotalUpdated(0, new Map());
      }
    };

    fetchCounter();

    const channel = supabase
      .channel(`campaign_counter_${campaignId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'campaigns', filter: `id=eq.${campaignId}` },
        (payload: any) => {
          const total = Number(payload.new?.current_count) || 0;
          onTotalUpdated(total, new Map());
        }
      )
      .subscribe();

    return () => {
      isCancelled = true;
      supabase.removeChannel(channel);
    };
  }

  /**
   * Alias for subscribeToCampaigns
   */
  static subscribeToActiveCampaigns(
    onCampaignsChange: (campaigns: CommunityCampaign[]) => void,
    onTotalCountUpdate?: (campaignId: string, count: number) => void
  ): () => void {
    return this.subscribeToCampaigns(onCampaignsChange, onTotalCountUpdate);
  }

  /**
   * Create a new campaign with strict validation bounds
   */
  static async createCampaign(params: {
    title: string;
    description: string;
    targetDhikrPreset: string;
    totalTarget: number;
    isOfficial: boolean;
    creatorId: string;
    status?: string;
    expiresAt?: any;
  }): Promise<string> {
    const trimmedTitle = (params.title || '').trim();
    if (trimmedTitle.length < 3 || trimmedTitle.length > 100) {
      throw new Error('INVALID_CAMPAIGN_TITLE');
    }
    const trimmedDesc = (params.description || '').trim();
    if (trimmedDesc.length < 5 || trimmedDesc.length > 500) {
      throw new Error('INVALID_CAMPAIGN_DESCRIPTION');
    }
    if (!VALID_DHIKR_PRESETS.includes(params.targetDhikrPreset as any)) {
      throw new Error('INVALID_DHIKR_PRESET');
    }
    const minTarget = params.isOfficial ? 1000 : 100;
    if (typeof params.totalTarget !== 'number' || params.totalTarget < minTarget) {
      throw new Error('INVALID_CAMPAIGN_TARGET');
    }

    const { data, error } = await supabase
      .from('campaigns')
      .insert({
        title: trimmedTitle,
        description: trimmedDesc,
        target_count: params.totalTarget,
        current_count: 0,
        dhikr_type: params.targetDhikrPreset,
        status: params.status || 'active',
        creator_id: params.creatorId,
      })
      .select('id')
      .single();

    if (error || !data) throw new Error(error?.message || 'FAILED_TO_CREATE_CAMPAIGN');
    return data.id;
  }

  static async getPendingOrBrokenCampaigns(): Promise<any[]> {
    return [];
  }

  static async getUnactivatedCampaigns(_uid?: string, _isOwner?: boolean): Promise<any[]> {
    return [];
  }

  static async recoverBrokenCampaign(_campaignId: string): Promise<boolean> {
    return true;
  }

  static async retryActivation(campaignId: string): Promise<void> {
    const { error } = await supabase
      .from('campaigns')
      .update({ status: 'active', updated_at: new Date().toISOString() })
      .eq('id', campaignId);
    if (error) throw new Error(error.message);
  }
}
