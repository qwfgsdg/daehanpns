import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * UUID가 소속 코드로 저장된 회원들을 수정
 */
async function fixUuidCodes() {
  console.log('🔧 UUID 소속 코드 수정 시작...\n');

  try {
    // UUID가 소속 코드인 회원 찾기 (하이픈이 포함된 경우)
    const uuidUsers = await prisma.user.findMany({
      where: {
        affiliateCode: {
          contains: '-',
        },
        deletedAt: null,
      },
      include: {
        manager: {
          select: {
            realName: true,
            affiliationCode: true,
          },
        },
      },
    });

    console.log(`발견: ${uuidUsers.length}명\n`);

    if (uuidUsers.length === 0) {
      console.log('✅ UUID 소속 코드를 가진 회원이 없습니다.');
      return;
    }

    // 각 회원 수정
    for (const user of uuidUsers) {
      if (!user.manager) {
        console.log(`❌ ${user.name}: 담당자가 없어 건너뜁니다.`);
        continue;
      }

      if (!user.manager.affiliationCode) {
        console.log(`❌ ${user.name}: 담당자(${user.manager.realName})의 소속 코드가 없어 건너뜁니다.`);
        continue;
      }

      console.log(`🔄 ${user.name}:`);
      console.log(`   현재 소속코드: ${user.affiliateCode}`);
      console.log(`   담당자: ${user.manager.realName} (${user.manager.affiliationCode})`);
      console.log(`   → 변경: ${user.manager.affiliationCode}`);

      await prisma.user.update({
        where: { id: user.id },
        data: {
          affiliateCode: user.manager.affiliationCode,
        },
      });

      console.log(`   ✅ 완료\n`);
    }

    console.log(`✅ ${uuidUsers.length}명 수정 완료!\n`);
  } catch (error) {
    console.error('\n❌ 수정 실패:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// 스크립트 실행
fixUuidCodes()
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
