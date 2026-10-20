import React, { useState, useEffect, useRef } from 'react';
import { Volume2, VolumeX, X, Check } from 'lucide-react';
import { StorageService } from '../services/storageService';
import { AudioService } from '../services/audioService';
import { NativePermissionsBridge } from '../services/nativePermissionsBridge';

interface AzanOverlayData {
  prayerId: string;
  prayerName: string;
  prayerTime: string;
  muadhinName: string;
  audioUrl: string;
  iqamahMinutes: number;
  autoDua: boolean;
  autoEcho: boolean;
  scheduledEpochMs?: number;
}

interface EchoPhase {
  status: string;
  text: string;
  durationSec: number;
}

const STANDARD_ECHO_PHASES: EchoPhase[] = [
  { status: '✨ رَدِّدْ مَعَ المُؤَذِّنِ الآنَ لِتَنَالَ الشَّفَاعَة ✨', text: '« اللهُ أَكْبَرُ ، اللهُ أَكْبَرُ »', durationSec: 32 },
  { status: '✨ رَدِّدْ مَعَ المُؤَذِّنِ الآنَ لِتَنَالَ الشَّفَاعَة ✨', text: '« أَشْهَدُ أَنْ لَا إِلَهَ إِلَّا اللهُ »', durationSec: 32 },
  { status: '✨ رَدِّدْ مَعَ المُؤَذِّنِ الآنَ لِتَنَالَ الشَّفَاعَة ✨', text: '« أَشْهَدُ أَنَّ مُحَمَّداً رَسُولُ اللهِ »', durationSec: 32 },
  { status: '🕌 حَيَّ عَلَى الصَّلَاةِ', text: '« لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللهِ العَلِيِّ العَظِيمِ »', durationSec: 38 },
  { status: '🕌 حَيَّ عَلَى الفَلَاحِ', text: '« لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللهِ العَلِيِّ العَظِيمِ »', durationSec: 38 },
  { status: '✨ رَدِّدْ مَعَ المُؤَذِّنِ الآنَ لِتَنَالَ الشَّفَاعَة ✨', text: '« اللهُ أَكْبَرُ ، اللهُ أَكْبَرُ »', durationSec: 22 },
  { status: '🌟 خِتَامُ الأَذَانِ المُبَارَك', text: '« لَا إِلَهَ إِلَّا اللهُ »', durationSec: 25 },
];

const FAJR_ECHO_PHASES: EchoPhase[] = [
  { status: '✨ رَدِّدْ مَعَ المُؤَذِّنِ الآنَ لِتَنَالَ الشَّفَاعَة ✨', text: '« اللهُ أَكْبَرُ ، اللهُ أَكْبَرُ »', durationSec: 14 },
  { status: '✨ رَدِّدْ مَعَ المُؤَذِّنِ الآنَ لِتَنَالَ الشَّفَاعَة ✨', text: '« أَشْهَدُ أَنْ لَا إِلَهَ إِلَّا اللهُ »', durationSec: 13 },
  { status: '✨ رَدِّدْ مَعَ المُؤَذِّنِ الآنَ لِتَنَالَ الشَّفَاعَة ✨', text: '« أَشْهَدُ أَنَّ مُحَمَّداً رَسُولُ اللهِ »', durationSec: 13 },
  { status: '🕌 حَيَّ عَلَى الصَّلَاةِ', text: '« لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللهِ العَلِيِّ العَظِيمِ »', durationSec: 13 },
  { status: '🕌 حَيَّ عَلَى الفَلَاحِ', text: '« لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللهِ العَلِيِّ العَظِيمِ »', durationSec: 13 },
  { status: '🌙 الصَّلَاةُ خَيْرٌ مِنَ النَّوْمِ', text: '« صَدَقْتَ وَبَرِرْتَ وَبِالحَقِّ نَطَقْتَ »', durationSec: 12 },
  { status: '✨ رَدِّدْ مَعَ المُؤَذِّنِ الآنَ لِتَنَالَ الشَّفَاعَة ✨', text: '« اللهُ أَكْبَرُ ، اللهُ أَكْبَرُ »', durationSec: 7 },
  { status: '🌟 خِتَامُ الأَذَانِ المُبَارَك', text: '« لَا إِلَهَ إِلَّا اللهُ »', durationSec: 7 },
];

let globalLastDismissedAzanTimestamp = 0;

export const FullScreenAzanOverlayModal: React.FC = () => {
  const [data, setData] = useState<AzanOverlayData | null>(null);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [echoIndex, setEchoIndex] = useState<number>(0);
  const [isPlayingDua, setIsPlayingDua] = useState<boolean>(false);
  const [isPrayerLogged, setIsPrayerLogged] = useState<boolean>(false);
  const [isPrayerTimeValid, setIsPrayerTimeValid] = useState<boolean>(true);
  const [logToast, setLogToast] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const getPrayerKey = (pId: string): 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha' | null => {
    const clean = pId.toLowerCase().trim();
    if (clean.includes('fajr')) return 'fajr';
    if (clean.includes('dhuhr')) return 'dhuhr';
    if (clean.includes('asr')) return 'asr';
    if (clean.includes('maghrib')) return 'maghrib';
    if (clean.includes('isha')) return 'isha';
    return null;
  };

  const mapPrayerNameToId = (pName: string): { id: string; name: string } => {
    const clean = (pName || '').toLowerCase().replace('صلاة ', '').trim();
    if (clean.includes('فجر') || clean.includes('fajr')) return { id: 'fajr', name: 'صلاة الفجر' };
    if (clean.includes('ظهر') || clean.includes('dhuhr')) return { id: '
