export type FaqCategoryKey =
  | 'all'
  | 'today'
  | 'wallet'
  | 'debts'
  | 'goals'
  | 'backup';

export interface FaqCategory {
  key: FaqCategoryKey;
  label: string;
  icon: string;
}

export interface FaqItem {
  id: string;
  category: Exclude<FaqCategoryKey, 'all'>;
  question: string;
  summary: string;
  answer: string;
  tags: string[];
}

export const FAQ_CATEGORIES: FaqCategory[] = [
  { key: 'all', label: 'All', icon: 'layers' },
  { key: 'today', label: 'Today', icon: 'home' },
  { key: 'wallet', label: 'Wallet & Cards', icon: 'credit-card' },
  { key: 'debts', label: 'Debts', icon: 'users' },
  { key: 'goals', label: 'Goals & Savings', icon: 'target' },
  { key: 'backup', label: 'Backup & Data', icon: 'shield' },
];

export const FAQ_ITEMS: FaqItem[] = [
  // Today
  {
    id: 'safe-to-spend-formula',
    category: 'today',
    question: "How is Today's Safe-to-Spend calculated?",
    summary:
      'Daily Safe-to-Spend = (Monthly Income − Fixed Commitments − Savings Goal) ÷ Days in This Month + Rollover.',
    answer:
      'Velvet sets aside your Monthly Bills, budgeted Installments, Spending Allowances, and Savings Goal first, then divides the remaining discretionary budget by the number of days in the current calendar month. Each regular spend, direct savings transfer, or debt marked for daily budget subtracts down to the centavo (.00).',
    tags: ['safe to spend', 'daily', 'allowance', 'formula', 'calculation'],
  },
  {
    id: 'spend-vs-skip-vs-save',
    category: 'today',
    question:
      'What is the difference between Spend!, Save to Jar, and Fund Treat?',
    summary:
      'Spend! logs money spent; Save to Jar locks daily allowance into Savings; Fund Treat boosts your active Treat goal.',
    answer:
      'Tap Spend! when money actually leaves your budget—it reduces Today’s Safe-to-Spend (or a chosen Spending Allowance) and optionally updates Cash, Bank, or Card. Tap Save on Today (Save to Monthly Jar) to move part of today’s budget straight into your Monthly Savings Jar. Tap Treat (Fund Treat) to allocate part of today’s budget directly toward your active Treat goal.',
    tags: ['spend', 'save', 'fund treat', 'treat', 'skip', 'impulse', 'today'],
  },
  {
    id: 'midnight-split',
    category: 'today',
    question: 'How does End Day & Save (50/50 Midnight Split) work?',
    summary:
      'Splits leftover positive Safe-to-Spend in half: 50% rolls into tomorrow and 50% goes to your Treat or Savings Jar.',
    answer:
      'When you tap End Day & Save (or on an automatic day rollover), any positive leftover allowance from that day is divided 50/50 between tomorrow’s Rollover balance and your active unclaimed Treat (with any excess above its target spilling straight into your Savings Jar) or your Monthly Savings Jar. If today ended overspent (negative), rollover simply resets to ₱0 with no negative penalty carried into tomorrow.',
    tags: ['end day', 'midnight split', 'rollover', 'tomorrow', 'unused'],
  },
  {
    id: 'edit-and-undo',
    category: 'today',
    question: 'Can I edit or undo a transaction I already logged?',
    summary:
      'Yes—open History and tap Edit or Undo to cleanly adjust or revert a log.',
    answer:
      'Open Activity History on Today (or inside any Wallet account) to inspect logged transactions. Supported spends, allowance spends, deposits, and direct savings let you edit the peso amount, label, or category, and Undo reverses the exact delta across Safe-to-Spend, Wallet accounts, bills, installments, treats, and debts.',
    tags: ['edit', 'undo', 'mistake', 'history', 'delete', 'reverse'],
  },
  {
    id: 'payday-check-in',
    category: 'today',
    question: 'What does Payday Check-In do?',
    summary:
      'Deposits your salary into Cash or Bank, optionally records extra savings, and refills Per-Payday allowances.',
    answer:
      'Configure your salary schedule (Once or Twice Monthly) under Budget -> Plan. On payday dates, Today shows a Payday Check-In prompt so you can credit your paycheck into your selected Bank or Cash account, automatically top up Per-Payday spending allowances, and log any payday savings bonus.',
    tags: ['payday', 'salary', 'income', 'check-in', 'refill'],
  },
  {
    id: 'privacy-and-streak',
    category: 'today',
    question: 'What do the eye icon (Privacy Mode) and Streak pill do?',
    summary:
      'The eye icon masks all ₱ balances on screen; the streak tracks consecutive days within your daily budget.',
    answer:
      'Tap the eye icon in the top bar whenever someone can see your screen to hide every peso balance behind ••••. Tap it again anytime to reveal numbers. The zap streak badge counts consecutive days where you stayed disciplined with your daily check-ins and spending limit.',
    tags: ['privacy', 'eye', 'hide', 'streak', 'discipline'],
  },

  // Wallet & Cards
  {
    id: 'card-spend-here-vs-bills',
    category: 'wallet',
    question:
      'Should I press "Spend Here" on my credit card if I already listed it in Monthly Bills?',
    summary:
      'No—only tap Spend Here for brand-new card purchases, not bills you already budgeted monthly.',
    answer:
      'Items in Monthly Bills are already subtracted from your monthly pool so they do not shrink your daily Safe-to-Spend again when due. On a Credit Card in Wallet, Spend Here records a NEW charge (increasing Card Used and reducing Today’s Safe-to-Spend or a Spending Allowance). To pay down your credit card balance from Cash or Bank without counting as new daily spending, use Transfer / Pay Card instead.',
    tags: ['credit card', 'spend here', 'monthly bills', 'pay card', 'double count'],
  },
  {
    id: 'wallet-accounts-sync',
    category: 'wallet',
    question: 'How do Cash, Banks, and Credit Cards stay in sync?',
    summary:
      'Selecting an account when spending, paying bills, or settling debts automatically updates that balance.',
    answer:
      'Your Wallet holds Cash on Hand, Bank/E-wallet balances, and Credit Card used vs. credit limit. Picking Cash or a Bank decreases its balance by exact centavos; picking a Credit Card increases its Used amount. You can also add custom banks/cards or choose Track Only / No wallet change whenever you prefer a reminder without changing balances.',
    tags: ['cash', 'bank', 'credit card', 'balance', 'sync', 'ewallet'],
  },
  {
    id: 'monthly-bills-mark-paid',
    category: 'wallet',
    question: 'How do Monthly Bills and "Mark Paid" work?',
    summary:
      'Listed bills are set aside before Safe-to-Spend; Mark Paid updates Cash or Bank without double-deducting today.',
    answer:
      'Add fixed monthly bills (rent, electricity, internet, subscriptions) under Budget -> Plan so they are reserved automatically before calculating your daily Safe-to-Spend. When you tap Mark Paid, you choose which Cash, Bank, or Card paid it and log it cleanly—since fixed bills were already excluded from Safe-to-Spend, Mark Paid will not shrink today’s daily limit a second time.',
    tags: ['bills', 'mark paid', 'fixed', 'rent', 'utilities', 'due day'],
  },
  {
    id: 'spending-allowances',
    category: 'wallet',
    question:
      'How do Spending Allowances differ from general Safe-to-Spend?',
    summary:
      'Allowances ring-fence recurring categories like Date Night or Coffee away from your everyday discretionary budget.',
    answer:
      'Set up Spending Allowances in Budget -> Plan with either Once a Month or Every Cutoff cadence. Their monthly allocation is carved out up front like fixed bills. When you log an expense under an allowance, it deducts from that allowance’s remaining funds (and your selected Wallet account) without shrinking Today’s general Safe-to-Spend.',
    tags: ['envelope', 'allowance', 'groceries', 'transport', 'budget'],
  },
  {
    id: 'installments-tracker',
    category: 'wallet',
    question: 'How do Installments work?',
    summary:
      'Tracks fixed-term monthly amortizations (e.g., 6/12 months) and optionally reserves them in your monthly budget.',
    answer:
      'Add installment plans under Wallet -> Installments. Turning on Included in Daily Budget math sets aside the monthly payment alongside Monthly Bills when computing Safe-to-Spend. Tapping Paid 1 Mo confirms advancing paid months by 1 and logs an undoable entry without changing Cash or Bank balances (use Spend! or Transfer if you also want to debit an account).',
    tags: ['installment', 'amortization', 'monthly payment', 'months'],
  },
  {
    id: 'transfers-vs-adjust',
    category: 'wallet',
    question: 'When should I use Transfer vs. Set Balance?',
    summary:
      'Transfer moves money between Cash, Banks, or pays off a Card; Set Balance (or Set Used) corrects a mismatched number.',
    answer:
      'Use Transfer when moving pesos from Bank to Cash (ATM withdrawal), Bank to Bank, or paying a Credit Card from Cash/Bank—it keeps balances accurate and never reduces Today’s Safe-to-Spend. Use Set Balance (or Set Used on a Credit Card) when an account drifts due to unlogged fees or rounding and you want to snap it back to reality.',
    tags: ['transfer', 'set balance', 'set used', 'adjust', 'pay card', 'withdraw', 'atm', 'reconcile'],
  },

  // Debts
  {
    id: 'debts-i-owe-vs-owed-to-me',
    category: 'debts',
    question: 'How do "I Owe" and "Owed to Me" work?',
    summary:
      'Tracks personal IOUs separately from bank loans—I Owe is what you must pay; Owed to Me is what others owe you.',
    answer:
      'In Wallet -> Debts, organize every IOU cleanly under I Owe (red) or Owed to Me (green) with optional notes and .00 centavo tracking. Active debts also surface gently on Today as reminders, and fully paid debts collapse into Settled History.',
    tags: ['debt', 'iou', 'i owe', 'owed to me', 'utang', 'lend', 'borrow'],
  },
  {
    id: 'i-owe-safe-to-spend',
    category: 'debts',
    question:
      'Why does creating an "I Owe" debt not change Today’s Safe-to-Spend?',
    summary:
      'Creating I Owe only records the reminder (and optional borrowed Cash/Bank); Safe-to-Spend adjusts when you tap Pay.',
    answer:
      'Usually when you owe someone (such as a friend paying for your share of dinner), you want to remember to pay them back later—not inflate today’s spendable allowance. When you actually pay them back via the Pay button, you can turn on Count against today’s Safe-to-Spend so the payment subtracts from that day’s allowance cleanly.',
    tags: ['i owe', 'safe to spend', 'why', 'pay', 'double count'],
  },
  {
    id: 'add-back-safe-to-spend',
    category: 'debts',
    question: 'What does "Add back to today’s Safe-to-Spend" mean?',
    summary:
      'Restores your daily Safe-to-Spend allowance when someone repays money you covered out of your daily budget.',
    answer:
      'This toggle appears when recording Owed to Me or incoming repayments. Turn it ON when you originally paid from your daily budget (e.g., you paid ₱600 for lunch out of today’s Safe-to-Spend and your friend sends back ₱300). Leave it OFF for older loans or reimbursements that shouldn’t boost today’s spending limit.',
    tags: ['add back', 'safe to spend', 'split', 'payback', 'owed to me', 'reimburse'],
  },
  {
    id: 'debts-track-only-vs-wallet',
    category: 'debts',
    question:
      'What is the difference between Track Only and choosing a Wallet Account on a debt?',
    summary:
      'Track Only leaves Cash/Bank untouched; linking a Wallet account updates your real balance automatically.',
    answer:
      'Both creating a debt and logging a payment default to Track Only (No wallet change) so reminders never surprise your balances. Whenever physical cash or a bank/e-wallet transfer actually moved (e.g., GCash/BPI or Credit Card when lending/paying), pick that source so balances stay accurate and Undo reverses everything cleanly.',
    tags: ['track only', 'wallet account', 'gcash', 'bank', 'cash', 'undo'],
  },
  {
    id: 'debts-partial-payments',
    category: 'debts',
    question: 'Can I record partial payments or centavos on a debt?',
    summary:
      'Yes—Pay and Got Paid support any partial amount from ₱0.01 up to the remaining balance.',
    answer:
      'Tap Pay on an I Owe item or Got Paid on an Owed to Me item and enter whatever amount changed hands (even partial amounts like ₱250.75). Remaining updates immediately, each payment is logged in Activity History, and paying off the full remaining amount marks the debt Settled automatically.',
    tags: ['partial', 'payment', 'centavos', 'settle', 'remaining', 'got paid'],
  },

  // Goals & Savings
  {
    id: 'treats-vs-sinking-funds',
    category: 'goals',
    question: 'How are Treats different from Savings Buckets?',
    summary:
      'Treats are up to 3 guilt-free personal rewards; Savings Buckets track steady monthly pace for planned future expenses.',
    answer:
      'Under the Goals tab, Treats let you pick up to 3 rewards you want, fund them from daily leftovers or direct Fund Treat transfers, and celebrate claiming them once 100% funded. Savings Buckets (Sinking Funds) are practical buckets for upcoming non-monthly costs (Emergency, Travel, Tuition, Gifts) with a monthly pace indicator.',
    tags: ['treats', 'goals', 'sinking fund', 'savings bucket', 'vault', 'reward'],
  },
  {
    id: 'savings-goal-impact',
    category: 'goals',
    question: 'How does my Monthly Savings Goal affect daily Safe-to-Spend?',
    summary:
      'Your Monthly Savings Goal is reserved first alongside bills, so raising it lowers Today’s Safe-to-Spend.',
    answer:
      'Adjust your Monthly Savings Goal anytime in Budget -> Plan. Because Velvet subtracts fixed bills, budgeted allowances/installments, and your savings target before computing Safe-to-Spend, hitting or staying under your daily number automatically protects your monthly savings.',
    tags: ['savings goal', 'monthly', 'budget plan', 'safe to spend'],
  },
  {
    id: 'insights-and-score',
    category: 'goals',
    question: 'What are Insights, Discipline Score & Monthly Wrap-Up?',
    summary:
      'Tracks budgeting consistency and surfaces your Monthly Report Card, Spending Breakdown, Savings Coach tips, and Milestones.',
    answer:
      'Open Goals -> Insights to view your Monthly Report Card (grade & shareable summary), Spending Breakdown by category, live Savings Coach tips tailored to your ₱ budget, and your collapsible Milestones & Score card tracking streaks and check-ins.',
    tags: ['discipline score', 'insights', 'coach', 'tips', 'habit', 'wrap-up'],
  },

  // Backup & Data
  {
    id: 'data-storage-privacy',
    category: 'backup',
    question: 'Where is my data stored? Does Velvet upload anything to a server?',
    summary:
      'Everything lives locally on your device or browser—zero cloud tracking or accounts needed.',
    answer:
      'Velvet runs 100% locally on your device using persistent local storage and offline PWA caching. Your income, debts, and balances never leave your phone or browser unless you explicitly export a JSON backup or CSV file yourself.',
    tags: ['privacy', 'offline', 'local', 'storage', 'pwa', 'security'],
  },
  {
    id: 'auto-snapshots-recovery',
    category: 'backup',
    question: 'What are Auto-Snapshots & 10-min Recovery?',
    summary:
      'Automatic rolling checkpoints saved every 10 minutes and before any restore or reset.',
    answer:
      'In Budget -> Settings, Velvet keeps rolling automatic recovery points every 10 minutes (plus an automatic safety snapshot right before loading demo data, resetting, or importing a backup). Tap Auto-Snapshots or Save Now anytime to inspect or roll back to a previous state in one tap.',
    tags: ['auto snapshot', 'recovery', 'checkpoint', 'restore', 'save now'],
  },
  {
    id: 'json-backup-vs-csv',
    category: 'backup',
    question:
      'What is the difference between Export Full Backup (JSON) and Export Activity Logs (CSV)?',
    summary:
      'JSON backs up and restores your whole Velvet state; CSV exports a readable transaction table for spreadsheets.',
    answer:
      'Use Export Full Backup (JSON) regularly before switching devices or clearing browser storage—Restoring that .json file brings back every balance, debt, bill, treat, and history entry intact. Use Export Activity Logs (CSV) whenever you want to open or chart your spending logs in Excel or Google Sheets.',
    tags: ['json', 'csv', 'export', 'import', 'backup', 'restore', 'excel'],
  },
];

export function filterFaqItems(
  items: FaqItem[],
  category: FaqCategoryKey,
  query: string
): FaqItem[] {
  const normalizedQuery = query
    .trim()
    .toLowerCase()
    .replace(/[’‘]/g, "'");
  return items.filter((item) => {
    if (category !== 'all' && item.category !== category) {
      return false;
    }
    if (!normalizedQuery) return true;
    const haystack = [item.question, item.summary, item.answer, ...item.tags]
      .join(' ')
      .toLowerCase()
      .replace(/[’‘]/g, "'");
    return haystack.includes(normalizedQuery);
  });
}
