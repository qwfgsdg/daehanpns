import { PrismaClient, AdminTier } from '@prisma/client';

const prisma = new PrismaClient();

// 지점별 prefix 매핑
const REGION_PREFIX_MAP: Record<string, string> = {
  '본사': 'INT',
  '미라클': 'MRC',
  '피닉스': 'PHX',
  '가산': 'GSN',
};

// 등급별 우선순위 (정렬용)
const TIER_PRIORITY: Record<AdminTier, number> = {
  INTEGRATED: 0,
  CEO: 1,
  MIDDLE: 2,
  GENERAL: 3,
};

interface CodeMapping {
  adminId: string;
  loginId: string;
  realName: string;
  oldAffiliationCode: string | null;
  oldReferralCode: string | null;
  newCode: string;
}

async function main() {
  console.log('🚀 관리자 코드 마이그레이션 시작\n');

  // 1. 모든 활성 관리자 조회
  const admins = await prisma.admin.findMany({
    where: {
      deletedAt: null,
      isActive: true,
    },
    select: {
      id: true,
      loginId: true,
      realName: true,
      tier: true,
      region: true,
      affiliationCode: true,
      referralCode: true,
      createdAt: true,
    },
    orderBy: {
      createdAt: 'asc',
    },
  });

  console.log(`📊 총 ${admins.length}명의 관리자 발견\n`);

  // 2. 지점별로 그룹화하고 등급별로 정렬
  const adminsByRegion: Record<string, typeof admins> = {};

  admins.forEach((admin) => {
    const region = admin.region || '미지정';
    if (!adminsByRegion[region]) {
      adminsByRegion[region] = [];
    }
    adminsByRegion[region].push(admin);
  });

  // 각 지점별로 등급 순서대로 정렬
  Object.keys(adminsByRegion).forEach((region) => {
    adminsByRegion[region].sort((a, b) => {
      const priorityDiff = TIER_PRIORITY[a.tier] - TIER_PRIORITY[b.tier];
      if (priorityDiff !== 0) return priorityDiff;
      // 같은 등급이면 생성 날짜 순
      return a.createdAt.getTime() - b.createdAt.getTime();
    });
  });

  // 3. 새 코드 할당 및 매핑 테이블 생성
  const mappings: CodeMapping[] = [];

  Object.entries(adminsByRegion).forEach(([region, regionAdmins]) => {
    const prefix = REGION_PREFIX_MAP[region] || 'GEN';

    console.log(`\n📍 ${region} (${regionAdmins.length}명)`);
    console.log('─'.repeat(60));

    regionAdmins.forEach((admin, index) => {
      const newCode = `${prefix}${String(index + 1).padStart(3, '0')}`;

      mappings.push({
        adminId: admin.id,
        loginId: admin.loginId,
        realName: admin.realName,
        oldAffiliationCode: admin.affiliationCode,
        oldReferralCode: admin.referralCode,
        newCode,
      });

      console.log(
        `${newCode} ← ${admin.realName} (${admin.tier}) ` +
        `[소속: ${admin.affiliationCode || 'null'}, 추천: ${admin.referralCode || 'null'}]`
      );
    });
  });

  // 4. 회원 데이터에서 참조하는 코드 확인
  console.log('\n\n🔍 회원 데이터 영향 분석...\n');

  const oldCodesToUpdate = new Set<string>();
  mappings.forEach((m) => {
    if (m.oldAffiliationCode) oldCodesToUpdate.add(m.oldAffiliationCode);
    if (m.oldReferralCode) oldCodesToUpdate.add(m.oldReferralCode);
  });

  const affectedUsers = await prisma.user.findMany({
    where: {
      affiliateCode: {
        in: Array.from(oldCodesToUpdate),
      },
    },
    select: {
      id: true,
      name: true,
      affiliateCode: true,
    },
  });

  console.log(`영향받는 회원 수: ${affectedUsers.length}명`);
  if (affectedUsers.length > 0) {
    console.log('\n샘플 (최대 5명):');
    affectedUsers.slice(0, 5).forEach((user) => {
      const mapping = mappings.find(
        (m) =>
          m.oldAffiliationCode === user.affiliateCode ||
          m.oldReferralCode === user.affiliateCode
      );
      if (mapping) {
        console.log(
          `  - ${user.name}: ${user.affiliateCode} → ${mapping.newCode}`
        );
      }
    });
  }

  // 5. 사용자 확인
  console.log('\n\n⚠️  마이그레이션 준비 완료!');
  console.log(`   - 관리자 ${mappings.length}명 업데이트`);
  console.log(`   - 회원 ${affectedUsers.length}명 업데이트\n`);

  // 6. 트랜잭션 실행
  console.log('🔄 마이그레이션 실행 중...\n');

  await prisma.$transaction(async (tx) => {
    // 6-1. Phase 1: 모든 관리자의 코드를 임시 값으로 변경 (충돌 방지)
    console.log('Phase 1: 임시 코드로 변경 중...');
    for (const mapping of mappings) {
      const tempCode = `TEMP_${mapping.adminId.substring(0, 8)}`;
      await tx.admin.update({
        where: { id: mapping.adminId },
        data: {
          affiliationCode: tempCode,
          referralCode: tempCode,
        },
      });
    }
    console.log(`✅ 관리자 ${mappings.length}명 임시 코드 할당 완료`);

    // 6-2. Phase 2: 새 코드로 업데이트
    console.log('\nPhase 2: 새 코드로 변경 중...');
    for (const mapping of mappings) {
      await tx.admin.update({
        where: { id: mapping.adminId },
        data: {
          affiliationCode: mapping.newCode,
          referralCode: mapping.newCode,
        },
      });
    }
    console.log(`✅ 관리자 ${mappings.length}명 새 코드 할당 완료`);

    // 6-3. 회원 코드 업데이트
    console.log('\nPhase 3: 회원 데이터 업데이트 중...');
    let userUpdateCount = 0;
    for (const mapping of mappings) {
      const oldCodes = [
        mapping.oldAffiliationCode,
        mapping.oldReferralCode,
      ].filter((code): code is string => code !== null);

      if (oldCodes.length > 0) {
        const result = await tx.user.updateMany({
          where: {
            affiliateCode: {
              in: oldCodes,
            },
          },
          data: {
            affiliateCode: mapping.newCode,
          },
        });
        userUpdateCount += result.count;
      }
    }
    console.log(`✅ 회원 ${userUpdateCount}명 업데이트 완료`);
  });

  console.log('\n\n🎉 마이그레이션 성공적으로 완료!\n');

  // 7. 결과 검증
  console.log('📋 검증 중...\n');

  const updatedAdmins = await prisma.admin.findMany({
    where: {
      deletedAt: null,
      isActive: true,
    },
    select: {
      region: true,
      affiliationCode: true,
      referralCode: true,
    },
  });

  const nullAffiliation = updatedAdmins.filter((a) => !a.affiliationCode).length;
  const nullReferral = updatedAdmins.filter((a) => !a.referralCode).length;
  const matched = updatedAdmins.filter(
    (a) => a.affiliationCode === a.referralCode
  ).length;

  console.log(`✅ affiliationCode null: ${nullAffiliation}개`);
  console.log(`✅ referralCode null: ${nullReferral}개`);
  console.log(`✅ affiliationCode = referralCode: ${matched}/${updatedAdmins.length}개`);

  if (nullAffiliation === 0 && nullReferral === 0 && matched === updatedAdmins.length) {
    console.log('\n✨ 모든 검증 통과!');
  } else {
    console.log('\n⚠️  일부 데이터 확인 필요');
  }

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error('\n❌ 마이그레이션 실패:', error);
  prisma.$disconnect();
  process.exit(1);
});
