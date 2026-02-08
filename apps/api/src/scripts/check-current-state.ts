import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkCurrentState() {
  console.log('\n📊 현재 회원 상태 확인\n');

  // 가산 회원 확인
  console.log('=== 가산 지역 ===\n');
  const gasanUsers = await prisma.user.findMany({
    where: {
      affiliateCode: {
        startsWith: 'GSN',
      },
      deletedAt: null,
    },
    select: {
      name: true,
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
      name: 'asc',
    },
  });

  gasanUsers.forEach((user) => {
    console.log(
      `${user.name.padEnd(15)} | 소속코드: ${user.affiliateCode.padEnd(12)} | 담당자: ${user.manager?.realName.padEnd(15) || '없음'.padEnd(15)} (${user.manager?.affiliationCode || 'N/A'})`
    );
  });

  // 피닉스 회원 중 일부 확인
  console.log('\n=== 피닉스 지역 (일부) ===\n');
  const phoenixUsers = await prisma.user.findMany({
    where: {
      OR: [
        { affiliateCode: { startsWith: 'PHX' } },
        { name: { in: ['김수완무', '가가가', '영태', '테레사'] } },
      ],
      deletedAt: null,
    },
    select: {
      name: true,
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
      name: 'asc',
    },
    take: 10,
  });

  phoenixUsers.forEach((user) => {
    const code = user.affiliateCode.length > 20 ? user.affiliateCode.substring(0, 20) + '...' : user.affiliateCode;
    console.log(
      `${user.name.padEnd(15)} | 소속코드: ${code.padEnd(25)} | 담당자: ${user.manager?.realName.padEnd(15) || '없음'.padEnd(15)} (${user.manager?.affiliationCode || 'N/A'})`
    );
  });

  // UUID가 소속 코드로 저장된 회원 찾기
  console.log('\n=== UUID가 소속코드인 회원 ===\n');
  const uuidUsers = await prisma.user.findMany({
    where: {
      affiliateCode: {
        contains: '-',
      },
      deletedAt: null,
    },
    select: {
      name: true,
      affiliateCode: true,
      managerId: true,
      manager: {
        select: {
          realName: true,
          affiliationCode: true,
        },
      },
    },
  });

  if (uuidUsers.length > 0) {
    console.log(`⚠️  발견: ${uuidUsers.length}명\n`);
    uuidUsers.forEach((user) => {
      console.log(`${user.name}: ${user.affiliateCode}`);
      console.log(`  담당자: ${user.manager?.realName} (${user.manager?.affiliationCode})\n`);
    });
  } else {
    console.log('없음 ✅\n');
  }

  await prisma.$disconnect();
}

checkCurrentState().catch(console.error);
