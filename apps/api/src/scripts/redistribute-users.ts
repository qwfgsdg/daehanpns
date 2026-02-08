import { PrismaClient, AdminTier } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * 회원을 여러 관리자에게 재배정
 * 우선순위: 일반관리자 > 중간관리자 > CEO
 */
async function redistributeUsers() {
  console.log('🔄 회원 재배정 시작...\n');

  try {
    // 지역별로 처리
    const regions = ['가산', '피닉스', '미라클'];

    for (const region of regions) {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`📍 ${region} 지역 처리`);
      console.log('='.repeat(60));

      // 해당 지역의 관리자 조회 (계층별로 분류)
      const admins = await prisma.admin.findMany({
        where: {
          region,
          isActive: true,
          deletedAt: null,
          tier: {
            not: 'INTEGRATED', // 통합관리자 제외
          },
        },
        select: {
          id: true,
          realName: true,
          affiliationCode: true,
          tier: true,
        },
        orderBy: {
          createdAt: 'asc',
        },
      });

      // 계층별로 분류
      const generalAdmins = admins.filter((a) => a.tier === AdminTier.GENERAL);
      const middleAdmins = admins.filter((a) => a.tier === AdminTier.MIDDLE);
      const ceoAdmins = admins.filter((a) => a.tier === AdminTier.CEO);

      console.log(`\n관리자 현황:`);
      console.log(`  일반관리자: ${generalAdmins.length}명`);
      console.log(`  중간관리자: ${middleAdmins.length}명`);
      console.log(`  CEO: ${ceoAdmins.length}명`);
      console.log(`  총: ${admins.length}명`);

      // 해당 지역의 회원 조회 (affiliateCode로 판단)
      const regionPrefix = region === '가산' ? 'GSN' : region === '피닉스' ? 'PHX' : 'MRC';
      const users = await prisma.user.findMany({
        where: {
          affiliateCode: {
            startsWith: regionPrefix,
          },
          deletedAt: null,
        },
        select: {
          id: true,
          name: true,
        },
        orderBy: {
          createdAt: 'asc',
        },
      });

      console.log(`\n회원: ${users.length}명`);

      if (users.length === 0) {
        console.log('⏭️  회원이 없어 건너뜁니다.');
        continue;
      }

      if (admins.length === 0) {
        console.log('❌ 관리자가 없어 건너뜁니다.');
        continue;
      }

      // 배정 계획 수립
      const assignments: Array<{ userId: string; adminId: string; adminCode: string }> = [];

      let userIndex = 0;

      // 1. 일반관리자들에게 균등 배정
      if (generalAdmins.length > 0) {
        const usersForGeneral = Math.floor((users.length * 0.7)); // 전체의 70%
        const perGeneral = Math.ceil(usersForGeneral / generalAdmins.length);

        console.log(`\n1️⃣  일반관리자들에게 배정: ${usersForGeneral}명`);

        for (const admin of generalAdmins) {
          const count = Math.min(perGeneral, users.length - userIndex);
          console.log(`   ${admin.realName} (${admin.affiliationCode}): ${count}명`);

          for (let i = 0; i < count; i++) {
            if (userIndex < users.length) {
              assignments.push({
                userId: users[userIndex].id,
                adminId: admin.id,
                adminCode: admin.affiliationCode!,
              });
              userIndex++;
            }
          }
        }
      }

      // 2. 중간관리자들에게 배정
      if (middleAdmins.length > 0 && userIndex < users.length) {
        const remaining = users.length - userIndex;
        const usersForMiddle = Math.floor(remaining * 0.6); // 남은 회원의 60%
        const perMiddle = Math.ceil(usersForMiddle / middleAdmins.length);

        console.log(`\n2️⃣  중간관리자들에게 배정: ${usersForMiddle}명`);

        for (const admin of middleAdmins) {
          const count = Math.min(perMiddle, users.length - userIndex);
          console.log(`   ${admin.realName} (${admin.affiliationCode}): ${count}명`);

          for (let i = 0; i < count; i++) {
            if (userIndex < users.length) {
              assignments.push({
                userId: users[userIndex].id,
                adminId: admin.id,
                adminCode: admin.affiliationCode!,
              });
              userIndex++;
            }
          }
        }
      }

      // 3. CEO에게 남은 회원 배정
      if (ceoAdmins.length > 0 && userIndex < users.length) {
        const remaining = users.length - userIndex;
        const perCeo = Math.ceil(remaining / ceoAdmins.length);

        console.log(`\n3️⃣  CEO에게 배정: ${remaining}명`);

        for (const admin of ceoAdmins) {
          const count = Math.min(perCeo, users.length - userIndex);
          console.log(`   ${admin.realName} (${admin.affiliationCode}): ${count}명`);

          for (let i = 0; i < count; i++) {
            if (userIndex < users.length) {
              assignments.push({
                userId: users[userIndex].id,
                adminId: admin.id,
                adminCode: admin.affiliationCode!,
              });
              userIndex++;
            }
          }
        }
      }

      // 배정 실행
      console.log(`\n✍️  배정 적용 중...`);

      for (const assignment of assignments) {
        await prisma.user.update({
          where: { id: assignment.userId },
          data: {
            managerId: assignment.adminId,
            affiliateCode: assignment.adminCode,
          },
        });
      }

      console.log(`✅ ${region} 지역 완료: ${assignments.length}명 재배정`);
    }

    // 최종 결과 확인
    console.log(`\n\n${'='.repeat(60)}`);
    console.log('📊 최종 결과');
    console.log('='.repeat(60));

    const finalStats = await prisma.admin.findMany({
      where: {
        deletedAt: null,
        isActive: true,
        tier: {
          not: 'INTEGRATED',
        },
      },
      select: {
        realName: true,
        affiliationCode: true,
        region: true,
        tier: true,
        _count: {
          select: {
            managedUsers: true,
          },
        },
      },
      orderBy: [{ region: 'asc' }, { tier: 'asc' }],
    });

    let currentRegion = '';
    finalStats.forEach((admin) => {
      if (admin.region !== currentRegion) {
        console.log(`\n=== ${admin.region || '본사'} ===`);
        currentRegion = admin.region || '';
      }
      console.log(
        `  ${admin.realName.padEnd(20)} (${admin.affiliationCode}) [${admin.tier.padEnd(7)}]: ${admin._count.managedUsers}명`
      );
    });

    console.log('\n✅ 재배정 완료!\n');
  } catch (error) {
    console.error('\n❌ 재배정 실패:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// 스크립트 실행
redistributeUsers()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
