import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyMigration() {
  console.log('🔍 마이그레이션 검증 시작...\n');

  // 1. managerId가 null인 회원 수 확인
  const usersWithoutManager = await prisma.user.count({
    where: {
      managerId: null,
      deletedAt: null,
    },
  });

  console.log(`❌ managerId가 null인 회원: ${usersWithoutManager}명`);

  // 2. managerId가 있는 회원 수 확인
  const usersWithManager = await prisma.user.count({
    where: {
      managerId: { not: null },
      deletedAt: null,
    },
  });

  console.log(`✅ managerId가 있는 회원: ${usersWithManager}명\n`);

  // 3. 관리자별 담당 회원 수 조회
  const admins = await prisma.admin.findMany({
    where: {
      deletedAt: null,
      isActive: true,
    },
    select: {
      realName: true,
      salesName: true,
      affiliationCode: true,
      region: true,
      _count: {
        select: {
          managedUsers: true,
        },
      },
    },
    orderBy: {
      region: 'asc',
    },
  });

  console.log('📊 관리자별 담당 회원 수:\n');
  let totalManaged = 0;

  admins.forEach((admin) => {
    if (admin._count.managedUsers > 0) {
      console.log(
        `  ${admin.realName} (${admin.salesName}) - ${admin.region || '본사'} - 소속코드: ${admin.affiliationCode} → ${admin._count.managedUsers}명`
      );
      totalManaged += admin._count.managedUsers;
    }
  });

  console.log(`\n  총 관리되는 회원: ${totalManaged}명`);

  // 4. 특정 관리자들 상세 확인
  console.log('\n\n🔍 주요 관리자 상세:\n');

  const keyAdmins = [
    { name: '정현수', code: 'MRC001' },
    { name: '오창록', code: 'GSN001' },
    { name: '방지훈', code: 'PHX001' },
  ];

  for (const { name, code } of keyAdmins) {
    const admin = await prisma.admin.findFirst({
      where: { affiliationCode: code },
      include: {
        managedUsers: {
          select: {
            name: true,
            phone: true,
          },
          take: 5,
        },
        _count: {
          select: {
            managedUsers: true,
          },
        },
      },
    });

    if (admin) {
      console.log(`${admin.realName} (${code}): ${admin._count.managedUsers}명`);
      if (admin.managedUsers.length > 0) {
        admin.managedUsers.forEach((user, i) => {
          console.log(`  ${i + 1}. ${user.name} (${user.phone})`);
        });
        if (admin._count.managedUsers > 5) {
          console.log(`  ... 외 ${admin._count.managedUsers - 5}명`);
        }
      }
      console.log('');
    }
  }

  await prisma.$disconnect();
}

verifyMigration().catch(console.error);
