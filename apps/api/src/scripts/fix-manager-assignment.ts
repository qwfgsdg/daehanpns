import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * 기존 회원들의 managerId를 affiliateCode 기반으로 자동 배정하는 마이그레이션 스크립트
 */
async function fixManagerAssignment() {
  console.log('🔄 회원 담당자 배정 마이그레이션 시작...\n');

  try {
    // 1. managerId가 null인 회원들 조회 (affiliateCode 필터는 코드에서 처리)
    const allUsers = await prisma.user.findMany({
      where: {
        managerId: null,
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        phone: true,
        affiliateCode: true,
      },
    });

    // affiliateCode가 있는 회원만 필터링
    const usersWithoutManager = allUsers.filter(
      (user) => user.affiliateCode && user.affiliateCode.trim() !== ''
    );

    console.log(`📊 대상 회원 수: ${usersWithoutManager.length}명 (전체 managerId null: ${allUsers.length}명)\n`);

    if (usersWithoutManager.length === 0) {
      console.log('✅ 모든 회원에게 담당자가 배정되어 있습니다.');
      return;
    }

    let successCount = 0;
    let failCount = 0;
    const failedUsers: Array<{ name: string; affiliateCode: string; reason: string }> = [];

    // 2. 각 회원의 affiliateCode로 관리자 찾아서 배정
    for (const user of usersWithoutManager) {
      try {
        // affiliationCode 또는 referralCode로 관리자 찾기 (두 필드가 통합되어 같은 값)
        const manager = await prisma.admin.findFirst({
          where: {
            OR: [
              { affiliationCode: user.affiliateCode },
              { referralCode: user.affiliateCode },
            ],
            isActive: true,
            deletedAt: null,
          },
        });

        if (!manager) {
          failCount++;
          failedUsers.push({
            name: user.name,
            affiliateCode: user.affiliateCode,
            reason: '관리자를 찾을 수 없음',
          });
          console.log(`❌ ${user.name} (${user.phone}): 소속코드 "${user.affiliateCode}"로 관리자를 찾을 수 없습니다.`);
          continue;
        }

        // managerId 업데이트
        await prisma.user.update({
          where: { id: user.id },
          data: { managerId: manager.id },
        });

        successCount++;
        console.log(`✅ ${user.name} (${user.phone}) → 담당자: ${manager.realName} (${manager.salesName})`);
      } catch (error) {
        failCount++;
        failedUsers.push({
          name: user.name,
          affiliateCode: user.affiliateCode,
          reason: error instanceof Error ? error.message : '알 수 없는 오류',
        });
        console.error(`❌ ${user.name} 처리 중 오류:`, error);
      }
    }

    // 3. 결과 리포트
    console.log('\n' + '='.repeat(60));
    console.log('📊 마이그레이션 결과');
    console.log('='.repeat(60));
    console.log(`✅ 성공: ${successCount}명`);
    console.log(`❌ 실패: ${failCount}명`);
    console.log(`📝 전체: ${usersWithoutManager.length}명`);

    if (failedUsers.length > 0) {
      console.log('\n⚠️  실패한 회원 목록:');
      failedUsers.forEach((user, index) => {
        console.log(`  ${index + 1}. ${user.name} - 소속코드: ${user.affiliateCode} - 사유: ${user.reason}`);
      });
    }

    console.log('='.repeat(60));
    console.log('\n✅ 마이그레이션 완료!\n');
  } catch (error) {
    console.error('\n❌ 마이그레이션 실패:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// 스크립트 실행
fixManagerAssignment()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
