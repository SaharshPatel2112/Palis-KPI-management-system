import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const DEPARTMENTS: Record<string, string[]> = {
  Sales: ['Leads Generated', 'Calls Made', 'Orders Closed', 'Revenue (₹)'],
  Production: ['Units Produced', 'Defect Rate (%)', 'On-time Delivery (%)'],
  Service: ['Complaints Closed', 'Avg Response Time (hrs)', 'Repeat Complaints'],
  Purchase: ['Cost Savings (₹)', 'PO Completion (%)', 'Supplier Score'],
  HR: ['Attendance (%)', 'Positions Filled', 'Retention (%)'],
  Accounts: ['Collections (₹)', 'Payments Processed', 'Outstanding (₹)'],
};

async function main() {
  for (const [deptName, metricNames] of Object.entries(DEPARTMENTS)) {
    const department = await prisma.department.upsert({
      where: { name: deptName },
      update: {},
      create: { name: deptName },
    });

    for (const metricName of metricNames) {
      await prisma.kpiMetric.upsert({
        where: { name_departmentId: { name: metricName, departmentId: department.id } },
        update: {},
        create: { name: metricName, departmentId: department.id },
      });
    }
  }
  console.log('Seeded 6 departments with their KPI metrics.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });