/* Course outline.

   COURSE_MODULES is intentionally empty — the structure is being defined by
   hand rather than derived automatically. GENERATED_OUTLINE below is the
   draft built from knowledge/ (8 modules, 54 lessons), kept only as a
   reference to pull from once the real structure is decided. */

export const COURSE_MODULES = [
  {
    slug: 'start-here',
    title: 'Start Here',
    blurb: 'Get set up and oriented before anything else.',
    lessons: [
      {
        id: 'start-here-1',
        title: 'Onboarding 1',
        video: 'https://cdn.discordapp.com/attachments/1438611387772567564/1504316886903689348/onboarding_1.mp4?ex=6a5d8ec6&is=6a5c3d46&hm=87fb3f1cf442f7dd294d1e5f5934dc7e48cda7fac00df2f1be838669df42a92a&',
      },
      {
        id: 'start-here-2',
        title: 'Onboarding 2',
        video: 'https://cdn.discordapp.com/attachments/1438611387772567564/1504317024887636048/onboarding_2.mp4?ex=6a5d8ee7&is=6a5c3d67&hm=f89758a3da69410eccc6f510bd73492d6dfa0f941b4d50ca7f9b6f4ef216820b&',
      },
      {
        id: 'start-here-3',
        title: 'Onboarding 3',
        video: 'https://cdn.discordapp.com/attachments/1438611387772567564/1504317310863933540/onboarding_3.mp4?ex=6a5d8f2b&is=6a5c3dab&hm=9e5d19d989784934f33d6867cf72a8df9175e3093f175b8db12fa28621b98645&',
      },
      {
        id: 'start-here-4',
        title: 'Onboarding 4',
        video: 'https://cdn.discordapp.com/attachments/1438611387772567564/1504317377356234812/onboarding_4.mp4?ex=6a5d8f3b&is=6a5c3dbb&hm=e2274ee629b1455dd285e0ba2a292b729bfe6ae303c08060cffb6c65b895b75e&',
      },
    ],
  },
  {
    slug: 'foundations-trading-basics',
    group: 'Foundations',
    title: 'Trading Basics',
    blurb: 'The building blocks — candles, structure, gaps, levels, stops and targets.',
    quiz: {
      url: 'https://create.kahoot.it/details/a1c1b4aa-57b1-431e-b269-d0d06f6d3c5f',
      label: 'Trading Basics quiz',
      blurb: 'All lessons done — take the Kahoot to check what stuck.',
    },
    lessons: [
      { id: 'foundations-basics-1', title: 'Candlestick Basics',           video: 'https://youtu.be/WHkA0yEcJBw' },
      { id: 'foundations-basics-2', title: 'Market Structure Fundamentals', video: 'https://youtu.be/hLhU9hUC6Zc' },
      { id: 'foundations-basics-3', title: 'Fair Value Gaps & Imbalances',  video: 'https://www.youtube.com/watch?v=zKf1g4Bigi0' },
      { id: 'foundations-basics-4', title: 'Support & Resistance Levels',   video: 'https://www.youtube.com/watch?v=GuAoSn3NpMA' },
      { id: 'foundations-basics-5', title: 'Stop Loss & Take Profit',       video: 'https://www.youtube.com/watch?v=r-mFg7JOubs' },
    ],
  },
  {
    slug: 'foundations-liquidity',
    group: 'Foundations',
    title: 'Liquidity',
    blurb: 'What liquidity is, where it sits, and how it gets engineered.',
    quiz: {
      url: 'https://create.kahoot.it/share/enter-kahoot-title/4166e08d-cedf-43f2-838a-3b9c18dc66e8',
      label: 'Liquidity quiz',
      blurb: 'All lessons done — take the Kahoot to check what stuck.',
    },
    lessons: [
      { id: 'foundations-liquidity-1', title: 'Intro to Liquidity',    video: 'https://youtu.be/GL9HxdI2omA' },
      { id: 'foundations-liquidity-2', title: 'Session Liquidity',     video: 'https://youtu.be/MMeiHtXCALg' },
      { id: 'foundations-liquidity-3', title: 'Swing Highs & Lows',    video: 'https://youtu.be/5_iAo1cyCpw' },
      { id: 'foundations-liquidity-4', title: 'Engineered Liquidity',  video: 'https://youtu.be/tyoEh-zIhzM' },
      { id: 'foundations-liquidity-5', title: 'LRLR In Depth',         video: 'https://youtu.be/cxu3_NWrTpQ' },
    ],
  },
  {
    slug: 'foundations-market-movement',
    group: 'Foundations',
    title: 'Market Movement',
    blurb: 'How price actually moves — trends, breaks, displacement and rejection.',
    quiz: {
      url: 'https://create.kahoot.it/share/covenant-quiz-1/f285b3b1-1b38-4230-8499-59b066be398a',
      label: 'Market Movement quiz',
      blurb: 'All lessons done — take the Kahoot to check what stuck.',
    },
    lessons: [
      { id: 'foundations-mm-1', title: 'Trend Line vs Range',       video: 'https://www.youtube.com/watch?v=vwiMQEnxerk' },
      { id: 'foundations-mm-2', title: 'Break of Structure',        video: 'https://www.youtube.com/watch?v=53FDtrs_WP8' },
      { id: 'foundations-mm-3', title: 'Strong Displacement Candles', video: 'https://youtu.be/RJ1ZimqtEpk' },
      { id: 'foundations-mm-4', title: 'Rejection Wick Theory',     video: 'https://youtu.be/TphcGAU5wro' },
    ],
  },
]

