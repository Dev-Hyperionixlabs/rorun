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
      description: 'Core compliance features',
      monthlyPrice: 5000,
      annualPrice: 50000,
      isActive: true,
      features: {
        create: [
          { featureKey: 'feature_basic_tracking', limitValue: 1000 },
          { featureKey: 'feature_invoice_generation', limitValue: 50 },
        ],
      },
    },
  });

  console.log('Seed data created successfully');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

