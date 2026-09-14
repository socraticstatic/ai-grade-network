import type { TestTask } from '../../../../types/testLab';

export const tasks: TestTask[] = [
  // ── operator script ──
  {
    id: 'ga-order-paste',
    version: 1,
    title: 'Add a connection from an AWS key',
    scenario:
      'Your cloud team created a hosted connection on the AWS side and sent you the activation key. Add it to NetBond and take it all the way to confirmation. (In this test build, the “Use demo key” button stands in for pasting the real key.)',
    successCriteria:
      'A new connection with configuration.isLmcc exists beyond the seeded baseline and plants — the paste-key flow completed through confirm.',
    path: 'happy',
    verifyId: 'ga-order-exists',
    hints: [
      'Start in the Marketplace — the AWS interconnect offering has a path for people who already hold a key.',
      '“Paste a key” takes you into the flow; the demo key button fills the field for you.',
      'The system shows you what the key contains — where, what bandwidth, which account — before you confirm.',
    ],
    startRoute: '/manage',
    expectedRoutePrefixes: ['/manage', '/create'],
  },
  {
    id: 'ga-key-expired',
    version: 1,
    title: 'Recover from a stale key',
    scenario:
      'A colleague forwarded you a key he generated before going on vacation last week. Try to use it (the “Demo: expired” button stands in for pasting it). Deal with whatever happens, and still get the connection added.',
    successCriteria:
      'Participant hits the full-screen expired-key state, recovers (fresh demo key), and a new LMCC connection lands after the mark set at task start.',
    path: 'bad-input',
    verifyId: 'ga-new-since-mark',
    reseedId: 'ga-mark-count',
    comprehensionCheck: {
      question: 'What did that expired key end up costing your company?',
      options: [
        'Nothing — an expired key never carried configuration, traffic, or billing',
        'One month of the committed rate',
        'A key-regeneration fee',
        'The early-termination charge for the term',
      ],
      correctIndex: 0,
    },
    hints: [
      'The error screen tells you what happened and what to do next — read it before backing out.',
      'Keys expire seven days after they’re created. The fix is a fresh key from AWS — the demo key stands in for that.',
    ],
    startRoute: '/manage',
    expectedRoutePrefixes: ['/manage', '/create'],
  },
  {
    id: 'ga-status-health',
    version: 1,
    title: 'One path dropped overnight',
    scenario:
      'Monitoring pinged you at 3am: one of the paths on your POS analytics circuit went down. Your migration status call is in an hour. Find the connection and decide what, if anything, you need to do.',
    successCriteria:
      'Comprehension: status stays Live with reduced health that self-heals; no customer action needed. Seed sets lmccActivePaths to 3 on the planted live circuit.',
    path: 'happy',
    reseedId: 'ga-with-reduced',
    comprehensionCheck: {
      question: 'What is true about the POS analytics circuit right now?',
      options: [
        'It is down — traffic stopped until AT&T repairs it',
        'It is Live with reduced protection, healing itself — no action needed from you',
        'It needs attention — you must reconfigure the failed path',
        'Billing pauses until all four paths are back',
      ],
      correctIndex: 1,
    },
    hints: [
      'Status and health are two different answers — the list and the detail page show both.',
      'Open the connection and look at the path protection strip.',
    ],
    startRoute: '/manage',
    expectedRoutePrefixes: ['/manage', '/connections'],
  },
  {
    id: 'ga-downgrade',
    version: 1,
    title: 'Cut the bandwidth cost',
    scenario:
      'Finance wants the POS analytics circuit’s monthly cost down now that the migration peak has passed. Lower its bandwidth one tier — and note carefully what the portal tells you before you commit.',
    successCriteria:
      'A live LMCC circuit’s bandwidth is lower than the mark taken at task start — participant went through the downgrade fee + acknowledgement and confirmed.',
    path: 'happy',
    verifyId: 'ga-bandwidth-lowered',
    reseedId: 'ga-live-mark-bandwidth',
    comprehensionCheck: {
      question: 'What did the portal tell you about lowering bandwidth?',
      options: [
        'Nothing — bandwidth changes are always free',
        'Lowering it mid-term carries a change fee, shown before you confirm; raising it would not',
        'You must delete and re-order the circuit to change bandwidth',
        'The change waits until the next contract renewal',
      ],
      correctIndex: 1,
    },
    hints: [
      'Bandwidth changes live on the connection’s detail page.',
      'The direction of the change matters — watch what the dialog says about fees before you acknowledge.',
    ],
    startRoute: '/manage',
    expectedRoutePrefixes: ['/manage', '/connections'],
  },
  {
    id: 'ga-delete',
    version: 1,
    title: 'Retire the circuit',
    scenario:
      'The analytics program just got cancelled. Remove the POS analytics circuit — and be ready to tell finance exactly what winding it down costs.',
    successCriteria:
      'A circuit alive at task start is Deleting/Deleted or gone — participant read the consequence statement, acknowledged, and confirmed.',
    path: 'happy',
    verifyId: 'ga-deleted-since-mark',
    reseedId: 'ga-live-mark-active',
    comprehensionCheck: {
      question: 'What happens when you delete a circuit mid-contract?',
      options: [
        'It pauses — you can resume it later without charge',
        'Service ends, and an early-termination charge for the remaining term is shown before you confirm',
        'Nothing is owed — deletion always ends billing immediately at no cost',
        'AT&T must approve the deletion within 5 business days',
      ],
      correctIndex: 1,
    },
    hints: [
      'Delete lives on the connection’s detail page.',
      'The confirmation dialog states the consequences — the number finance needs is right there.',
    ],
    startRoute: '/manage',
    expectedRoutePrefixes: ['/manage', '/connections'],
  },

  // ── feature-owner script ──
  {
    id: 'ga-fo-order-portal',
    version: 1,
    title: 'Order from this side',
    scenario:
      'Order a new AWS interconnect starting from THIS portal: create the connection, pick a metro and bandwidth, choose a 12-month term, and get to the screen that hands you the activation key. Pay attention to the cost summary on the way — you own that screen now.',
    successCriteria:
      'A new LMCC connection exists after the mark set at task start (the generate-key direction reached key handoff).',
    path: 'happy',
    verifyId: 'ga-new-since-mark',
    reseedId: 'ga-mark-count',
    hints: [
      'Create → Guided Setup → the AWS Interconnect – Last Mile connection type starts the flow.',
      'Pick the term either in Advanced settings or in the cost summary\u2019s plan selector — they are the same choice.',
      'The estimated monthly total leads the cost summary — details open beneath it. The key handoff screen is the finish line.',
    ],
    startRoute: '/manage',
    expectedRoutePrefixes: ['/manage', '/create'],
  },
  {
    id: 'ga-fo-golive',
    version: 1,
    title: 'The wait',
    scenario:
      'Your new connection is waiting for its key to be uploaded in AWS. Simulate that upload (the demo button stands in for the customer\u2019s move) and stay with the connection until it goes Live. Watch what the product tells you while you wait.',
    successCriteria:
      'A connection that was not Live at task start reached Live — the participant experienced Pending → Provisioning → Live.',
    path: 'happy',
    verifyId: 'ga-went-live-since-mark',
    reseedId: 'ga-mark-nonlive',
    comprehensionCheck: {
      question: 'When did billing on this connection begin?',
      options: [
        'When it went Live — both providers confirmed',
        'When the key was generated',
        'When you clicked the upload button',
        'At the start of the next billing cycle',
      ],
      correctIndex: 0,
    },
    hints: [
      'Open your new connection — the waiting screen explains whose move it is.',
      'After the upload, provisioning resolves on its own. It takes under a minute here.',
    ],
    startRoute: '/manage',
    expectedRoutePrefixes: ['/manage', '/connections'],
  },
  {
    id: 'ga-fo-term-value',
    version: 1,
    title: 'The term story',
    scenario:
      'A customer asks why they should sign a 36-month term instead of month-to-month. Using only what the ordering flow shows, answer them.',
    successCriteria:
      'Comprehension: longer commitments discount the monthly rate, and the estimate shows the saving before you commit.',
    path: 'happy',
    comprehensionCheck: {
      question: 'What does a longer term do to the price, according to the cost summary?',
      options: [
        'Discounts the monthly rate — the estimate shows the saving before you commit',
        'Nothing — term only affects the cancellation policy',
        'Adds a signing fee up front',
        'Locks the price but offers no discount',
      ],
      correctIndex: 0,
    },
    hints: [
      'Start a new order and change the term in the cost summary — watch the total.',
    ],
    startRoute: '/create',
    expectedRoutePrefixes: ['/create', '/manage'],
  },

  // ── billing script ──
  {
    id: 'ga-billing-total',
    version: 1,
    title: 'Find the monthly total',
    scenario:
      'Quarter close. The CFO needs this account’s total monthly network charge — after discounts — and wants to know what those discounts actually are.',
    successCriteria:
      'Participant reaches the account Billing Overview (Configure → Billing) and reads the ledger. Comprehension: term commitment + volume discounts subtract from the total.',
    path: 'happy',
    comprehensionCheck: {
      question: 'Which line items reduce this account’s monthly total?',
      options: [
        'Loyalty credits and referral bonuses',
        'A term-commitment discount and a volume discount on committed bandwidth',
        'Taxes are deducted before the total',
        'Nothing — the total is the sum of list prices',
      ],
      correctIndex: 1,
    },
    hints: [
      'Account-wide billing lives under Configure.',
      'The overview reads like a ledger — the discount lines subtract from the subtotal.',
    ],
    startRoute: '/manage',
    expectedRoutePrefixes: ['/configure'],
  },
  {
    id: 'ga-billing-starts',
    version: 1,
    title: 'Is the new circuit billing yet?',
    scenario:
      'An engineer ordered a new AWS circuit yesterday and it is still provisioning. Finance asks: are we being charged for it right now?',
    successCriteria:
      'Comprehension: billing starts when the connection goes Live (both providers confirmed) — a provisioning circuit is not billing.',
    path: 'happy',
    comprehensionCheck: {
      question: 'When does an AWS interconnect circuit start billing?',
      options: [
        'The moment the order is placed',
        'When it goes Live — both AT&T and AWS have confirmed it',
        'At the start of the next calendar month',
        'When the first traffic flows across it',
      ],
      correctIndex: 1,
    },
    hints: [
      'The billing overview says when charges begin — so does the order flow’s billing preview.',
    ],
    startRoute: '/manage',
    expectedRoutePrefixes: ['/configure', '/manage', '/connections'],
  },
  {
    id: 'ga-billing-expired',
    version: 1,
    title: 'The key nobody used',
    scenario:
      'Someone generated a connection key last month for a dev sandbox and never activated it — you can see the card marked Expired. Finance wants to know what that mistake cost.',
    successCriteria:
      'Comprehension: an expired key carries no configuration, traffic, or billing — it cost nothing. Seed plants a stale-Pending connection that derives to Expired.',
    path: 'happy',
    reseedId: 'ga-with-expired',
    comprehensionCheck: {
      question: 'What did the never-activated, now-expired connection cost?',
      options: [
        'Nothing — it never carried configuration, traffic, or billing',
        'Setup charges only',
        'One month at the committed rate',
        'A cancellation fee when it expired',
      ],
      correctIndex: 0,
    },
    hints: [
      'Find the expired card in the connections list — what does it say about charges?',
      'The billing overview only lists circuits that are actually billing.',
    ],
    startRoute: '/manage',
    expectedRoutePrefixes: ['/manage', '/connections', '/configure'],
  },
];
