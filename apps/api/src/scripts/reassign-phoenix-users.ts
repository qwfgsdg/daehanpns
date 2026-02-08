import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * PHX012 소속코드를 가진 회원들을 피닉스 CEO에게 재배정
 */
async function reassignPhoenixUsers() {
  console.log('🔄 피닉스 회원 재배정 시작...\n');

  try {
    // 1. 피닉스 CEO 관리자 찾기 (PHX001)
    const phoenixCEO = await prisma.admin.findFirst({
      where: {
        affiliationCode: 'PHX001',
        isActive: true,
        deletedAt: null,
      },
    });

    if (!phoenixCEO) {
      throw new Error('피닉스 CEO (PHX001)를 찾을 수 없습니다.');
    }

    console.log(`✅ 재배정 대상 관리자: ${phoenixCEO.realName} (${phoenixCEO.salesName})`);
    console.log(`   소속코드: ${phoenixCEO.affiliationCode}\n`);

    // 2. PHX012 소속코드를 가진 회원들 조회
    const users = await prisma.user.findMany({
      where: {
        affiliateCode: 'PHX012',
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        phone: true,
        managerId: true,
      },
    });

    console.log(`📊 재배정 대상 회원 수: ${users.length}명\n`);

    if (users.length === 0) {
      console.log('✅ 재배정할 회원이 없습니다.');
      return;
    }

    // 3. managerId 업데이트
    let successCount = 0;
    let alreadyAssignedCount = 0;

    for (const user of users) {
      if (user.managerId === phoenixCEO.id) {
        alreadyAssignedCount++;
        console.log(`⏭️  ${user.name} (${user.phone}): 이미 배정됨`);
        continue;
      }

      await prisma.user.update({
        where: { id: user.id },
        data: { managerId: phoenixCEO.id },
      });

      successCount++;
      console.log(`✅ ${user.name} (${user.phone}) → ${phoenixCEO.realName}에게 재배정`);
    }

    // 4. 결과 리포트
    console.log('\n' + '='.repeat(60));
    console.log('📊 재배정 결과');
    console.log('='.repeat(60));
    console.log(`✅ 재배정 완료: ${successCount}명`);
    console.log(`⏭️  이미 배정됨: ${alreadyAssignedCount}명`);
    console.log(`📝 전체: ${users.length}명`);
    console.log('='.repeat(60));
    console.log('\n✅ 재배정 완료!\n');
  } catch (error) {
    console.error('\n❌ 재배정 실패:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// 스크립트 실행
reassignPhoenixUsers()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
