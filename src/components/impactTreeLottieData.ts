// Lightweight, pure self-contained Bodymovin Lottie animation datasets for Athar Impact Tree
// Renders without external network requests, works 100% offline at 60fps

export const getAmbientGoldLottie = (stage: number = 0) => {
  const particleCount = stage === 3 ? 16 : stage === 2 ? 10 : stage === 1 ? 6 : 4;
  const layers: any[] = [];

  // Generate gentle floating golden celestial barakah particles
  for (let i = 0; i < particleCount; i++) {
    const startX = 40 + (i * 23) % 220;
    const startY = 80 + (i * 37) % 180;
    const dur = 45 + (i * 7) % 30;
    const size = stage === 3 ? (4 + (i % 4) * 2) : (3 + (i % 3) * 1.5);
    const goldColor = i % 2 === 0 ? [0.83, 0.69, 0.22, 1] : [0.96, 0.89, 0.63, 1];

    layers.push({
      ddd: 0,
      ind: i + 1,
      ty: 4, // Shape layer
      nm: `BarakahParticle_${i}`,
      sr: 1,
      ks: {
        o: {
          a: 1,
          k: [
            { t: 0, s: [10] },
            { t: Math.floor(dur * 0.4), s: [stage === 3 ? 100 : 70] },
            { t: dur, s: [10] }
          ]
        },
        r: {
          a: 1,
          k: [
            { t: 0, s: [0] },
            { t: dur, s: [180 * (i % 2 === 0 ? 1 : -1)] }
          ]
        },
        p: {
          a: 1,
          k: [
            { t: 0, s: [startX, startY, 0] },
            { t: Math.floor(dur * 0.5), s: [startX + (i % 2 === 0 ? 8 : -8), startY - 18, 0] },
            { t: dur, s: [startX, startY - 32, 0] }
          ]
        },
        a: { a: 0, k: [0, 0, 0] },
        s: {
          a: 1,
          k: [
            { t: 0, s: [40, 40] },
            { t: Math.floor(dur * 0.5), s: [stage === 3 ? 130 : 90, stage === 3 ? 130 : 90] },
            { t: dur, s: [40, 40] }
          ]
        }
      },
      ao: 0,
      shapes: [
        {
          ty: 'gr',
          it: [
            {
              ty: 'el', // Ellipse
              p: { a: 0, k: [0, 0] },
              s: { a: 0, k: [size, size] }
            },
            {
              ty: 'fl', // Fill
              c: { a: 0, k: goldColor },
              o: { a: 0, k: 100 }
            },
            {
              ty: 'tr',
              p: { a: 0, k: [0, 0] },
              a: { a: 0, k: [0, 0] },
              s: { a: 0, k: [100, 100] },
              r: { a: 0, k: 0 },
              o: { a: 0, k: 100 }
            }
          ]
        }
      ],
      ip: 0,
      op: 90,
      st: (i * 5) % 30,
      bm: 0
    });
  }

  // Luminous central gold pulse aura
  layers.push({
    ddd: 0,
    ind: layers.length + 1,
    ty: 4,
    nm: 'AuraPulse',
    sr: 1,
    ks: {
      o: {
        a: 1,
        k: [
          { t: 0, s: [stage === 3 ? 35 : 12] },
          { t: 45, s: [stage === 3 ? 65 : 28] },
          { t: 90, s: [stage === 3 ? 35 : 12] }
        ]
      },
      r: { a: 0, k: 0 },
      p: { a: 0, k: [150, 140, 0] },
      a: { a: 0, k: [0, 0, 0] },
      s: {
        a: 1,
        k: [
          { t: 0, s: [85, 85] },
          { t: 45, s: [stage === 3 ? 125 : 105, stage === 3 ? 125 : 105] },
          { t: 90, s: [85, 85] }
        ]
      }
    },
    ao: 0,
    shapes: [
      {
        ty: 'gr',
        it: [
          {
            ty: 'el',
            p: { a: 0, k: [0, 0] },
            s: { a: 0, k: [stage === 3 ? 180 : 130, stage === 3 ? 180 : 130] }
          },
          {
            ty: 'fl',
            c: { a: 0, k: [0.83, 0.69, 0.22, 1] },
            o: { a: 0, k: 50 }
          },
          {
            ty: 'tr',
            p: { a: 0, k: [0, 0] },
            a: { a: 0, k: [0, 0] },
            s: { a: 0, k: [100, 100] },
            r: { a: 0, k: 0 },
            o: { a: 0, k: 100 }
          }
        ]
      }
    ],
    ip: 0,
    op: 90,
    st: 0,
    bm: 0
  });

  return {
    v: '5.7.4',
    fr: 30,
    ip: 0,
    op: 90,
    w: 300,
    h: 300,
    nm: 'AtharTreeAura',
    ddd: 0,
    assets: [],
    layers
  };
};

export const getCelebrationBurstLottie = () => {
  const layers: any[] = [];
  const sparks = 12;

  for (let i = 0; i < sparks; i++) {
    const angle = (i * 360) / sparks;
    const rad = (angle * Math.PI) / 180;
    const dist = 75;
    const endX = 150 + Math.cos(rad) * dist;
    const endY = 150 + Math.sin(rad) * dist;

    layers.push({
      ddd: 0,
      ind: i + 1,
      ty: 4,
      nm: `BurstRay_${i}`,
      sr: 1,
      ks: {
        o: {
          a: 1,
          k: [
            { t: 0, s: [0] },
            { t: 15, s: [100] },
            { t: 45, s: [0] }
          ]
        },
        r: { a: 0, k: angle },
        p: {
          a: 1,
          k: [
            { t: 0, s: [150, 150, 0] },
            { t: 45, s: [endX, endY, 0] }
          ]
        },
        a: { a: 0, k: [0, 0, 0] },
        s: {
          a: 1,
          k: [
            { t: 0, s: [30, 30] },
            { t: 20, s: [120, 120] },
            { t: 45, s: [20, 20] }
          ]
        }
      },
      ao: 0,
      shapes: [
        {
          ty: 'gr',
          it: [
            {
              ty: 'el',
              p: { a: 0, k: [0, 0] },
              s: { a: 0, k: [7, 7] }
            },
            {
              ty: 'fl',
              c: { a: 0, k: [0.98, 0.88, 0.45, 1] },
              o: { a: 0, k: 100 }
            },
            {
              ty: 'tr',
              p: { a: 0, k: [0, 0] },
              a: { a: 0, k: [0, 0] },
              s: { a: 0, k: [100, 100] },
              r: { a: 0, k: 0 },
              o: { a: 0, k: 100 }
            }
          ]
        }
      ],
      ip: 0,
      op: 45,
      st: 0,
      bm: 0
    });
  }

  return {
    v: '5.7.4',
    fr: 30,
    ip: 0,
    op: 45,
    w: 300,
    h: 300,
    nm: 'AtharCelebrationBurst',
    ddd: 0,
    assets: [],
    layers
  };
};
