import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  // 비밀번호 해싱
  const password = 'admin123';
  const hashedPassword = await bcrypt.hash(password, 10);

  // 기존 admin 계정 확인
  const existing = await prisma.admin.findUnique({
    where: { loginId: 'admin' },
  });

  if (existing) {
    console.log('✅ Admin 계정이 이미 존재합니다.');
    console.log('LoginId:', existing.loginId);
    console.log('Name:', existing.realName);
    console.log('Tier:', existing.tier);
    return;
  }

  // 관리자 계정 생성
  const admin = await prisma.admin.create({
    data: {
      loginId: 'admin',
      password: hashedPassword,
      realName: '통합관리자',
      salesName: '시스템',
      tier: 'INTEGRATED',
      isActive: true,
      affiliationCode: 'ADMIN001',
      referralCode: 'REF001',
    },
  });

  console.log('✅ 관리자 계정이 생성되었습니다!');
  console.log('LoginId:', admin.loginId);
  console.log('Password: admin123');
  console.log('Name:', admin.realName);
  console.log('Tier:', admin.tier);
}

main()
  .catch((e) => {
    console.error('❌ 에러:', e.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
