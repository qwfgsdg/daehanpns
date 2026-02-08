const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// 추천 코드 생성 함수
function generateReferralCode(tier, index) {
  const tierPrefix = {
    INTEGRATED: 'INT',
    CEO: 'CEO',
    MIDDLE: 'MID',
    GENERAL: 'GEN',
  };

  const prefix = tierPrefix[tier] || 'ADM';
  const number = String(index).padStart(3, '0');
  return `${prefix}${number}`;
}

async function generateReferralCodesForAdmins() {
  console.log('기존 관리자들의 추천 코드를 생성합니다...\n');

  // 추천 코드가 없는 관리자들 가져오기
  const adminsWithoutCode = await prisma.admin.findMany({
    where: {
      referralCode: null,
    },
    orderBy: {
      createdAt: 'asc',
    },
  });

  console.log(`총 ${adminsWithoutCode.length}명의 관리자에게 추천 코드를 생성합니다.\n`);

  // Tier별로 그룹화
  const tierGroups = {};
  adminsWithoutCode.forEach((admin) => {
    if (!tierGroups[admin.tier]) {
      tierGroups[admin.tier] = [];
    }
    tierGroups[admin.tier].push(admin);
  });

  // 각 Tier별로 추천 코드 생성
  for (const [tier, admins] of Object.entries(tierGroups)) {
    console.log(`\n=== ${tier} 관리자 (${admins.length}명) ===`);

    for (let i = 0; i < admins.length; i++) {
      const admin = admins[i];
      const referralCode = generateReferralCode(tier, i + 1);

      // 추천 코드 업데이트
      await prisma.admin.update({
        where: { id: admin.id },
        data: { referralCode },
      });

      console.log(`✓ ${admin.name} (${admin.loginId}): ${referralCode}`);
    }
  }

  console.log('\n모든 관리자의 추천 코드 생성이 완료되었습니다!');

  // 결과 확인
  const allAdmins = await prisma.admin.findMany({
    select: {
      name: true,
      tier: true,
      referralCode: true,
      region: true,
    },
    orderBy: {
      tier: 'asc',
    },
  });

  console.log('\n=== 전체 관리자 추천 코드 목록 ===');
  allAdmins.forEach((admin) => {
    console.log(
      `${admin.name} (${admin.tier}${admin.region ? ` - ${admin.region}` : ''}): ${admin.referralCode || '미생성'}`
    );
  });

  await prisma.$disconnect();
}

generateReferralCodesForAdmins().catch((error) => {
  console.error('오류 발생:', error);
  prisma.$disconnect();
  process.exit(1);
});
