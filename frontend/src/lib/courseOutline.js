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
      { id: 'start-here-1', title: 'Onboarding 1', video: 'https://youtu.be/fiEW4HXHjwM' },
      { id: 'start-here-2', title: 'Onboarding 2', video: 'https://youtu.be/6h9WKTUB3cs' },
      { id: 'start-here-3', title: 'Onboarding 3', video: 'https://youtu.be/NxD8_MWQtpc' },
      { id: 'start-here-4', title: 'Onboarding 4', video: 'https://youtu.be/8jd57I07pc0' },
    ],
  },
  {
    slug: 'mindset-module',
    title: 'Mindset Module',
    blurb: 'The psychology side — why traders fail, and the routines that stop it.',
    lessons: [
      { id: 'mindset-1', title: 'Why Most Fail',                    video: 'https://youtu.be/mKwiaOPyXzY' },
      { id: 'mindset-2', title: 'The Psychology Nobody Talks About', video: 'https://youtu.be/rN7nbBRQWoE' },
      { id: 'mindset-3', title: 'Keep Your Covenant',               video: 'https://youtu.be/4srAihrx4MU' },
      { id: 'mindset-4', title: 'Green Means Stop',                 video: 'https://youtu.be/E_rcE78CpRo' },
      { id: 'mindset-5', title: 'Closing Routine',                  video: 'https://youtu.be/atwRSEkHUf4' },
      { id: 'mindset-6', title: 'Mindset Walkthrough',              video: 'https://cdn.discordapp.com/attachments/1479568044354175118/1484432448505774160/c3a96a2f0ee24900b93263aed82be028.mov?ex=6a5dba73&is=6a5c68f3&hm=980a4d61e73637b5e7c07cacb741cf515e2035267352b514d21d22d7f0e3e788&' },
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
  {
    slug: 'covenant-premarket',
    group: 'The Covenant Model',
    title: 'Premarket Analysis',
    blurb: 'Mark the chart before the session so the plan is set before price moves.',
    lessons: [
      { id: 'cm-pre-1', title: 'Marking Out Session Levels', video: 'https://youtu.be/2t20dgGRD0s' },
      { id: 'cm-pre-2', title: 'Marking Out PD Arrays', video: 'https://youtu.be/0XCIEvdZZho' },
      { id: 'cm-pre-3', title: 'Marking Out Swing Lows & Highs', video: 'https://youtu.be/ijbTBY9RhQM' },
      { id: 'cm-pre-4', title: 'Why This Is Crucial', video: 'https://youtu.be/xc9vwBV_LR8' },
      { id: 'cm-pre-5', title: 'Real Chart Application', video: 'https://youtu.be/oew7bovR_04' },
    ],
  },
  {
    slug: 'covenant-risk',
    group: 'The Covenant Model',
    title: 'Risk Management',
    blurb: 'Sizing, phases and protecting the account.',
    lessons: [
      { id: 'cm-risk-1', title: 'Intro to Risk Management', video: 'https://youtu.be/2oFf3qfdcjw' },
      { id: 'cm-risk-2', title: 'Phase 1 Risk', video: 'https://youtu.be/r-hzll6vw-8' },
      { id: 'cm-risk-3', title: 'Phase 2 Risk', video: 'https://youtu.be/mumYZBplAcY' },
      { id: 'cm-risk-4', title: 'Phase 3 Risk', video: 'https://youtu.be/btcWU4V2cds' },
    ],
  },
  {
    slug: 'covenant-model',
    group: 'The Covenant Model',
    title: 'Covenant Model',
    blurb: 'AMD, PDI, and how to take and partial the setup.',
    lessons: [
      { id: 'cm-model-1', title: 'What Is AMD', video: 'https://youtu.be/oneLhZvG4UE' },
      { id: 'cm-model-2', title: 'What Is PDI', video: 'https://youtu.be/tbbfwyo3h-Y' },
      { id: 'cm-model-3', title: 'How To Partial w/ PDI', video: 'https://youtu.be/RQ_MrhUndUU' },
      { id: 'cm-model-4', title: 'Good PDI vs Bad PDI', video: 'https://youtu.be/cPbIEKuSotI' },
      { id: 'cm-model-5', title: 'Extra PDI Confluences', video: 'https://youtu.be/UaioTV9dDiQ' },
      { id: 'cm-model-6', title: 'PDI Open Q&A', video: 'https://youtu.be/UslRgF-1xas' },
      { id: 'cm-model-7', title: 'How To Partial Effectively', video: 'https://youtu.be/n3L9niJm3m0' },
    ],
  },
  {
    slug: 'covenant-recaps',
    group: 'The Covenant Model',
    title: 'Covenant Recaps',
    blurb: 'Real trades broken down against the checklist.',
    lessons: [
      { id: 'cm-recap-1', title: 'What A $908.58 Trade Actually Looks Like', video: 'https://youtu.be/oubiiLFGda0' },
      { id: 'cm-recap-2', title: 'Trade Breakdown 3.12.26', video: 'https://youtu.be/Pmn6iXVL2wU' },
      { id: 'cm-recap-3', title: 'Trade Breakdown 3.13.26 — Checklist Guide', video: 'https://youtu.be/5Goi5mEU0zs' },
      { id: 'cm-recap-4', title: 'Covenant Trade Breakdown 5.14.26', video: 'https://youtu.be/Y3aK5tf1KwE' },
      { id: 'cm-recap-5', title: 'Covenant Model Recap 5.21.26', video: 'https://youtu.be/5jfy018VtBY' },
      { id: 'cm-recap-6', title: 'Covenant Model Recap 5.28.26', video: 'https://youtu.be/f7yYgwNZLQQ' },
      { id: 'cm-recap-7', title: 'Covenant Trade Recap 6.9.26', video: 'https://youtu.be/ItTJblhV4Fk' },
      { id: 'cm-recap-8', title: 'Covenant Recap 2 — 6.9.26', video: 'https://youtu.be/bYBZgmtnjBI' },
    ],
  },
  {
    slug: 'prop-firm-setup',
    title: 'How To Set Up Prop Firms',
    blurb: 'Platform setup, order types, contract sizing and risk settings.',
    lessons: [
      { id: 'prop-1', title: 'Alpha Futures Set Up', video: 'https://youtu.be/XXP3DJQ4buU' },
      { id: 'prop-2', title: 'ProjectX Panel Set Up', video: 'https://youtu.be/AO4UzDP0Gvw' },
      { id: 'prop-3', title: 'Market Orders + Stop Buys & Sells', video: 'https://youtu.be/ZShKbLl7ONw' },
      { id: 'prop-4', title: 'Market Orders & Stop Buys & Sells (Part 2)', video: 'https://youtu.be/OHEdqEI-nAc' },
      { id: 'prop-5', title: 'What Is Contract Sizing', video: 'https://youtu.be/Q8eFg0F6-zk' },
      { id: 'prop-6', title: 'How To Change Risk Settings', video: 'https://youtu.be/x4MLDK_yXbk' },
      { id: 'prop-7', title: 'Final Set Up Recap', video: 'https://youtu.be/xjY8viKEVLA' },
    ],
  },
  {
    slug: 'mastery-heatmaps',
    group: 'Mastery Suite',
    title: 'Heatmaps',
    blurb: 'Reading resting liquidity and using it for sharper entries and exits.',
    lessons: [
      { id: 'ms-heat-1', title: 'Aggressive Liquidity', video: 'https://youtu.be/11Drn5skje0' },
      { id: 'ms-heat-2', title: 'Passive Liquidity', video: 'https://youtu.be/3HbQv8rs68w' },
      { id: 'ms-heat-3', title: 'Reading Heatmaps', video: 'https://youtu.be/k0sndsZ6oN4' },
      { id: 'ms-heat-4', title: 'Heatmap Liquidity Grab', video: 'https://youtu.be/kT4AL8gkTO0' },
      { id: 'ms-heat-5', title: 'Smarter Take Profits', video: 'https://youtu.be/DGHrikdWsDE' },
      { id: 'ms-heat-6', title: 'Incorporating Heatmaps', video: 'https://youtu.be/3jzuFD0om9w' },
      { id: 'ms-heat-7', title: 'Real World Application', video: 'https://youtu.be/3lkqHYzOuI8' },
    ],
  },
  {
    slug: 'mastery-advanced-vaults',
    group: 'Mastery Suite',
    title: 'Advanced Vaults',
    blurb: 'Protected stops, Fibonacci, rejection blocks and pre-market bias.',
    lessons: [
      { id: 'ms-vault-1', title: 'Protected Stop Losses In Depth', video: 'https://youtu.be/IUlao1iFpuA' },
      { id: 'ms-vault-2', title: 'How to Use Fibonacci for Trading', video: 'https://www.loom.com/share/4e514c55c6db4241a42bc5af3b771cbc' },
      { id: 'ms-vault-3', title: 'Rejection Blocks for Stronger Covenant Trades', video: 'https://www.loom.com/share/93a0dbec11824fa296e44738615a7be1' },
      { id: 'ms-vault-4', title: 'Spotting Rejection Blocks and Stop Loss', video: 'https://www.loom.com/share/871f1c23e8634483b9451ed69b2e5448' },
      { id: 'ms-vault-5', title: 'Using Pre-Market Conditions for Trading Bias', video: 'https://www.loom.com/share/95d0d6b0bcb949bb85622737ad4921df' },
      { id: 'ms-vault-6', title: 'Absorption Using Order Flow', video: 'https://www.loom.com/share/c99e059ba06d415586b56752ccb2f0fb' },
    ],
  },
  {
    slug: 'mastery-ath',
    group: 'Mastery Suite',
    title: 'How To Trade ATH',
    blurb: 'Trading all-time highs — entries, targets and staying profitable.',
    lessons: [
      { id: 'ms-ath-1', title: 'What Are All-Time Highs', video: 'https://youtu.be/Hs9qOZRu9qw' },
      { id: 'ms-ath-2', title: 'Spotting An ATH Entry', video: 'https://youtu.be/-HbRiTFkZwY' },
      { id: 'ms-ath-3', title: 'How To TP During ATH', video: 'https://youtu.be/D-8ju5xQOl4' },
      { id: 'ms-ath-4', title: 'Staying Profitable During ATH', video: 'https://youtu.be/jbkd3qNwYWA' },
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
