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

  // Seed a default user and business with a subscription and sample data
  const defaultUser = await prisma.user.upsert({
    where: { phone: '+2348012345678' },
    update: {
      name: 'Rorun User',
      email: 'user@rorun.ng',
      languagePref: 'en',
    },
    create: {
      phone: '+2348012345678',
      name: 'Rorun User',
      email: 'user@rorun.ng',
      languagePref: 'en',
    },
  });

  const defaultBusiness = await prisma.business.upsert({
    where: { id: 'seed-biz-1' },
    update: {},
    create: {
      id: 'seed-biz-1',
      ownerUserId: defaultUser.id,
      name: 'Sunrise Traders',
      legalForm: 'sole_proprietor',
      sector: 'Retail / Trade',
      state: 'Lagos',
      cacNumber: 'CAC-123456',
      tin: 'TIN-987654',
      vatRegistered: false,
      turnoverBand: '<25m',
    },
  });

  await prisma.subscription.upsert({
    where: { id: 'seed-sub-1' },
    update: {},
    create: {
      id: 'seed-sub-1',
      userId: defaultUser.id,
      businessId: defaultBusiness.id,
      planId: basicPlan.id,
      status: 'active',
      startedAt: new Date(),
    },
  });

  await prisma.notificationSetting.upsert({
    where: { businessId: defaultBusiness.id },
    update: {},
    create: {
      businessId: defaultBusiness.id,
      deadlineDueSoon: true,
      deadlineVerySoon: true,
      monthlyReminder: true,
      missingReceipts: true,
    },
  });

  const now = new Date();
  const sampleIncome = await prisma.transaction.create({
    data: {
      id: 'seed-tx-income-1',
      businessId: defaultBusiness.id,
      type: 'income',
      amount: 7500000,
      currency: 'NGN',
      date: now,
      description: 'Monthly sales revenue',
      source: 'manual',
    },
  });

  const sampleExpense = await prisma.transaction.create({
    data: {
      id: 'seed-tx-expense-1',
      businessId: defaultBusiness.id,
      type: 'expense',
      amount: 2100000,
      currency: 'NGN',
      date: now,
      description: 'Inventory and logistics',
      source: 'manual',
    },
  });

  await prisma.alert.createMany({
    data: [
      {
        id: 'seed-alert-1',
        businessId: defaultBusiness.id,
        type: 'deadline',
        severity: 'warning',
        title: 'Annual return due in 45 days',
        message: 'Prepare filings and supporting documents for this tax year.',
        createdAt: now,
      },
      {
        id: 'seed-alert-2',
        businessId: defaultBusiness.id,
        type: 'threshold',
        severity: 'info',
        title: 'You are at 30% of your ₦25m turnover band',
        message: 'If you cross ₦25m in 12 months, VAT registration becomes mandatory.',
        createdAt: now,
      },
    ],
    skipDuplicates: true,
  });

  console.log('Seed data created successfully');
  console.log(`Created plans: free, basic, business, accountant`);
  console.log(`Created ${incomeCategories.length} income categories`);
  console.log(`Created ${expenseCategories.length} expense categories`);
  console.log(`Created tax rules for ${currentYear}`);
  console.log(`Created knowledge articles`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