const GENERATED_OUTLINE = [
  {
    slug: 'covient-model',
    title: 'The Covenant Model',
    blurb: 'The core method — AMD, PDI, risk, and live trade breakdowns.',
    lessons: [
      {
        id: '10-covient-model-marking-out-session-levels',
        title: 'Marking out session levels'
      },
      {
        id: '11-covient-model-marking-out-pd-arrays',
        title: 'Marking out pd arrays'
      },
      {
        id: '12-covient-model-marking-out-swing-lows-highs',
        title: 'Marking out swing lows highs'
      },
      {
        id: '13-covient-model-why-this-is-crucial',
        title: 'Why this is crucial'
      },
      {
        id: '14-covient-model-real-chart-application',
        title: 'Real chart application'
      },
      {
        id: '15-covient-model-intro-to-risk-management',
        title: 'Intro to risk management'
      },
      {
        id: '16-covient-model-phase-2-risk',
        title: 'Phase 2 risk'
      },
      {
        id: '17-covient-model-phase-3-risk',
        title: 'Phase 3 risk'
      },
      {
        id: '18-covient-model-risk-management-q-a',
        title: 'Risk management q a'
      },
      {
        id: '19-covient-model-what-is-amd',
        title: 'What is amd'
      },
      {
        id: '20-covient-model-what-is-pdi',
        title: 'What is pdi'
      },
      {
        id: '21-covient-model-how-to-partial-w-pdi',
        title: 'How to partial with pdi'
      },
      {
        id: '22-covient-model-good-pdi-vs-bad-pdi',
        title: 'Good pdi vs bad pdi'
      },
      {
        id: '23-covient-model-extra-pdi-confluences',
        title: 'Extra pdi confluences'
      },
      {
        id: '24-covient-model-pdi-open-q-a',
        title: 'Pdi open q a'
      },
      {
        id: '25-covient-model-how-to-partial-effectively',
        title: 'How to partial effectively'
      },
      {
        id: '26-covient-model-what-a-908-58-trade-actually-looks-like-coven',
        title: 'What a 908 58 trade actually looks like coven'
      },
      {
        id: '27-covient-model-3-12-26-trade-breakdown-covenant-model',
        title: '3 12 26 trade breakdown covenant model'
      },
      {
        id: '28-covient-model-trade-breakdown-3-13-26-covenant-checklist-gu',
        title: 'Trade breakdown 3 13 26 covenant checklist gu'
      },
      {
        id: '29-covient-model-covenant-trade-breakdown-5-14-26',
        title: 'Covenant trade breakdown 5 14 26'
      },
      {
        id: '31-covient-model-covenant-model-recap-5-28-26',
        title: 'Covenant model recap 5 28 26'
      },
      {
        id: '32-covient-model-covenant-trade-recap-6-9-26',
        title: 'Covenant trade recap 6 9 26'
      },
      {
        id: '33-covient-model-covenant-recap-2-6-9-26',
        title: 'Covenant recap 2 6 9 26'
      }
    ]
  },
  {
    slug: 'trading-basics',
    title: 'Trading Basics',
    blurb: 'Candlesticks, market structure, fair value gaps, stops and targets.',
    lessons: [
      {
        id: '02-trading-basics',
        title: 'Trading Basics'
      },
      {
        id: '49-trading-basics-candlestick-basics',
        title: 'Candlestick basics'
      },
      {
        id: '50-trading-basics-market-structure-fundamentals',
        title: 'Market structure fundamentals'
      },
      {
        id: '51-trading-basics-fair-value-gaps-imbalances',
        title: 'Fair value gaps imbalances'
      },
      {
        id: '52-trading-basics-support-resistance-levels',
        title: 'Support resistance levels'
      },
      {
        id: '53-trading-basics-stop-loss-take-profit',
        title: 'Stop loss take profit'
      }
    ]
  },
  {
    slug: 'liquidity',
    title: 'Liquidity',
    blurb: 'Session liquidity, swing highs and lows, engineered liquidity, LRLR.',
    lessons: [
      {
        id: '54-liquidity-intro-to-liquidity',
        title: 'Intro to liquidity'
      },
      {
        id: '55-liquidity-session-liquidity',
        title: 'Session liquidity'
      },
      {
        id: '56-liquidity-swing-highs-n-lows',
        title: 'Swing highs n lows'
      },
      {
        id: '57-liquidity-engineered-liquidity',
        title: 'Engineered liquidity'
      },
      {
        id: '58-liquidity-lrlr-in-depth',
        title: 'Lrlr in depth'
      }
    ]
  },
  {
    slug: 'market-movement',
    title: 'Market Movement',
    blurb: 'Trend vs range, break of structure, displacement, rejection wicks.',
    lessons: [
      {
        id: '59-market-movement-trend-line-vs-range',
        title: 'Trend line vs range'
      },
      {
        id: '60-market-movement-break-of-structure-full-breakdown',
        title: 'Break of structure full breakdown'
      },
      {
        id: '61-market-movement-strong-displacement-candles',
        title: 'Strong displacement candles'
      },
      {
        id: '62-market-movement-rejection-wick-theory',
        title: 'Rejection wick theory'
      }
    ]
  },
  {
    slug: 'heatmaps',
    title: 'Heatmaps',
    blurb: 'Aggressive vs passive liquidity, reading heatmaps, smarter take-profits.',
    lessons: [
      {
        id: '34-heatmaps-aggressive-liquidity',
        title: 'Aggressive liquidity'
      },
      {
        id: '35-heatmaps-passive-liquidity',
        title: 'Passive liquidity'
      },
      {
        id: '36-heatmaps-reading-heatmaps',
        title: 'Reading heatmaps'
      },
      {
        id: '37-heatmaps-heatmap-liquidity-grab',
        title: 'Heatmap liquidity grab'
      },
      {
        id: '38-heatmaps-smarter-take-profits',
        title: 'Smarter take profits'
      },
      {
        id: '39-heatmaps-incorporating-heatmaps',
        title: 'Incorporating heatmaps'
      },
      {
        id: '40-heatmaps-real-world-application',
        title: 'Real world application'
      }
    ]
  },
  {
    slug: 'all-time-highs',
    title: 'All-Time Highs',
    blurb: 'Spotting ATH entries, taking profit and staying profitable at highs.',
    lessons: [
      {
        id: '41-all-time-highs-what-are-all-time-highs',
        title: 'What are all time highs'
      },
      {
        id: '42-all-time-highs-spotting-an-ath-entry',
        title: 'Spotting an ath entry'
      },
      {
        id: '43-all-time-highs-how-to-tp-during-ath',
        title: 'How to tp during ath'
      },
      {
        id: '44-all-time-highs-staying-profitable-during-ath',
        title: 'Staying profitable during ath'
      }
    ]
  },
  {
    slug: 'mastery-suite',
    title: 'Mastery Suite',
    blurb: 'Protected stops, Fibonacci, rejection blocks.',
    lessons: [
      {
        id: '45-mastery-suite-protected-stop-losses-in-depth',
        title: 'Protected stop losses in depth'
      },
      {
        id: '46-mastery-suite-how-to-use-fibonacci-for-trading',
        title: 'How to use fibonacci for trading'
      },
      {
        id: '47-mastery-suite-rejection-blocks-for-stronger-covenant-trades',
        title: 'Rejection blocks for stronger covenant trades'
      },
      {
        id: '48-mastery-suite-spotting-rejection-blocks-and-stop-loss',
        title: 'Spotting rejection blocks and stop loss'
      }
    ]
  },
  {
    slug: 'tradingview-howtos',
    title: 'TradingView How-Tos',
    blurb: 'Chart setup and platform walkthroughs.',
    lessons: [
      {
        id: '01-tradingview-howtos',
        title: 'TradingView How-Tos'
      }
    ]
  }
]

export const TOTAL_LESSONS = COURSE_MODULES.reduce((n, m) => n + m.lessons.length, 0)

export { GENERATED_OUTLINE }
