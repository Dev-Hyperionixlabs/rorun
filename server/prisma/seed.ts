import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Create default transaction categories
  const incomeCategories = [
    'Sales',
    'Services',
    'Interest',
    'Other Income',
  ];

  const expenseCategories = [
    'Office Supplies',
    'Rent',
    'Utilities',
    'Transportation',
    'Marketing',
    'Professional Services',
    'Insurance',
    'Taxes',
    'Other Expenses',
  ];

  for (const name of incomeCategories) {
    await prisma.transactionCategory.upsert({
      where: { id: `income-${name.toLowerCase().replace(/\s+/g, '-')}` },
      update: {},
      create: {
        id: `income-${name.toLowerCase().replace(/\s+/g, '-')}`,
        name,
        type: 'income',
        displayOrder: incomeCategories.indexOf(name),
      },
    });
  }

  for (const name of expenseCategories) {
    await prisma.transactionCategory.upsert({
      where: { id: `expense-${name.toLowerCase().replace(/\s+/g, '-')}` },
      update: {},
      create: {
        id: `expense-${name.toLowerCase().replace(/\s+/g, '-')}`,
        name,
        type: 'expense',
        displayOrder: expenseCategories.indexOf(name),
      },
    });
  }

  // Create default plans
  const freePlan = await prisma.plan.upsert({
    where: { id: 'free' },
    update: {},
    create: {
      id: 'free',
      name: 'Free',
      description: 'Basic features for small businesses',
      monthlyPrice: 0,
      isActive: true,
      features: {
        create: [
          { featureKey: 'feature_basic_tracking', limitValue: 100 },
        ],
      },
    },
  });

  const basicPlan = await prisma.plan.upsert({
    where: { id: 'basic' },
    update: {},
    create: {
      id: 'basic',
      name: 'Basic',
      description: 'Everything in Free, plus filing-ready packs.',
      monthlyPrice: 3500,
      annualPrice: 35000,
      isActive: true,
      features: {
        create: [
          { featureKey: 'yearEndFilingPack', limitValue: 1 },
          { featureKey: 'exportTransactions', limitValue: 1 },
          { featureKey: 'emailSupport', limitValue: 1 },
        ],
      },
    },
  });

  const businessPlan = await prisma.plan.upsert({
    where: { id: 'business' },
    update: {},
    create: {
      id: 'business',
      name: 'Business',
      description: 'For SMEs that want to stay ahead of FIRS.',
      monthlyPrice: 8500,
      annualPrice: 85000,
      isActive: true,
      features: {
        create: [
          { featureKey: 'yearEndFilingPack', limitValue: 1 },
          { featureKey: 'exportTransactions', limitValue: 1 },
          { featureKey: 'emailSupport', limitValue: 1 },
          { featureKey: 'advancedReminders', limitValue: 1 },
          { featureKey: 'multiUserAccess', limitValue: 5 },
          { featureKey: 'enhancedSummaryReports', limitValue: 1 },
          { featureKey: 'bank_connect', limitValue: 1 },
          { featureKey: 'bank_auto_sync', limitValue: 1 },
        ],
      },
    },
  });

  const accountantPlan = await prisma.plan.upsert({
    where: { id: 'accountant' },
    update: {},
    create: {
      id: 'accountant',
      name: 'Accountant',
      description: 'For firms managing multiple SME clients.',
      monthlyPrice: 25000,
      annualPrice: 250000,
      isActive: true,
      features: {
        create: [
          { featureKey: 'yearEndFilingPack', limitValue: 1 },
          { featureKey: 'exportTransactions', limitValue: 1 },
          { featureKey: 'emailSupport', limitValue: 1 },
          { featureKey: 'advancedReminders', limitValue: 1 },
          { featureKey: 'multiUserAccess', limitValue: 20 },
          { featureKey: 'enhancedSummaryReports', limitValue: 1 },
          { featureKey: 'multiWorkspaceView', limitValue: 1 },
          { featureKey: 'prioritySupport', limitValue: 1 },
          { featureKey: 'bank_connect', limitValue: 1 },
          { featureKey: 'bank_auto_sync', limitValue: 1 },
        ],
      },
    },
  });

  // Create default tax rules for Nigeria
  const currentYear = new Date().getFullYear();
  
  await prisma.taxRule.upsert({
    where: { id: `cit-micro-${currentYear}` },
    update: {},
    create: {
      id: `cit-micro-${currentYear}`,
      taxType: 'CIT',
      year: currentYear,
      thresholdMin: 0,
      thresholdMax: 25000000,
      conditionExpression: 'turnover < 25000000',
      resultJson: { ratePercentage: 0, status: 'exempt', description: 'Micro businesses exempt from CIT' },
    },
  });

  await prisma.taxRule.upsert({
    where: { id: `cit-small-${currentYear}` },
    update: {},
    create: {
      id: `cit-small-${currentYear}`,
      taxType: 'CIT',
      year: currentYear,
      thresholdMin: 25000000,
      thresholdMax: 100000000,
      conditionExpression: 'turnover >= 25000000 && turnover < 100000000',
      resultJson: { ratePercentage: 20, status: 'liable', description: 'Small companies 20% CIT rate' },
    },
  });

  await prisma.taxRule.upsert({
    where: { id: `cit-large-${currentYear}` },
    update: {},
    create: {
      id: `cit-large-${currentYear}`,
      taxType: 'CIT',
      year: currentYear,
      thresholdMin: 100000000,
      thresholdMax: null,
      conditionExpression: 'turnover >= 100000000',
      resultJson: { ratePercentage: 30, status: 'liable', description: 'Large companies 30% CIT rate' },
    },
  });

  await prisma.taxRule.upsert({
    where: { id: `vat-${currentYear}` },
    update: {},
    create: {
      id: `vat-${currentYear}`,
      taxType: 'VAT',
      year: currentYear,
      thresholdMin: 25000000,
      thresholdMax: null,
      conditionExpression: 'turnover >= 25000000',
      resultJson: { ratePercentage: 7.5, status: 'must_register', description: 'VAT applies above ₦25m turnover' },
    },
  });

  // Create knowledge articles
  await prisma.knowledgeArticle.upsert({
    where: { slug_language: { slug: 'what-does-0-tax-mean', language: 'en' } },
    update: {},
    create: {
      slug: 'what-does-0-tax-mean',
      title: 'What does 0% tax really mean?',
      contentMarkdown: `## Understanding CIT Exemptions

For many micro and small Nigerian businesses, company income tax (CIT) is effectively **0%** if your turnover is below ₦25m.

That does not mean you can ignore FIRS. You still need to:
- File annual returns
- Keep accurate records
- Respond to any notices promptly

### What happens if you grow?

If your turnover grows above ₦25m, you will be subject to:
- **20% CIT rate** for small companies (₦25m-₦100m turnover)
- **30% CIT rate** for large companies (above ₦100m turnover)

Rorun helps you track your turnover and alerts you before you cross any thresholds.`,
      tags: ['cit', 'basics', 'exemptions'],
      language: 'en',
      publishedAt: new Date(),
    },
  });

  await prisma.knowledgeArticle.upsert({
    where: { slug_language: { slug: 'what-does-0-tax-mean', language: 'pidgin' } },
    update: {},
    create: {
      slug: 'what-does-0-tax-mean',
      title: 'Wetn 0% tax really mean?',
      contentMarkdown: `## Make you understand CIT well

If your business dey make less than ₦25m a year, government no go collect CIT from you.

But e no mean say you go just ghost FIRS. You still need:
- Gist dem small every year (file returns)
- Keep beta records
- Answer any letter wey dem send

### If your money come grow?

If your money come pass ₦25m, you go start to pay:
- **20% tax** if you dey between ₦25m and ₦100m
- **30% tax** if you don pass ₦100m

Rorun go help you track your money and tell you before wahala start.`,
      tags: ['cit', 'basics', 'exemptions'],
      language: 'pidgin',
      publishedAt: new Date(),
    },
  });

  await prisma.knowledgeArticle.upsert({
    where: { slug_language: { slug: 'vat-basics', language: 'en' } },
    update: {},
    create: {
      slug: 'vat-basics',
      title: 'VAT Basics for Nigerian Businesses',
      contentMarkdown: `## What is VAT?

Value Added Tax (VAT) in Nigeria is charged at **7.5%** on goods and services.

### Key points

- If your turnover exceeds ₦25m, you **MUST** register for VAT
- You charge VAT on your sales and collect it on behalf of FIRS
- You can claim back VAT you paid on business purchases (input VAT)
- VAT returns are filed **monthly**

### Common mistakes to avoid

- Not registering when required
- Charging VAT without being registered
- Missing monthly filing deadlines`,
      tags: ['vat', 'basics', 'registration'],
      language: 'en',
      publishedAt: new Date(),
    },
  });

  // NOTE: We intentionally do not seed demo users/businesses/transactions here.
  // Create default tax rule set (Phase 11)
  // Some environments may have an out-of-date generated Prisma Client type surface.
  // These models exist in `schema.prisma`, but if the local client typings lag behind,
  // TypeScript will complain. Use a narrow escape hatch here to keep seed runnable.
  const prismaAny = prisma as any;

  const defaultRuleSet = await prismaAny.taxRuleSet.upsert({
    where: { version: '2026.1' },
    update: {},
    create: {
      version: '2026.1',
      name: 'Nigeria SME Tax Reform 2026 - v1',
      status: 'active',
      effectiveFrom: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
      description: 'Default rule set for Nigeria 2026 tax year. Contains placeholder rules that must be updated with authoritative legal criteria.',
    },
  });

  // Create default baseline rule (sets unknown status)
  await prismaAny.taxRuleV2.upsert({
    where: {
      ruleSetId_key: {
        ruleSetId: defaultRuleSet.id,
        key: 'baseline_unknown',
      },
    },
    update: {},
    create: {
      ruleSetId: defaultRuleSet.id,
      key: 'baseline_unknown',
      type: 'eligibility',
      priority: 1000, // High priority (evaluated last)
      conditionsJson: {}, // Always matches (empty condition)
      outcomeJson: {
        citStatus: 'unknown',
        vatStatus: 'unknown',
        whtStatus: 'unknown',
        complianceNote: 'Rule not configured. Please update with authoritative criteria.',
      },
      explanation: 'Default rule: No specific rules matched. This is a placeholder and must be updated with legal criteria.',
    },
  });

  // Create placeholder SME zero-tax rule (example - must be updated)
  await prismaAny.taxRuleV2.upsert({
    where: {
      ruleSetId_key: {
        ruleSetId: defaultRuleSet.id,
        key: 'cit_eligibility_small_business_placeholder',
      },
    },
    update: {},
    create: {
      ruleSetId: defaultRuleSet.id,
      key: 'cit_eligibility_small_business_placeholder',
      type: 'eligibility',
      priority: 10,
      conditionsJson: {
        and: [
          { field: 'legalForm', op: 'in', value: ['sole_proprietor', 'partnership'] },
          { field: 'estimatedTurnoverBand', op: 'eq', value: '<25m' },
        ],
      },
      outcomeJson: {
        citStatus: 'zero',
        complianceNote: 'Small business eligible for zero CIT rate (PLACEHOLDER - verify with FIRS guidelines)',
      },
      explanation: 'Small businesses with turnover below ₦25M may be eligible for zero CIT rate. This is a placeholder rule and must be verified against current FIRS regulations.',
    },
  });

  // Create placeholder VAT exemption rule
  await prismaAny.taxRuleV2.upsert({
    where: {
      ruleSetId_key: {
        ruleSetId: defaultRuleSet.id,
        key: 'vat_exemption_small_business_placeholder',
      },
    },
    update: {},
    create: {
      ruleSetId: defaultRuleSet.id,
      key: 'vat_exemption_small_business_placeholder',
      type: 'obligation',
      priority: 10,
      conditionsJson: {
        and: [
          { field: 'estimatedTurnoverBand', op: 'eq', value: '<25m' },
          { field: 'vatRegistered', op: 'eq', value: false },
        ],
      },
      outcomeJson: {
        vatStatus: 'exempt',
        complianceNote: 'Small business below VAT threshold (PLACEHOLDER - verify threshold with FIRS)',
      },
      explanation: 'Businesses below ₦25M turnover threshold may be exempt from VAT registration. This is a placeholder and must be verified against current FIRS thresholds.',
    },
  });

  // Create annual return deadline template (placeholder)
  await prismaAny.deadlineTemplate.upsert({
    where: {
      ruleSetId_key: {
        ruleSetId: defaultRuleSet.id,
        key: 'annual_return',
      },
    },
    update: {},
    create: {
      ruleSetId: defaultRuleSet.id,
      key: 'annual_return',
      frequency: 'annual',
      dueMonth: 3, // March
      dueDay: 31, // 31st
      title: 'Annual Tax Return',
      description: 'Annual tax return filing deadline. PLACEHOLDER: Due date set to March 31. Verify actual deadline with FIRS for current tax year.',
    },
  });

  console.log('Seed data created successfully');
  console.log(`Created plans: free, basic, business, accountant`);
  console.log(`Created ${incomeCategories.length} income categories`);
  console.log(`Created ${expenseCategories.length} expense categories`);
  console.log(`Created tax rules for ${currentYear}`);
  console.log(`Created knowledge articles`);
  console.log(`Created default tax rule set 2026.1 with placeholder rules`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

