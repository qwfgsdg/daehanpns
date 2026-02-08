import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkAdminCodes() {
  const admins = await prisma.admin.findMany({
    where: {
      deletedAt: null,
      isActive: true,
    },
    select: {
      realName: true,
      salesName: true,
      affiliationCode: true,
      referralCode: true,
      region: true,
      tier: true,
      createdAt: true,
    },
    orderBy: [
      { region: 'asc' },
      { createdAt: 'asc' },
    ],
  });

  console.log('\n📋 관리자 소속 코드 현황:\n');

  let currentRegion: string | null = null;
  admins.forEach((admin) => {
    if (admin.region !== currentRegion) {
      console.log(`\n=== ${admin.region || '본사'} ===`);
      currentRegion = admin.region;
    }
    console.log(
      `${admin.realName.padEnd(15)} | 소속: ${admin.affiliationCode?.padEnd(10) || '없음      '} | 추천: ${admin.referralCode?.padEnd(10) || '없음      '} | ${admin.tier}`
    );
  });

  // 같은 소속 코드를 가진 관리자 찾기
  console.log('\n\n⚠️  중복된 소속 코드:\n');
  const codeCount = new Map<string, string[]>();

  admins.forEach((admin) => {
    if (admin.affiliationCode) {
      if (!codeCount.has(admin.affiliationCode)) {
        codeCount.set(admin.affiliationCode, []);
      }
      codeCount.get(admin.affiliationCode)!.push(admin.realName);
    }
  });

  let hasDuplicates = false;
  codeCount.forEach((names, code) => {
    if (names.length > 1) {
      console.log(`${code}: ${names.join(', ')} (${names.length}명)`);
      hasDuplicates = true;
    }
  });

  if (!hasDuplicates) {
    console.log('중복 없음 ✅');
  }

  await prisma.$disconnect();
}

checkAdminCodes().catch(console.error);
