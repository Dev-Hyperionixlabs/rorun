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

  // Create default plans with proper stable IDs
  // Use raw SQL to check if planKey column exists and handle accordingly
  const plans = [
    {
      id: 'free',
      planKey: 'free',
      name: 'Free',
      description: 'Basic features for small businesses',
      monthlyPrice: 0,
      annualPrice: null,
      features: ['feature_basic_tracking'],
    },
    {
      id: 'basic',
      planKey: 'basic',
      name: 'Basic',
      description: 'Everything in Free, plus filing-ready packs.',
      monthlyPrice: 3500,
      annualPrice: 35000,
      features: ['yearEndFilingPack', 'exportTransactions', 'emailSupport'],
    },
    {
      id: 'business',
      planKey: 'business',
      name: 'Business',
      description: 'For SMEs that want to stay ahead of FIRS.',
      monthlyPrice: 8500,
      annualPrice: 85000,
      features: ['yearEndFilingPack', 'exportTransactions', 'emailSupport', 'advancedReminders', 'multiUserAccess', 'enhancedSummaryReports', 'bank_connect', 'bank_auto_sync'],
    },
    {
      id: 'accountant',
      planKey: 'accountant',
      name: 'Accountant',
      description: 'For firms managing multiple SME clients.',
      monthlyPrice: 25000,
      annualPrice: 250000,
      features: ['yearEndFilingPack', 'exportTransactions', 'emailSupport', 'advancedReminders', 'multiUserAccess', 'enhancedSummaryReports', 'multiWorkspaceView', 'prioritySupport', 'bank_connect', 'bank_auto_sync'],
    },
  ];

  // Check if planKey column exists
  let hasPlanKeyColumn = true;
  try {
    const columnCheck: any[] = await prisma.$queryRaw`
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'plans' AND column_name = 'planKey'
      LIMIT 1
    `;
    hasPlanKeyColumn = columnCheck.length > 0;
  } catch (err) {
    console.warn('Could not check planKey column - assuming it exists');
  }

  for (const plan of plans) {
    try {
      // First try to create/update the plan
      const existingPlan = await prisma.plan.findFirst({ where: { id: plan.id } });
      
      if (existingPlan) {
        // Update existing plan - only include planKey if column exists
        if (hasPlanKeyColumn) {
          await prisma.$executeRaw`
            UPDATE plans SET "planKey" = ${plan.planKey}, name = ${plan.name}, description = ${plan.description}
            WHERE id = ${plan.id}
          `;
        } else {
          await prisma.plan.update({
            where: { id: plan.id },
            data: { name: plan.name, description: plan.description },
          });
        }
      } else {
        // Create new plan
        if (hasPlanKeyColumn) {
          await prisma.$executeRaw`
            INSERT INTO plans (id, "planKey", name, description, "monthlyPrice", "annualPrice", "isActive", currency, "createdAt", "updatedAt")
            VALUES (${plan.id}, ${plan.planKey}, ${plan.name}, ${plan.description}, ${plan.monthlyPrice}, ${plan.annualPrice}, true, 'NGN', NOW(), NOW())
            ON CONFLICT (id) DO UPDATE SET "planKey" = ${plan.planKey}, name = ${plan.name}, description = ${plan.description}
          `;
        } else {
          await prisma.plan.create({
            data: {
              id: plan.id,
              name: plan.name,
              description: plan.description,
              monthlyPrice: plan.monthlyPrice,
              annualPrice: plan.annualPrice,
              isActive: true,
            },
          });
        }
      }

      // Upsert features for this plan
      for (const featureKey of plan.features) {
        await prisma.planFeature.upsert({
          where: {
            planId_featureKey: {
              planId: plan.id,
              featureKey: featureKey,
            },
          },
          update: {},
          create: {
            planId: plan.id,
            featureKey: featureKey,
            limitValue: featureKey === 'multiUserAccess' ? (plan.id === 'accountant' ? 20 : 5) : 1,
          },
        });
      }

      console.log(`Seeded plan: ${plan.id}`);
    } catch (planErr: any) {
      console.warn(`Warning: Could not fully seed plan ${plan.id}: ${planErr.message}`);
    }
  }

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
  // Create default tax rule sets
  // Some environments may have an out-of-date generated Prisma Client type surface.
  // These models exist in `schema.prisma`, but if the local client typings lag behind,
  // TypeScript will complain. Use a narrow escape hatch here to keep seed runnable.
  const prismaAny = prisma as any;

  // 1) Baseline active ruleset (keeps the app functional even before admin activates a draft)
  const baselineRuleSet = await prismaAny.taxRuleSet.upsert({
    where: { version: 'baseline.1' },
    update: {},
    create: {
      version: 'baseline.1',
      name: 'Baseline (safe defaults)',
      status: 'active',
      effectiveFrom: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
      description: 'Safe baseline ruleset so evaluations do not fail on a fresh DB.',
    },
  });

  await prismaAny.taxRuleV2.upsert({
    where: { ruleSetId_key: { ruleSetId: baselineRuleSet.id, key: 'baseline_unknown' } },
    update: {},
    create: {
      ruleSetId: baselineRuleSet.id,
      key: 'baseline_unknown',
      type: 'eligibility',
      priority: 1000,
      conditionsJson: {},
      outcomeJson: {
        citStatus: 'unknown',
        vatStatus: 'unknown',
        whtStatus: 'unknown',
        complianceNote: 'No active draft ruleset configured yet. Admin can activate a ruleset in Tax Config.',
      },
      explanation: 'Baseline: no configured rule matched.',
    },
  });

  // 2) 2026 reforms draft ruleset (NOT auto-activated)
  const reforms2026 = await prismaAny.taxRuleSet.upsert({
    where: { version: '2026.1' },
    update: {
      name: 'Nigeria 2026 reforms (DRAFT)',
      status: 'draft',
      description: 'Draft ruleset for 2026 reforms. Admin must activate after validation.',
    },
    create: {
      version: '2026.1',
      name: 'Nigeria 2026 reforms (DRAFT)',
      status: 'draft',
      effectiveFrom: new Date('2026-01-01T00:00:00.000Z'),
      description: 'Draft ruleset for 2026 reforms. Admin must activate after validation.',
    },
  });

  // Rules (placeholders – admin refines conditions/outcomes as legal criteria is finalized)
  const rules = [
    {
      key: 'cit_exempt_small_company_2026',
      type: 'eligibility',
      priority: 10,
      conditionsJson: { and: [{ field: 'annualTurnoverNGN', op: 'lte', value: 25_000_000 }] },
      outcomeJson: { citStatus: 'exempt' },
      explanation: 'Draft: small companies may be exempt from CIT under 2026 reforms (verify).',
    },
    {
      key: 'cit_dev_levy_applies_2026',
      type: 'obligation',
      priority: 20,
      conditionsJson: { and: [{ field: 'legalForm', op: 'eq', value: 'company' }] },
      outcomeJson: { complianceNote: 'Draft: development levy obligation may apply in 2026 (verify).' },
      explanation: 'Draft: development levy applies to companies (verify).',
    },
    {
      key: 'vat_einvoice_required_2026',
      type: 'obligation',
      priority: 30,
      conditionsJson: { and: [{ field: 'vatRegistered', op: 'eq', value: true }] },
      outcomeJson: { einvoicingRequired: true },
      explanation: 'Draft: VAT e-invoicing required for VAT-registered businesses (verify).',
    },
    {
      key: 'vat_nonresident_registration_required_2026',
      type: 'obligation',
      priority: 40,
      conditionsJson: { and: [{ field: 'isNonResident', op: 'eq', value: true }, { field: 'sellsIntoNigeria', op: 'eq', value: true }] },
      outcomeJson: { vatStatus: 'must_register' },
      explanation: 'Draft: non-resident sellers into Nigeria may need VAT registration (verify).',
    },
    {
      key: 'cit_incentives_return_required_2026',
      type: 'obligation',
      priority: 50,
      conditionsJson: { and: [{ field: 'claimsTaxIncentives', op: 'eq', value: true }] },
      outcomeJson: { complianceNote: 'Draft: incentives return may be required (verify).' },
      explanation: 'Draft: businesses claiming incentives may need a specific return (verify).',
    },
  ];

  for (const r of rules) {
    await prismaAny.taxRuleV2.upsert({
      where: { ruleSetId_key: { ruleSetId: reforms2026.id, key: r.key } },
      update: { ...r },
      create: { ruleSetId: reforms2026.id, ...r },
    });
  }

  // Deadline templates (draft – admin adjusts dates/policy)
  const templates = [
    {
      key: 'cit_annual_return_2026',
      frequency: 'annual',
      dueMonth: 6,
      dueDay: 30,
      title: 'CIT annual return',
      description: 'Draft: annual CIT return deadline (verify).',
    },
    {
      key: 'cit_dev_levy_annual_2026',
      frequency: 'annual',
      dueMonth: 6,
      dueDay: 30,
      title: 'Development levy (annual)',
      description: 'Draft: annual development levy deadline (verify).',
    },
    {
      key: 'vat_einvoice_milestone_2026',
      frequency: 'one_time',
      dueMonth: 1,
      dueDay: 31,
      title: 'VAT e-invoicing milestone',
      description: 'Draft: e-invoicing milestone date (verify).',
    },
    {
      key: 'vat_nonresident_registration_2026',
      frequency: 'one_time',
      dueMonth: 1,
      dueDay: 31,
      title: 'Non-resident VAT registration',
      description: 'Draft: registration milestone for non-resident sellers (verify).',
    },
    {
      key: 'cit_incentives_return_annual_2026',
      frequency: 'annual',
      dueMonth: 6,
      dueDay: 30,
      title: 'CIT incentives return',
      description: 'Draft: annual incentives return deadline (verify).',
    },
  ];

  for (const t of templates) {
    await prismaAny.deadlineTemplate.upsert({
      where: { ruleSetId_key: { ruleSetId: reforms2026.id, key: t.key } },
      update: { ...t },
      create: { ruleSetId: reforms2026.id, ...t },
    });
  }

  console.log('Seed data created successfully');
  console.log(`Created plans: free, basic, business, accountant`);
  console.log(`Created ${incomeCategories.length} income categories`);
  console.log(`Created ${expenseCategories.length} expense categories`);
  console.log(`Created tax rules for ${currentYear}`);
  console.log(`Created knowledge articles`);
  console.log(`Created baseline active tax rule set baseline.1`);
  console.log(`Seeded draft ruleset 2026.1 (NOT activated) with 2026 reforms placeholders`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

