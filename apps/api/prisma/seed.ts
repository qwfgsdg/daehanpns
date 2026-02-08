import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // 비밀번호 해시 생성
  const hashedPassword = await bcrypt.hash('dhadmin1234', 10);

  // 기존 데이터 삭제
  await prisma.adminPermission.deleteMany({});
  await prisma.admin.deleteMany({});
  await prisma.user.deleteMany({});

  // ============================================
  // 1. 통합관리자
  // ============================================
  const integrated = await prisma.admin.create({
    data: {
      loginId: 'dhadmin',
      password: hashedPassword,
      name: '통합관리자',
      email: 'admin@daehanpns.net',
      phone: '010-0000-0001',
      tier: 'INTEGRATED',
      isActive: true,
      region: '본사',
      permissions: {
        create: [
          { permission: 'members.view' },
          { permission: 'members.update' },
          { permission: 'members.ban' },
          { permission: 'members.memo' },
          { permission: 'members.unmask_phone' },
          { permission: 'members.excel' },
          { permission: 'members.temp_account' },
          { permission: 'admins.manage' },
          { permission: 'admins.logo' },
          { permission: 'unlock.all' },
          { permission: 'subscriptions.manage' },
          { permission: 'chats.manage' },
          { permission: 'banners.manage' },
          { permission: 'support.manage' },
          { permission: 'logs.view' },
          { permission: 'app_versions.manage' },
        ],
      },
    },
  });
  console.log('✅ 통합관리자 생성:', integrated.loginId);

  // ============================================
  // 2. 미라클 지점 (MRC001)
  // ============================================
  console.log('\n📍 미라클 지점 생성 중...');

  // 지점장 (대표관리자)
  const miracleCeo = await prisma.admin.create({
    data: {
      loginId: 'miracle_ceo',
      password: hashedPassword,
      name: '정현수',
      email: 'miracle@daehanpns.net',
      phone: '010-1000-0001',
      tier: 'CEO',
      isActive: true,
      affiliationCode: 'MRC001',
      region: '미라클',
      createdBy: integrated.id,
      permissions: {
        create: [
          { permission: 'members.view' },
          { permission: 'members.memo' },
          { permission: 'members.ban' },
          { permission: 'members.temp_account' },
          { permission: 'members.unmask_phone' },
          { permission: 'admins.manage' },
          { permission: 'subscriptions.manage' },
          { permission: 'chats.manage' },
          { permission: 'banners.manage' },
          { permission: 'support.manage' },
        ],
      },
    },
  });
  console.log('  ✅ 지점장:', miracleCeo.name);

  // 팀장 (중간관리자)
  const miracleMiddle = await prisma.admin.create({
    data: {
      loginId: 'miracle_team',
      password: hashedPassword,
      name: '진선애',
      email: 'miracle.team@daehanpns.net',
      phone: '010-1000-0002',
      tier: 'MIDDLE',
      isActive: true,
      region: '미라클',
      parentAdminId: miracleCeo.id,
      createdBy: miracleCeo.id,
      permissions: {
        create: [
          { permission: 'members.view' },
          { permission: 'members.memo' },
          { permission: 'members.temp_account' },
          { permission: 'chats.manage' },
          { permission: 'support.manage' },
        ],
      },
    },
  });
  console.log('  ✅ 팀장:', miracleMiddle.name);

  // 팀원들 (일반관리자)
  const miracleTeamMemberCount = 10;

  for (let i = 0; i < miracleTeamMemberCount; i++) {
    const member = await prisma.admin.create({
      data: {
        loginId: `miracle_member${i + 1}`,
        password: hashedPassword,
        name: `miracle_member${i + 1}`,
        email: `miracle.member${i + 1}@daehanpns.net`,
        phone: `010-1000-${String(i + 3).padStart(4, '0')}`,
        tier: 'GENERAL',
        isActive: true,
        region: '미라클',
        parentAdminId: miracleMiddle.id,
        createdBy: miracleMiddle.id,
        permissions: {
          create: [
            { permission: 'members.view' },
            { permission: 'chats.manage' },
            { permission: 'support.manage' },
          ],
        },
      },
    });
    console.log(`  ✅ 팀원: ${member.name}`);

    // 각 팀원당 회원 3명 생성
    for (let j = 0; j < 3; j++) {
      const userNum = i * 3 + j + 1;
      await prisma.user.create({
        data: {
          phone: `010-1100-${String(userNum).padStart(4, '0')}`,
          password: hashedPassword,
          name: `미라클회원${userNum}`,
          nickname: `미라클${userNum}`,
          affiliateCode: 'MRC001',
          isActive: true,
          provider: 'LOCAL',
        },
      });
    }
  }
  console.log(`  ✅ 회원 ${miracleTeamMemberCount * 3}명 생성`);

  // ============================================
  // 3. 피닉스 지점 (PHX001)
  // ============================================
  console.log('\n📍 피닉스 지점 생성 중...');

  // 지점장 (대표관리자)
  const phoenixCeo = await prisma.admin.create({
    data: {
      loginId: 'phoenix_ceo',
      password: hashedPassword,
      name: '방지훈',
      email: 'phoenix@daehanpns.net',
      phone: '010-2000-0001',
      tier: 'CEO',
      isActive: true,
      affiliationCode: 'PHX001',
      region: '피닉스',
      createdBy: integrated.id,
      permissions: {
        create: [
          { permission: 'members.view' },
          { permission: 'members.memo' },
          { permission: 'members.ban' },
          { permission: 'members.temp_account' },
          { permission: 'members.unmask_phone' },
          { permission: 'admins.manage' },
          { permission: 'subscriptions.manage' },
          { permission: 'chats.manage' },
          { permission: 'banners.manage' },
          { permission: 'support.manage' },
        ],
      },
    },
  });
  console.log('  ✅ 지점장:', phoenixCeo.name);

  // 팀장 (중간관리자)
  const phoenixMiddle = await prisma.admin.create({
    data: {
      loginId: 'phoenix_team',
      password: hashedPassword,
      name: '이용훈',
      email: 'phoenix.team@daehanpns.net',
      phone: '010-2000-0002',
      tier: 'MIDDLE',
      isActive: true,
      region: '피닉스',
      parentAdminId: phoenixCeo.id,
      createdBy: phoenixCeo.id,
      permissions: {
        create: [
          { permission: 'members.view' },
          { permission: 'members.memo' },
          { permission: 'members.temp_account' },
          { permission: 'chats.manage' },
          { permission: 'support.manage' },
        ],
      },
    },
  });
  console.log('  ✅ 팀장:', phoenixMiddle.name);

  // 팀원들 (일반관리자)
  const phoenixTeamMemberCount = 7;

  for (let i = 0; i < phoenixTeamMemberCount; i++) {
    const member = await prisma.admin.create({
      data: {
        loginId: `phoenix_member${i + 1}`,
        password: hashedPassword,
        name: `phoenix_member${i + 1}`,
        email: `phoenix.member${i + 1}@daehanpns.net`,
        phone: `010-2000-${String(i + 3).padStart(4, '0')}`,
        tier: 'GENERAL',
        isActive: true,
        region: '피닉스',
        parentAdminId: phoenixMiddle.id,
        createdBy: phoenixMiddle.id,
        permissions: {
          create: [
            { permission: 'members.view' },
            { permission: 'chats.manage' },
            { permission: 'support.manage' },
          ],
        },
      },
    });
    console.log(`  ✅ 팀원: ${member.name}`);

    // 각 팀원당 회원 3명 생성
    for (let j = 0; j < 3; j++) {
      const userNum = i * 3 + j + 1;
      await prisma.user.create({
        data: {
          phone: `010-2100-${String(userNum).padStart(4, '0')}`,
          password: hashedPassword,
          name: `피닉스회원${userNum}`,
          nickname: `피닉스${userNum}`,
          affiliateCode: 'PHX001',
          isActive: true,
          provider: 'LOCAL',
        },
      });
    }
  }
  console.log(`  ✅ 회원 ${phoenixTeamMemberCount * 3}명 생성`);

  // ============================================
  // 4. 가산 지점 (GSN001)
  // ============================================
  console.log('\n📍 가산 지점 생성 중...');

  // 지점장 (대표관리자)
  const gasanCeo = await prisma.admin.create({
    data: {
      loginId: 'gasan_ceo',
      password: hashedPassword,
      name: '오창록',
      email: 'gasan@daehanpns.net',
      phone: '010-3000-0001',
      tier: 'CEO',
      isActive: true,
      affiliationCode: 'GSN001',
      region: '가산',
      createdBy: integrated.id,
      permissions: {
        create: [
          { permission: 'members.view' },
          { permission: 'members.memo' },
          { permission: 'members.ban' },
          { permission: 'members.temp_account' },
          { permission: 'members.unmask_phone' },
          { permission: 'admins.manage' },
          { permission: 'subscriptions.manage' },
          { permission: 'chats.manage' },
          { permission: 'banners.manage' },
          { permission: 'support.manage' },
        ],
      },
    },
  });
  console.log('  ✅ 지점장:', gasanCeo.name);

  // 팀장 (중간관리자)
  const gasanMiddle = await prisma.admin.create({
    data: {
      loginId: 'gasan_team',
      password: hashedPassword,
      name: '이다운',
      email: 'gasan.team@daehanpns.net',
      phone: '010-3000-0002',
      tier: 'MIDDLE',
      isActive: true,
      region: '가산',
      parentAdminId: gasanCeo.id,
      createdBy: gasanCeo.id,
      permissions: {
        create: [
          { permission: 'members.view' },
          { permission: 'members.memo' },
          { permission: 'members.temp_account' },
          { permission: 'chats.manage' },
          { permission: 'support.manage' },
        ],
      },
    },
  });
  console.log('  ✅ 팀장:', gasanMiddle.name);

  // 팀원들 (일반관리자)
  const gasanTeamMemberCount = 3;

  for (let i = 0; i < gasanTeamMemberCount; i++) {
    const member = await prisma.admin.create({
      data: {
        loginId: `gasan_member${i + 1}`,
        password: hashedPassword,
        name: `gasan_member${i + 1}`,
        email: `gasan.member${i + 1}@daehanpns.net`,
        phone: `010-3000-${String(i + 3).padStart(4, '0')}`,
        tier: 'GENERAL',
        isActive: true,
        region: '가산',
        parentAdminId: gasanMiddle.id,
        createdBy: gasanMiddle.id,
        permissions: {
          create: [
            { permission: 'members.view' },
            { permission: 'chats.manage' },
            { permission: 'support.manage' },
          ],
        },
      },
    });
    console.log(`  ✅ 팀원: ${member.name}`);

    // 각 팀원당 회원 3명 생성
    for (let j = 0; j < 3; j++) {
      const userNum = i * 3 + j + 1;
      await prisma.user.create({
        data: {
          phone: `010-3100-${String(userNum).padStart(4, '0')}`,
          password: hashedPassword,
          name: `가산회원${userNum}`,
          nickname: `가산${userNum}`,
          affiliateCode: 'GSN001',
          isActive: true,
          provider: 'LOCAL',
        },
      });
    }
  }
  console.log(`  ✅ 회원 ${gasanTeamMemberCount * 3}명 생성`);

  // ============================================
  // 완료
  // ============================================
  console.log('\n🎉 Seed 완료!');
  console.log('\n📝 관리자 계정:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('통합관리자:');
  console.log('  ID: dhadmin | 비밀번호: dhadmin1234');
  console.log('\n미라클 지점 (MRC001):');
  console.log('  지점장: miracle_ceo | 정현수');
  console.log('  팀장: miracle_team | 진선애');
  console.log('  팀원: miracle_member1~10');
  console.log('\n피닉스 지점 (PHX001):');
  console.log('  지점장: phoenix_ceo | 방지훈');
  console.log('  팀장: phoenix_team | 이용훈');
  console.log('  팀원: phoenix_member1~7');
  console.log('\n가산 지점 (GSN001):');
  console.log('  지점장: gasan_ceo | 오창록');
  console.log('  팀장: gasan_team | 이다운');
  console.log('  팀원: gasan_member1~3');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('\n📊 데이터 통계:');
  console.log(`  관리자: ${1 + 3 + 3 + 20}명 (통합 1 + 지점장 3 + 팀장 3 + 팀원 20)`);
  console.log(`  회원: ${30 + 21 + 9}명 (미라클 30 + 피닉스 21 + 가산 9)`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

main()
  .catch((e) => {
    console.error('❌ Seed 실패:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
