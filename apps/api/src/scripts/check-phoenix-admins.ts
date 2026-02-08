import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkPhoenixAdmins() {
  const admins = await prisma.admin.findMany({
    where: {
      region: '피닉스',
      deletedAt: null,
      isActive: true,
    },
    select: {
      realName: true,
      salesName: true,
      affiliationCode: true,
      referralCode: true,
      tier: true,
    },
  });

  console.log('\n📋 피닉스 지역 관리자 목록:\n');
  if (admins.length === 0) {
    console.log('❌ 활성화된 피닉스 관리자가 없습니다.\n');
  } else {
    admins.forEach((a) => {
      console.log(`- ${a.realName} (${a.salesName})`);
      console.log(`  소속코드: ${a.affiliationCode || '없음'}`);
      console.log(`  추천코드: ${a.referralCode || '없음'}`);
      console.log(`  등급: ${a.tier}\n`);
    });
  }

  await prisma.$disconnect();
}

checkPhoenixAdmins().catch(console.error);
