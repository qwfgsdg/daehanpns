const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function randomizeMemberTypes() {
  // 최신 20명의 회원 가져오기 (회원 목록 페이지 상단)
  const users = await prisma.user.findMany({
    take: 20,
    orderBy: { createdAt: 'desc' },
    select: { id: true, name: true }
  });

  console.log(`총 ${users.length}명의 회원 유형을 랜덤으로 변경합니다...`);

  const memberTypes = ['STOCK', 'COIN', 'HYBRID'];

  for (const user of users) {
    // 랜덤하게 회원 유형 선택 (STOCK 40%, COIN 30%, HYBRID 30%)
    const rand = Math.random();
    let memberType;
    if (rand < 0.4) {
      memberType = 'STOCK';
    } else if (rand < 0.7) {
      memberType = 'COIN';
    } else {
      memberType = 'HYBRID';
    }

    // showCoinRooms는 STOCK이거나 HYBRID일 때만 랜덤하게 설정
    const showCoinRooms = (memberType === 'STOCK' || memberType === 'HYBRID')
      ? Math.random() > 0.5
      : false;

    await prisma.user.update({
      where: { id: user.id },
      data: { memberType, showCoinRooms }
    });

    console.log(`✓ ${user.name}: ${memberType}${showCoinRooms ? ' (코인방 표시)' : ''}`);
  }

  console.log('\n완료! 회원 유형이 랜덤하게 배치되었습니다.');

  // 결과 확인
  const stats = await prisma.user.groupBy({
    by: ['memberType'],
    _count: true
  });

  console.log('\n전체 회원 유형 통계:');
  stats.forEach(stat => {
    console.log(`  ${stat.memberType}: ${stat._count}명`);
  });

  await prisma.$disconnect();
}

randomizeMemberTypes().catch(console.error);
