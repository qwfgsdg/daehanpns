import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkUserCodes() {
  const users = await prisma.user.findMany({
    where: {
      deletedAt: null,
    },
    select: {
      name: true,
      phone: true,
      affiliateCode: true,
      managerId: true,
      manager: {
        select: {
          realName: true,
          affiliationCode: true,
        },
      },
    },
    orderBy: {
      createdAt: 'asc',
    },
  });

  console.log('\n📋 회원 소속 코드 현황:\n');
  console.log('회원명'.padEnd(20), '| 회원 소속코드'.padEnd(20), '| 담당자'.padEnd(15), '| 담당자 소속코드');
  console.log('-'.repeat(80));

  users.forEach((user) => {
    console.log(
      user.name.padEnd(20),
      `| ${user.affiliateCode.padEnd(18)}`,
      `| ${user.manager?.realName.padEnd(13) || '없음          '}`,
      `| ${user.manager?.affiliationCode || '없음'}`
    );
  });

  // 같은 소속 코드를 가진 회원 수 집계
  console.log('\n\n📊 소속 코드별 회원 수:\n');
  const codeCount = new Map<string, number>();

  users.forEach((user) => {
    const count = codeCount.get(user.affiliateCode) || 0;
    codeCount.set(user.affiliateCode, count + 1);
  });

  Array.from(codeCount.entries())
    .sort((a, b) => b[1] - a[1])
    .forEach(([code, count]) => {
      console.log(`${code}: ${count}명`);
    });

  await prisma.$disconnect();
}

checkUserCodes().catch(console.error);
