import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const admins = await prisma.admin.findMany({
    where: {
      deletedAt: null,
    },
    select: {
      id: true,
      loginId: true,
      realName: true,
      salesName: true,
      tier: true,
      region: true,
      affiliationCode: true,
      referralCode: true,
      isActive: true,
    },
    orderBy: {
      createdAt: 'asc',
    },
  });

  console.log('\n📋 현재 관리자 목록:\n');
  console.log('총 관리자 수:', admins.length);
  console.log('\n상세 정보:');

  admins.forEach((admin, index) => {
    console.log(`\n${index + 1}. ${admin.realName} (${admin.loginId})`);
    console.log(`   - 등급: ${admin.tier}`);
    console.log(`   - 지점: ${admin.region || '(없음)'}`);
    console.log(`   - 소속코드: ${admin.affiliationCode}`);
    console.log(`   - 추천코드: ${admin.referralCode}`);
    console.log(`   - 활성: ${admin.isActive ? '✅' : '❌'}`);
  });

  // 지점별 통계
  const regionStats = admins.reduce((acc, admin) => {
    const region = admin.region || '미지정';
    acc[region] = (acc[region] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  console.log('\n\n📊 지점별 관리자 수:');
  Object.entries(regionStats).forEach(([region, count]) => {
    console.log(`   ${region}: ${count}명`);
  });

  await prisma.$disconnect();
}

main().catch(console.error);
